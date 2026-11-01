/* Generated from game/ui/chapter-playback.js. Edit the source. */
(function (root) {
  "use strict";
  function plan(data, chapter, crew = root.ArcCrew.rows) {
    const start = (chapter - 1) * 10 + 1,
      end = Math.min(chapter * 10, data.cleared),
      nodes = [];
    if (chapter === 1 && data.journeyStarted)
      nodes.push({ kind: "movie", id: "prologue" });
    for (let stage = start; stage <= end; stage++) {
      nodes.push({ kind: "clear", stage });
      const companion = crew.find((c) => c.stage === stage);
      if (companion) nodes.push({ kind: "recruit", id: companion.id, stage });
      if ([30, 60, 100].includes(stage))
        nodes.push({
          kind: "movie",
          id: stage === 100 ? "epilogue" : String(stage),
        });
    }
    return nodes;
  }
  let hooks,
    session = null,
    serial = 0;
  const $ = (id) => document.getElementById(id),
    lang = () => root.ArcI18n.language,
    local = (ja, en) => (lang() === "en" ? en : ja);
  function paint() {
    if (!session) return;
    const node = session.nodes[session.index];
    $("chapterPlaybackLabel").textContent =
      local("第" + session.chapter + "章", "Chapter " + session.chapter) +
      " · " +
      (session.index + 1) +
      " / " +
      session.nodes.length;
    $("chapterPlaybackBack").textContent = local(
      "章の一覧へ",
      "Back to chapters",
    );
    $("chapterPlaybackPause").textContent = session.paused
      ? local("再生", "Play")
      : local("一時停止", "Pause");
    $("chapterPlaybackNext").textContent = local("次へ", "Next");
    $("chapterPlayback").dataset.kind = node.kind;
    if (node.kind === "movie") return;
    let id, title, lines;
    if (node.kind === "recruit") {
      const c = root.ArcCrew.get(node.id);
      id = c.id;
      title =
        local("仲間との出会い · ", "A companion · ") +
        root.ArcStory.pick(c.name, lang());
      lines = [
        root.ArcStory.pick(c.reason, lang()),
        root.ArcStory.joinLine(c.id, lang()),
      ];
    } else {
      const r = root.ArcStory.result(node.stage, lang());
      id = r.focus;
      title =
        local(node.stage + "面 · ", "Stage " + node.stage + " · ") + r.title;
      lines = [r.aftermath, r.response];
    }
    $("chapterPlaybackTitle").textContent = title;
    $("chapterPlaybackArt").innerHTML = root.ArcCharacterHero.art(id, {
      lang: lang(),
    });
    root.ArcCharacterHero.hydrate($("chapterPlaybackArt"));
    session.typer = root.ArcStoryView.typeText($("chapterPlaybackText"), lines);
    session.typer.seek(session.age);
    session.duration = Math.max(6, session.typer.duration + 2.5);
  }
  function enter() {
    if (!session) return;
    if (session.index >= session.nodes.length) {
      close();
      return;
    }
    const current = session,
      node = current.nodes[current.index];
    current.age = 0;
    current.paused = false;
    if (node.kind === "movie") {
      $("chapterPlayback").hidden = true;
      hooks.movie(node.id, () => {
        if (session !== current) return;
        current.index++;
        $("chapterPlayback").hidden = false;
        enter();
      });
    } else {
      $("chapterPlayback").hidden = false;
      if (node.kind === "clear") hooks.track(node.stage);
      paint();
      $("chapterPlaybackPause").focus({ preventScroll: true });
    }
  }
  function next() {
    if (!session || session.nodes[session.index]?.kind === "movie") return;
    session.index++;
    enter();
  }
  function close() {
    if (!session || root.ArcStoryView.state?.ending) return false;
    const old = session;
    session = null;
    if (root.ArcStoryView.active) root.ArcStoryView.close(true);
    root.ArcScreens.close("chapterPlayback", false);
    $("chapterPlaybackArt").replaceChildren();
    hooks.restore(old.music);
    old.done?.();
    return true;
  }
  function open(chapter, trigger, done) {
    if (session) return false;
    const nodes = plan(hooks.data(), chapter);
    if (!nodes.length) return false;
    session = {
      id: ++serial,
      chapter,
      nodes,
      index: 0,
      age: 0,
      paused: false,
      music: hooks.snapshot(),
      done,
    };
    root.ArcScreens.open("chapterPlayback", {
      trigger,
      block: ["lobby", "battle", "overlay", "journalPanel", "lobbySettings"],
      onEscape: close,
      cycleFocus: true,
    });
    enter();
    return true;
  }
  function update(dt) {
    if (
      !session ||
      session.paused ||
      session.nodes[session.index]?.kind === "movie"
    )
      return;
    session.age += dt;
    session.typer?.seek(session.age);
    if (session.age >= session.duration) next();
  }
  function install(options) {
    hooks = options;
    $("chapterPlaybackBack").onclick = close;
    $("chapterPlaybackNext").onclick = next;
    $("chapterPlaybackPause").onclick = () => {
      if (!session) return;
      session.paused = !session.paused;
      paint();
    };
    root.addEventListener("arcline-language", () => {
      if (session && session.nodes[session.index]?.kind !== "movie") paint();
    });
  }
  const api = {
    plan,
    install,
    open,
    close,
    next,
    update,
    get active() {
      return !!session;
    },
    get state() {
      return session
        ? {
            chapter: session.chapter,
            index: session.index,
            count: session.nodes.length,
            node: session.nodes[session.index],
            age: session.age,
            paused: session.paused,
          }
        : null;
    },
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcChapterPlayback = api;
})(globalThis);
