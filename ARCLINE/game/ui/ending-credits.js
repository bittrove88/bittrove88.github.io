(function (root) {
  "use strict";
  const data = root.ArcEndingData || require("./ending-roll-data.js");
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const smooth = (n) => {
    n = clamp(n);
    return n * n * (3 - 2 * n);
  };
  function timeline(frames, duration = data.audio.duration) {
    const rate =
      frames.reduce((n, s) => n + s.durationMs / 1000, 0) / data.storyEnd;
    let time = 0;
    const scenes = frames.map((shot, i) => {
      const start = time;
      time =
        i === frames.length - 1
          ? data.storyEnd
          : time + shot.durationMs / 1000 / rate;
      return { kind: "scene", start, end: time, shot, rate };
    });
    const value = (v) =>
      typeof v === "number"
        ? v
        : {
            storyEnd: data.storyEnd,
            duration,
            "duration-6": duration - 6,
            "duration+2.5": duration + 2.5,
          }[v];
    return [
      ...scenes,
      ...data.segments.map((s) => ({
        ...s,
        start: value(s.start),
        end: value(s.end),
      })),
    ];
  }
  function locate(plan, seconds) {
    return (
      plan.find((x) => seconds >= x.start && seconds < x.end) ||
      (seconds < 0 ? plan[0] : plan.at(-1))
    );
  }
  // Every appearance and pose derives from the same media time; no animation timers.
  function entries(cue) {
    if (cue.kind === "players_roll") {
      const passage = Math.min(data.motion.playerPassage, cue.end - cue.start),
        stagger = (cue.end - cue.start - passage) / (data.players.length - 1);
      return data.players.map((id, i) => ({
        id,
        index: i,
        start: cue.start + i * stagger,
        end: Math.min(cue.end, cue.start + i * stagger + passage),
      }));
    }
    if (cue.kind === "players_gather")
      return data.players.map((id, i) => ({
        id,
        index: i,
        start: cue.start,
        end: cue.end,
      }));
    if (!cue.groups) return [];
    const overlap = cue.overlap || 0,
      length =
        (cue.end - cue.start + (cue.groups.length - 1) * overlap) /
        cue.groups.length;
    return cue.groups.flatMap((key, g) =>
      data.groups[key].map((id, i, group) => ({
        id,
        index: i,
        group: key,
        overlap,
        groupIndex: g,
        groupCount: cue.groups.length,
        groupStart: cue.start + g * (length - overlap),
        groupEnd: cue.start + g * (length - overlap) + length,
        count: group.length,
        start:
          cue.start + g * (length - overlap) + i * data.motion.memberStagger,
        end:
          cue.start +
          g * (length - overlap) +
          length -
          (group.length - 1 - i) * data.motion.memberStagger,
      })),
    );
  }
  function flight(entry, seconds, player, reduced) {
    const age = seconds - entry.start,
      p = clamp(age / (entry.end - entry.start));
    if (reduced)
      return {
        progress: p,
        x: 0,
        rotation: 0,
        scale: 1,
        opacity: Math.min(clamp(age / 0.3), clamp((entry.end - seconds) / 0.3)),
      };
    // A formation shares its horizontal path; staggered members keep their lanes.
    const begin = entry.groupStart ?? entry.start,
      end = entry.groupEnd ?? entry.end,
      incoming = 1 - smooth((seconds - begin) / data.motion.flightDuration),
      outgoing = smooth(
        (seconds - end + data.motion.flightDuration) /
          data.motion.flightDuration,
      ),
      phase = clamp((seconds - begin) / (end - begin)),
      direction = (player ? entry.index % 2 : entry.groupIndex % 2) ? 1 : -1,
      offset = player
        ? data.motion.flightOffsetPlayer
        : data.motion.flightOffsetEnemy,
      ease = player
        ? data.motion.flightEasePlayer
        : data.motion.flightEaseEnemy;
    return {
      progress: p + ease * Math.sin(2 * Math.PI * p),
      x:
        direction *
        (offset * (incoming - outgoing) +
          data.motion.flightDrift * Math.sin(2 * Math.PI * phase)),
      rotation:
        direction *
        (data.motion.flightBank * (incoming - outgoing) +
          data.motion.flightSway * Math.sin(2 * Math.PI * phase)),
      scale: 1 - 0.12 * incoming - 0.08 * outgoing,
      opacity: Math.min(
        smooth(age / data.motion.flightFade),
        smooth((entry.end - seconds) / data.motion.flightFade),
      ),
    };
  }
  function pose(cue, entry, seconds, reduced = false) {
    const age = seconds - entry.start,
      fade = Math.min(clamp(age / 0.3), clamp((entry.end - seconds) / 0.3));
    const i = entry.index;
    if (cue.kind === "players_roll") {
      const f = flight(entry, seconds, true, reduced);
      return {
        x: (i % 2 ? 0.69 : 0.31) + f.x,
        y: reduced
          ? 0.2 + Math.floor((i % 6) / 2) * 0.3
          : 1.22 - 1.44 * f.progress + Math.sin(age * 2.4 + i) * 0.006,
        width: 0.31,
        height: reduced ? 0.22 : 0.3,
        opacity: f.opacity,
        scale: f.scale,
        rotation: f.rotation,
      };
    }
    if (cue.kind === "players_gather") {
      const merge = smooth(age / data.motion.gatherMerge),
        pull = reduced ? 0 : smooth((age - 7) / (cue.end - cue.start - 7));
      const col = i % 5,
        row = Math.floor(i / 5),
        x = 0.12 + col * 0.19,
        y = row ? 0.92 : 0.45;
      return {
        x:
          0.5 +
          (x - 0.5) * (1 - pull * 0.08) +
          (reduced ? 0 : (i % 2 ? 1 : -1) * (1 - merge) * 0.75),
        y:
          0.5 +
          (y - 0.5) * (1 - pull * 0.08) +
          (reduced ? 0 : Math.sin(age * 1.4 + i) * 0.003),
        width: 0.17,
        height: 0.29,
        opacity: clamp(age / 0.6),
        scale: 1 - pull * 0.08,
      };
    }
    if (cue.kind === "archeart")
      return {
        x: 0.5,
        y: 0.48 + (reduced ? 0 : (1 - smooth(age)) * 0.1),
        width: 0.58,
        height: 0.65,
        opacity: Math.min(smooth(age), clamp(4.5 - age)),
        scale: reduced ? 1 : 1 + 0.025 * smooth((age - 1) / 2.5),
      };
    const f = flight(entry, seconds, false, reduced),
      boss = cue.kind === "bosses",
      row = Math.floor(i / 3),
      col = i % 3,
      last = entry.count === 5 && row === 1;
    const opacity = reduced
      ? Math.min(
          fade,
          clamp(
            (seconds -
              entry.groupStart -
              (entry.groupIndex ? entry.overlap / 2 : 0) -
              i * 0.03) /
              0.18,
          ),
          clamp(
            (entry.groupEnd -
              (entry.groupIndex < entry.groupCount - 1
                ? entry.overlap / 2
                : 0) -
              seconds) /
              0.18,
          ),
        )
      : f.opacity;
    return {
      x: (last ? 0.34 + (i - 3) * 0.32 : 0.18 + col * 0.32) + f.x,
      y: reduced
        ? boss
          ? 0.48
          : 0.31 + row * 0.38
        : 1.25 - 1.5 * f.progress + (boss ? 0 : (row - 0.5) * 0.36),
      width: 0.28,
      height: boss ? 0.5 : 0.27,
      opacity,
      scale: f.scale,
      rotation: f.rotation,
    };
  }
  function create(host, frames, duration, locale) {
    let plan = timeline(frames, duration),
      key = null,
      current = null,
      previous = null;
    const layer = document.createElement("div");
    layer.className = "ending-album";
    layer.hidden = true;
    host.append(layer);
    const cache = new Map(),
      nodes = new Map(),
      actors = new Map(data.actors.map((a) => [a.id, a]));
    const reduced = root.matchMedia?.("(prefers-reduced-motion: reduce)");
    const assetURL = (a) => {
      const url = new URL(root.ArcAssetLoader.resolve(a.src));
      url.searchParams.set("v", a.sha256.slice(0, 12));
      return url.href;
    };
    function picture(asset) {
      if (cache.has(asset.id)) return cache.get(asset.id);
      const img = new Image();
      img.alt = asset.name?.[locale] || "";
      img.decoding = "async";
      img.onerror = () => {
        img.hidden = true;
        img.dataset.missing = "true";
      };
      img.src = assetURL(asset);
      img.decode?.().catch(() => {});
      cache.set(asset.id, img);
      return img;
    }
    function actorNode(entry) {
      if (nodes.has(entry.id)) return nodes.get(entry.id);
      const asset = actors.get(entry.id),
        node = document.createElement("figure");
      node.className = "ending-actor";
      node.dataset.actor = entry.id;
      const caption = document.createElement("figcaption");
      caption.textContent = asset.name[locale] || asset.name.ja;
      node.append(picture(asset), caption);
      current.append(node);
      nodes.set(entry.id, node);
      return node;
    }
    function update(seconds) {
      const cue = locate(plan, seconds),
        nextKey = ["logo", "silence"].includes(cue.kind)
          ? "logo"
          : cue.kind + ":" + cue.start;
      layer.hidden = cue.kind === "scene";
      if (nextKey !== key && !layer.hidden) {
        previous?.remove();
        previous = current;
        key = nextKey;
        nodes.clear();
        current = document.createElement("div");
        current.className = "ending-roll-stage";
        current.dataset.kind = cue.kind;
        layer.append(current);
        if (nextKey === "logo") {
          const asset = root.ArcMediaData.cutouts.find(
              (a) => a.id === "logo_arcline",
            ),
            img = picture(asset);
          img.style.maxWidth = asset.width + "px";
          img.style.maxHeight = asset.height + "px";
          current.append(img);
        } else {
          previous?.remove();
          previous = null;
        }
      }
      const keep = new Set(),
        active = entries(cue),
        w = layer.clientWidth,
        h = layer.clientHeight;
      for (const entry of active) {
        if (seconds >= entry.start - 3 && seconds < entry.end) {
          keep.add(entry.id);
          picture(actors.get(entry.id));
        }
        if (seconds < entry.start || seconds >= entry.end) {
          nodes.get(entry.id)?.remove();
          nodes.delete(entry.id);
          continue;
        }
        const node = actorNode(entry),
          asset = actors.get(entry.id),
          p = pose(cue, entry, seconds, !!reduced?.matches);
        const rotation = p.rotation || 0,
          angle = (Math.abs(rotation) * Math.PI) / 180,
          rotatedWidth =
            asset.width * Math.cos(angle) + asset.height * Math.sin(angle),
          rotatedHeight =
            asset.height * Math.cos(angle) + asset.width * Math.sin(angle),
          scale = Math.min(
            1,
            Math.min(
              (w * p.width) / rotatedWidth,
              (h * p.height) / rotatedHeight,
            ) * p.scale,
            asset.width / rotatedWidth,
            asset.height / rotatedHeight,
          );
        const image = node.firstElementChild;
        image.style.width = asset.width * scale + "px";
        image.style.height = asset.height * scale + "px";
        image.style.transform = `rotate(${rotation}deg)`;
        // Reserve the banked silhouette's height so the name stays below it.
        image.style.marginBlock =
          Math.max(0, ((rotatedHeight - asset.height) * scale) / 2) + "px";
        node.style.left = p.x * w + "px";
        node.style.top = p.y * h + "px";
        node.style.width =
          Math.min(w * 0.3, Math.max(rotatedWidth * scale, w * 0.13)) + "px";
        node.style.opacity = p.opacity;
      }
      // Decode only the current and imminent groups. Evict image references as they leave.
      const next = plan[plan.indexOf(cue) + 1];
      if (next && next.start - seconds < 3)
        for (const e of entries(next).filter((e) => e.start < next.start + 1)) {
          keep.add(e.id);
          picture(actors.get(e.id));
        }
      for (const [id, img] of cache)
        if (!keep.has(id) && !img.isConnected) cache.delete(id);
      if (nextKey === "logo" && current) {
        const fade = clamp((seconds - (duration - 6)) / 0.65);
        current.style.opacity = String(fade);
        if (previous) {
          previous.style.opacity = String(1 - fade);
          if (fade === 1) {
            previous.remove();
            previous = null;
          }
        }
      }
      return { cue, done: seconds >= duration + 2.5 };
    }
    return {
      update,
      destroy() {
        layer.remove();
        cache.clear();
        nodes.clear();
      },
      setDuration(seconds) {
        if (Number.isFinite(seconds) && seconds > 0 && seconds !== duration) {
          duration = seconds;
          plan = timeline(frames, duration);
        }
      },
      get plan() {
        return plan;
      },
    };
  }
  const api = { timeline, locate, entries, pose, create };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcEnding = api;
})(globalThis);
