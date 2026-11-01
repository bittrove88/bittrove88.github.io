/* Generated from game/ui/audio-manager.js. Edit the source. */
(function (root) {
  "use strict";
  // Streaming media stays independent of the Web Audio SFX graph.
  function create(options = {}) {
    const tracks = options.tracks || root.ArcMediaData.tracks;
    const now = options.now || (() => performance.now() / 1000);
    const make = options.mediaFactory || (() => new Audio());
    const resolve =
      options.resolve ||
      ((t) => {
        const url = new URL(
          t.src,
          new URL(root.ArcAssetBase || "../../", document.baseURI),
        );
        url.searchParams.set("v", t.sha256.slice(0, 12));
        return url.href;
      });
    const positions = new Map();
    let active = null,
      generation = 0,
      unlocked = false,
      paused = false,
      muted = false;
    function own(a) {
      return a === active && a.token === generation;
    }
    function fallback(a, error) {
      if (!own(a) || a.fallback) return;
      a.fallback = true;
      a.duration = tracks[a.id].duration;
      a.error = String(error);
      a.blocked = true;
      a.media.pause();
      a.tick = now();
    }
    function sample() {
      const a = active;
      if (!a) return null;
      const t = now(),
        delta = Math.max(0, t - a.tick);
      a.tick = t;
      if (!paused) {
        if (a.id === "ENDING") {
          if (a.fallback || a.ended) a.position += delta;
          else {
            const position = Number(a.media.currentTime) || 0;
            if (position > a.position + 0.001) a.lastMovement = t;
            a.position = Math.max(a.position, position);
            if (t - a.lastMovement > 8)
              fallback(a, "media stalled for 8 seconds");
          }
          if (a.position >= a.duration) {
            a.ended = true;
            // Also finish on a missing native ended event; keep the following silence.
            a.media.pause();
          }
        } else a.position = Number(a.media.currentTime) || 0;
      }
      positions.set(a.id, Math.min(a.position, a.duration));
      return a;
    }
    function play(a) {
      if (
        !own(a) ||
        paused ||
        (!unlocked && !(a.id === "ENDING" && muted)) ||
        a.fallback ||
        a.ended ||
        a.playing ||
        a.pending
      )
        return;
      a.pending = true;
      const attempt = (a.attempt = (a.attempt || 0) + 1);
      try {
        Promise.resolve(a.media.play()).then(
          () => {
            if (!own(a) || paused || a.fallback || a.ended) {
              a.media.pause();
              return;
            }
            if (attempt !== a.attempt) return;
            a.pending = false;
            a.playing = !a.media.paused;
            if (!a.playing) play(a);
          },
          (error) => {
            if (!own(a) || attempt !== a.attempt) return;
            a.pending = false;
            if (paused) return;
            a.blocked = true;
            a.error = String(error);
            if (a.id === "ENDING") fallback(a, error);
          },
        );
      } catch (error) {
        a.pending = false;
        if (a.id === "ENDING") fallback(a, error);
        else a.error = String(error);
      }
    }
    function request(id, settings = {}) {
      if (!tracks[id]) throw Error("Unknown BGM: " + id);
      if (active?.id === id && !settings.restart) return state();
      sample();
      if (active) {
        active.media.pause();
        active.media.removeAttribute?.("src");
        active.media.load?.();
      }
      const track = tracks[id],
        media = make(),
        t = now();
      const a = (active = {
        id,
        token: ++generation,
        media,
        duration: track.duration,
        position: settings.restart ? 0 : positions.get(id) || 0,
        tick: t,
        lastMovement: t,
        ended: false,
        fallback: false,
        error: null,
        blocked: false,
        playing: false,
        pending: false,
      });
      media.preload = "auto";
      media.muted = muted;
      media.volume = 0.45;
      media.loop = id !== "ENDING" && !track.loopStart;
      const seek = () => {
        if (!own(a)) return;
        const duration = Number(media.duration);
        if (
          id === "ENDING" &&
          Number.isFinite(duration) &&
          Math.abs(duration - track.duration) > 3
        ) {
          fallback(a, "unexpected ending duration");
          return;
        }
        if (id === "ENDING" && Number.isFinite(duration) && duration > 0)
          a.duration = duration;
        try {
          media.currentTime = a.position;
        } catch {
          /* metadata may not be available yet */
        }
      };
      media.addEventListener("loadedmetadata", seek);
      media.addEventListener("canplay", () => {
        if (own(a)) play(a);
      });
      media.addEventListener("error", () => {
        if (!own(a)) return;
        a.error = "media error " + (media.error?.code || "unavailable");
        a.playing = false;
        if (id === "ENDING") fallback(a, a.error);
      });
      media.addEventListener("ended", () => {
        if (!own(a) || a.ended) return;
        if (id === "ENDING") {
          sample();
          if ((Number(media.currentTime) || 0) < a.duration - 1) {
            fallback(a, "premature ended event");
            return;
          }
          a.position = Math.max(a.position, a.duration);
          a.ended = true;
          a.tick = now();
        } else if (track.loopStart) {
          media.currentTime = track.loopStart;
          a.playing = false;
          play(a);
        }
      });
      media.src = resolve(track);
      seek();
      if (id === "ENDING" && !unlocked && !muted)
        fallback(a, "audio gesture unavailable");
      else play(a);
      return state();
    }
    function sync(settings) {
      sample();
      const wasPaused = paused;
      paused = !!settings.paused;
      muted = !!settings.muted;
      if (!active) return;
      active.tick = now();
      if (paused || wasPaused !== paused) active.lastMovement = now();
      active.media.muted = muted;
      if (paused) {
        active.attempt = (active.attempt || 0) + 1;
        active.pending = false;
        active.media.pause();
        active.playing = false;
      } else {
        if (
          wasPaused &&
          active.id === "ENDING" &&
          !active.fallback &&
          !active.ended &&
          active.media.currentTime < active.position - 0.25
        ) {
          try {
            active.media.currentTime = active.position;
          } catch {
            /* metadata may still be loading */
          }
        }
        play(active);
      }
    }
    function state() {
      const a = sample();
      return a
        ? {
            id: a.id,
            position: a.position,
            duration: a.duration,
            state: paused
              ? "paused"
              : a.fallback
                ? "fallback"
                : a.ended
                  ? "ended"
                  : a.playing
                    ? "playing"
                    : "loading",
            muted,
            blocked: a.blocked,
            ended: a.ended,
            error: a.error,
            generation: a.token,
          }
        : { id: null, position: 0, state: "idle", muted };
    }
    function snapshot() {
      const a = state();
      return { id: a.id, position: Math.min(a.position, a.duration || 0) };
    }
    function restore(saved) {
      if (!saved?.id) return;
      positions.set(saved.id, saved.position);
      request(saved.id, { restart: true });
      active.position = saved.position;
      try {
        active.media.currentTime = saved.position;
      } catch {
        /* seek on metadata */
      }
    }
    return {
      request,
      sync,
      state,
      snapshot,
      restore,
      unlock() {
        unlocked = true;
        if (active && !active.fallback) {
          active.blocked = false;
          play(active);
        }
      },
    };
  }
  function forStage(stage, spec = {}) {
    if (stage === 100) return "FINAL_BOSS";
    if (spec.boss && !spec.midboss) return "BOSS";
    return stage <= 40 ? "BATTLE_A" : stage <= 70 ? "BATTLE_B" : "BATTLE_C";
  }
  const api = { create, forStage };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcAudio = api;
})(globalThis);
