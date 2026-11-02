/* Generated from game/ui/sfx-manager.js. Edit the source. */
(function (root) {
  "use strict";
  const data =
    typeof module !== "undefined"
      ? require("../dist/sfx-data.js")
      : root.ArcSFXData;
  const contactTypes = new Set([
    "impact",
    "critical",
    "weak",
    "part",
    "airburst",
  ]);
  const same = (a, b) => a.bullet === b.bullet && Math.abs(a.t - b.t) < 0.001;
  const db = (value) => 10 ** (value / 20);

  // Read the immutable physical plan. This cursor never touches appliedEvents.
  function timeline(shot) {
    if (shot.teleport || shot.weaponId === "TELEPORT")
      return { cues: [], rolls: [] };
    const events = shot.events || [],
      bullets = shot.bullets || [];
    const special = data.specials[shot.weaponId],
      weapon = data.weapons[shot.weaponId] || data.weapons.W01;
    const cues = [],
      rolls = [];
    const add = (id, event, kind, priority, gainDb = 0, delay = 0) => {
      cues.push({
        id,
        t: event.t || 0,
        bullet: event.bullet,
        x: event.x,
        y: event.y,
        kind,
        priority,
        gainDb,
        delay,
      });
    };
    const powerFire =
      shot.power <= data.mix.lightMaxPower
        ? "F01_LIGHT"
        : shot.power >= data.mix.strongMinPower
          ? "F01_STRONG"
          : "F01";
    let fireIndex = 0;
    for (const bullet of bullets) {
      if (
        bullet.effect ||
        (!bullet.primary &&
          events.some(
            (e) => e.type === "split" && Math.abs(e.t - bullet.start) < 0.001,
          ))
      )
        continue;
      let id = special
        ? special.fire[Math.min(fireIndex++, special.fire.length - 1)]
        : shot.side
          ? data.enemyAttackFire[shot.attackKind] || weapon.enemyFire
          : weapon.fire;
      if (id === "power") id = powerFire;
      add(id, { t: bullet.start, bullet: bullet.id }, "fire", special ? 5 : 2);
    }
    for (const event of events) {
      if (event.type === "bounce" || event.type === "skip")
        add(
          shot.weaponId === "S_RICO"
            ? "R" + Math.min(4, Math.max(1, event.count || 1))
            : "R1",
          event,
          "bounce",
          2,
        );
      if (event.type === "break") add("D01", event, "debris", 1, -3, 0.015);
      if (event.type === "shockwave" && shot.weaponId === "S_BAN")
        add("S01", event, "special", 6);
      if (event.type === "split") add("S02", event, "special", 6);
      if (event.type === "pull" && shot.weaponId === "S_YUI")
        add("S04", event, "special", 6);
      if (event.type === "compression" && shot.weaponId === "S_YUI")
        add("S05", event, "special", 6);
      if (event.type === "roll-fall" && shot.weaponId === "S_KORO")
        add("S03_FALL", event, "special", 4);
      if (event.type === "roll" && shot.weaponId === "S_KORO") {
        const end = events.find(
          (e) =>
            e.bullet === event.bullet &&
            e.t >= event.t &&
            (e.type === "roll-fall" ||
              e.type === "expired" ||
              contactTypes.has(e.type)),
        );
        rolls.push({
          start: event.t,
          end: end?.t ?? shot.duration,
          bullet: event.bullet,
        });
      }
    }
    for (const impact of shot.impacts || []) {
      const local = events.filter((event) => same(event, impact));
      if (
        local.some(
          (e) =>
            e.type === "compression" ||
            (e.type === "shockwave" && shot.weaponId === "S_BAN"),
        )
      )
        continue;
      let id = special?.impact || weapon.impact,
        gainDb = special?.impactDb || 0;
      if (
        shot.weaponId === "S_RICO" &&
        events.filter(
          (e) =>
            e.type === "bounce" &&
            e.bullet === impact.bullet &&
            e.t <= impact.t,
        ).length < 4
      )
        id = "I01";
      if (
        shot.weaponId === "S_RIN" &&
        local.some((e) => e.type === "critical")
      ) {
        gainDb -= 3;
        add("S06", impact, "accent", 6);
      }
      add(id, impact, "impact", id === "I01" ? 3 : 4, gainDb);
    }
    // Near-simultaneous fragments/contacts share one main sound. Hana's three
    // starts remain distinct; fan/twin starts still follow their physical plan.
    cues.sort((a, b) => a.t - b.t || b.priority - a.priority);
    const unique = [];
    for (const cue of cues) {
      const window =
        cue.kind === "fire" ? data.mix.fireCoalesce : data.mix.impactCoalesce;
      if (
        unique.some(
          (a) =>
            a.id === cue.id &&
            a.kind === cue.kind &&
            Math.abs(a.t - cue.t) < window &&
            (cue.kind === "fire" ||
              cue.kind === "debris" ||
              Math.hypot((a.x || 0) - (cue.x || 0), (a.y || 0) - (cue.y || 0)) <
                24),
        )
      )
        continue;
      unique.push({ ...cue, eventId: unique.length });
    }
    return { cues: unique, rolls };
  }

  function create(options = {}) {
    let context = null,
      bus = null,
      limiter = null,
      active = null,
      token = null,
      serial = 0,
      blocked = true,
      loop = null;
    const cache = new Map(),
      pending = new Map(),
      failed = new Set(),
      voices = new Set();
    const getContext = options.context || (() => null),
      fetcher = options.fetch || ((...args) => root.fetch(...args));
    const now = options.now || (() => performance.now() / 1000);
    function graph() {
      const ctx = getContext();
      if (!ctx || ctx.state === "closed") return null;
      if (context !== ctx) {
        stop();
        cache.clear();
        pending.clear();
        context = ctx;
        bus = ctx.createGain();
        bus.gain.value = data.mix.busGain;
        bus.connect(ctx.destination);
        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.12;
        limiter.connect(bus);
      }
      return ctx;
    }
    async function load(id) {
      if (failed.has(id) || !data.assets[id]) return null;
      if (cache.has(id)) {
        const buffer = cache.get(id);
        cache.delete(id);
        cache.set(id, buffer);
        return buffer;
      }
      if (pending.has(id)) return pending.get(id);
      const ctx = graph();
      if (!ctx) return null;
      const promise = (async () => {
        try {
          const response = await fetcher(
            (root.ArcAssetBase || "../../") + data.assets[id].src,
          );
          if (!response.ok) throw Error("HTTP " + response.status);
          const buffer = await ctx.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (context !== ctx) return null;
          cache.set(id, buffer);
          while (cache.size > 24) cache.delete(cache.keys().next().value);
          return buffer;
        } catch (error) {
          if (!failed.has(id)) {
            failed.add(id);
            (options.warn || console.warn)(
              "ARCLINE SFX unavailable: " + id,
              error.message,
            );
          }
          return null;
        } finally {
          pending.delete(id);
        }
      })();
      pending.set(id, promise);
      return promise;
    }
    function release(voice) {
      voices.delete(voice);
      try {
        voice.source.stop();
      } catch {}
      voice.source.disconnect();
      voice.gain.disconnect();
      if (voice === loop) loop = null;
    }
    function silence() {
      for (const voice of [...voices]) release(voice);
    }
    function stop() {
      silence();
      active = null;
      serial++;
    }
    function emit(cue, buffer, offset = 0, looping = false) {
      const ctx = graph();
      if (!ctx || blocked || !buffer) return null;
      const impacts = [...voices].filter((v) => v.kind === "impact");
      if (cue.kind === "impact" && impacts.length >= data.mix.maxImpacts)
        return null;
      if (voices.size >= data.mix.maxVoices) {
        const lowest = [...voices].sort((a, b) => a.priority - b.priority)[0];
        if (lowest.priority > cue.priority) return null;
        release(lowest);
      }
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = looping;
      gain.gain.value =
        db((data.assets[cue.id].gainDb || 0) + (cue.gainDb || 0)) *
        (cue.kind === "impact" && impacts.length ? 0.65 : 1);
      source.connect(gain).connect(limiter);
      const voice = {
        source,
        gain,
        kind: cue.kind,
        priority: cue.priority,
        id: cue.id,
      };
      voices.add(voice);
      source.onended = () => {
        if (voices.has(voice)) release(voice);
      };
      try {
        source.start(
          ctx.currentTime + (cue.delay || 0),
          offset % buffer.duration,
        );
      } catch {
        release(voice);
        return null;
      }
      options.played?.({ ...cue, offset, looping });
      return voice;
    }
    function request(cue, session) {
      if (blocked || session !== active) return;
      const start = now(),
        generation = serial;
      if (cache.has(cue.id)) emit(cue, cache.get(cue.id));
      else
        load(cue.id).then((buffer) => {
          if (
            generation === serial &&
            session === active &&
            !blocked &&
            now() - start <= data.mix.lateWindow &&
            active.age - cue.t <= data.mix.lateWindow
          )
            emit(cue, buffer);
        });
    }
    function rolling() {
      const span =
        !blocked &&
        active?.rolls.find((r) => active.age >= r.start && active.age < r.end);
      if (!span) {
        if (loop) release(loop);
        return;
      }
      if (loop?.span === span) return;
      if (loop) release(loop);
      const session = active;
      const start = (buffer) => {
        if (
          session !== active ||
          blocked ||
          active.age < span.start ||
          active.age >= span.end ||
          loop
        )
          return;
        const voice = emit(
          { id: "S03_ROLL", kind: "roll", priority: 1 },
          buffer,
          active.age - span.start,
          true,
        );
        if (voice) {
          voice.span = span;
          loop = voice;
        }
      };
      if (cache.has("S03_ROLL")) start(cache.get("S03_ROLL"));
      else load("S03_ROLL").then(start);
    }
    function sync(state) {
      if (state.token !== token) {
        stop();
        token = state.token;
      }
      const next = !!(state.paused || state.muted);
      if (next && !blocked) {
        silence();
        serial++;
      }
      blocked = next;
      if (bus) bus.gain.value = blocked ? 0 : data.mix.busGain;
      rolling();
    }
    function update(age) {
      if (!active) return;
      const session = active;
      active.age = age;
      while (
        active === session &&
        active.cursor < active.cues.length &&
        active.cues[active.cursor].t <= age + 1e-6
      ) {
        const cue = active.cues[active.cursor++];
        if (age - cue.t <= data.mix.lateWindow) request(cue, active);
      }
      rolling();
    }
    function begin(shot) {
      stop();
      graph();
      active = { ...timeline(shot), cursor: 0, age: 0, serial: ++serial };
      update(0);
    }
    function finish() {
      if (loop) release(loop);
      active = null;
      serial++;
    }
    function prepare(characterId) {
      const special = data.specials["S_" + String(characterId).toUpperCase()];
      const ids = new Set([
        "F01",
        "F01_LIGHT",
        "F01_STRONG",
        "F02",
        "F03",
        "F04",
        "I01",
        "I02",
        "I03",
        "I04",
        "I05",
        "R1",
        "D01",
        ...(special?.fire || []),
        ...(special ? [special.impact] : []),
      ]);
      const extra = {
        ban: ["S01"],
        sora: ["S02"],
        koro: ["S03_ROLL", "S03_FALL"],
        yui: ["S04", "S05"],
        rin: ["S06"],
        rico: ["R2", "R3", "R4"],
      };
      for (const id of extra[characterId] || []) ids.add(id);
      return Promise.all([...ids].map(load));
    }
    return {
      prepare,
      begin,
      update,
      finish,
      sync,
      stop,
      load,
      state: () => ({
        blocked,
        voices: voices.size,
        rolling: !!loop,
        cursor: active?.cursor || 0,
        cached: [...cache.keys()],
        failed: [...failed],
        serial,
      }),
    };
  }
  const api = { create, timeline };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcSFX = api;
})(globalThis);
