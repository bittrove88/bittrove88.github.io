(function (root) {
  "use strict";
  function timeline(frames, duration, cards) {
    let time = 0;
    const scenes = frames.map((shot) => {
      const start = time;
      time += shot.durationMs / 1000;
      return { kind: "scene", start, end: time, shot };
    });
    const available = Math.max(0, duration - time - 9);
    const selected = cards.slice(
      0,
      Math.min(cards.length, Math.floor(available / 4)),
    );
    const step = available / (selected.length || 1);
    const album = selected.map((card, i) => ({
      kind: "album",
      start: time + i * step,
      end: time + (i + 1) * step,
      card,
    }));
    return [
      ...scenes,
      ...album,
      {
        kind: "scenery",
        start: Math.max(time, duration - 9),
        end: Math.max(time, duration - 6),
      },
      { kind: "logo", start: Math.max(time, duration - 6), end: duration },
      { kind: "silence", start: duration, end: duration + 2.5 },
    ];
  }
  function locate(plan, seconds) {
    return (
      plan.find((x) => seconds >= x.start && seconds < x.end) ||
      plan[plan.length - 1]
    );
  }
  function create(host, frames, duration, locale) {
    const data = root.ArcMediaData;
    let plan = timeline(frames, duration, data.cards);
    const layer = document.createElement("div");
    layer.className = "ending-album";
    layer.hidden = true;
    host.append(layer);
    let current = null,
      key = null,
      previous = null;
    const assetURL = (a) => {
      const url = new URL(root.ArcAssetLoader.resolve(a.src));
      url.searchParams.set("v", a.sha256.slice(0, 12));
      return url.href;
    };
    function picture(asset) {
      const img = document.createElement("img");
      img.alt = asset.name?.[locale] || "";
      img.src = assetURL(asset);
      img.style.maxWidth = "min(100%, " + asset.width + "px)";
      img.style.maxHeight = "min(100%, " + asset.height + "px)";
      img.onerror = () => {
        img.hidden = true;
      };
      return img;
    }
    function update(seconds) {
      const cue = locate(plan, seconds),
        nextKey = cue.kind + ":" + cue.start;
      layer.hidden = cue.kind === "scene";
      if (nextKey !== key && cue.kind !== "scene") {
        previous?.remove();
        previous = current;
        key = nextKey;
        current = document.createElement("div");
        current.className = "ending-card";
        current.dataset.kind = cue.kind;
        if (cue.kind === "album") {
          const pictures = document.createElement("div");
          pictures.className = "ending-pictures";
          for (const asset of cue.card.images) {
            const image = picture(asset);
            image.style.maxWidth = "min(46%, " + asset.width + "px)";
            pictures.append(image);
          }
          const caption = document.createElement("p");
          caption.textContent = cue.card.name[locale];
          current.append(pictures, caption);
        } else if (cue.kind === "scenery") {
          const image = picture(data.scenery);
          image.className = "ending-scenery";
          current.append(image);
        } else {
          current.append(
            picture(data.cutouts.find((x) => x.id === "logo_arcline")),
          );
        }
        layer.append(current);
        // Preload only the next small card, never the complete album or audio catalogue.
        const next = plan[plan.indexOf(cue) + 1];
        for (const asset of next?.card?.images || []) {
          const img = new Image();
          img.src = assetURL(asset);
        }
      }
      if (current && !layer.hidden) {
        const fade = Math.min(1, Math.max(0, (seconds - cue.start) / 0.8));
        current.style.opacity = String(fade);
        if (previous) previous.style.opacity = String(1 - fade);
      }
      return { cue, done: seconds >= duration + 2.5 };
    }
    return {
      update,
      destroy() {
        layer.remove();
      },
      setDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds === duration)
          return;
        duration = seconds;
        plan = timeline(frames, duration, data.cards);
      },
      get plan() {
        return plan;
      },
    };
  }
  const api = { timeline, locate, create };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcEnding = api;
})(globalThis);
