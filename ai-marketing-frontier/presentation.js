(() => {
  'use strict';
  const launchers = [...document.querySelectorAll('.present-start')];
  const main = document.querySelector('#main');
  if (!main || typeof HTMLDialogElement === 'undefined') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'presentation-dialog';
  dialog.setAttribute('aria-labelledby', 'presentation-label');
  dialog.innerHTML = `
    <h2 id="presentation-label" class="presentation-sr-only">プレゼンモード</h2>
    <div class="presentation-stage"><div class="presentation-frame"></div></div>
    <div class="presentation-toolbar">
      <button type="button" data-action="previous" aria-label="前のスライド">← 前へ</button>
      <span class="presentation-count" role="status" aria-live="polite" aria-atomic="true"></span>
      <button type="button" data-action="next" aria-label="次のスライド">次へ →</button>
      <label class="presentation-jump"><span class="presentation-sr-only">スライドを選択</span><select aria-label="スライドを選択"></select></label>
      <button type="button" data-action="fullscreen">全画面</button>
      <button type="button" data-action="close">終了</button>
      <span class="presentation-help">← → / Space で移動 · F 全画面 · Esc 終了</span>
    </div>
    <progress class="presentation-progress" aria-label="プレゼンの進行状況"></progress>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.presentation-stage');
  const frame = dialog.querySelector('.presentation-frame');
  const select = dialog.querySelector('select');
  const count = dialog.querySelector('.presentation-count');
  const progress = dialog.querySelector('progress');
  const previous = dialog.querySelector('[data-action="previous"]');
  const next = dialog.querySelector('[data-action="next"]');
  const full = dialog.querySelector('[data-action="fullscreen"]');
  const deck = [];
  const chapters = new Map();
  let current = 0;
  let returnHash = '';
  let returnFocus = null;
  let returnScroll = 0;
  let touchStart = null;
  let ownsFullscreen = false;

  function copy(node) {
    const clone = node.cloneNode(true);
    [clone, ...clone.querySelectorAll('[id]')].forEach(element => element.removeAttribute('id'));
    clone.querySelectorAll('.present-start').forEach(element => element.remove());
    return clone;
  }

  function add(title, label, nodes, type = '') {
    const slide = document.createElement('section');
    slide.className = `presentation-slide ${type}`;
    slide.hidden = true;
    slide.tabIndex = -1;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'スライド');
    const kicker = document.createElement('p');
    kicker.className = 'kicker';
    kicker.textContent = label;
    const heading = document.createElement('h2');
    heading.textContent = title;
    const content = document.createElement('div');
    content.className = 'presentation-content';
    nodes.forEach(node => content.append(copy(node)));
    slide.append(kicker, heading, content);
    slide.setAttribute('aria-label', `${deck.length + 1}. ${title}`);
    frame.append(slide);
    const option = document.createElement('option');
    option.value = String(deck.length);
    option.textContent = `${String(deck.length + 1).padStart(2, '0')} · ${title}`;
    select.append(option);
    deck.push({ slide, title });
  }

  const hero = main.querySelector('.hero');
  const cover = document.createElement('div');
  cover.className = 'presentation-cover';
  const coverCopy = copy(hero.firstElementChild);
  coverCopy.querySelectorAll('.button').forEach(element => element.remove());
  cover.append(coverCopy, copy(hero.querySelector('.hero-image')));
  add('生成AI × マーケティングの最前線', 'MARKETING TECHNOLOGY FAIR 2026', [cover], 'presentation-title');
  add('本日の流れ', 'CONTENTS', [main.querySelector('.contents ol')], 'presentation-contents');

  main.querySelectorAll('.chapter').forEach(chapter => {
    const title = chapter.querySelector('.chapter-heading h2').textContent;
    const label = chapter.querySelector('.chapter-heading .kicker').textContent;
    chapters.set(chapter.id, deck.length);
    add(title, label, [chapter.querySelector('.section-lead')], 'presentation-divider');
    let heading = title;
    let group = [];
    const flush = () => {
      if (group.length) add(heading, label, group);
      group = [];
    };
    [...chapter.children].forEach(node => {
      if (node.matches('.chapter-heading, .section-lead, .source-notes')) return;
      if (node.matches('h3')) {
        flush();
        heading = node.textContent;
      } else if (node.matches('.speakers, .case-grid, .figure-grid')) {
        flush();
        [...node.children].forEach(child => {
          const titleNode = child.querySelector('h3, figcaption');
          add(titleNode?.textContent || heading, label, [child], child.matches('figure') ? 'presentation-figure' : '');
        });
      } else if (node.matches('.cards, .timeline, .comparison, .agent-grid, .source-figure, .demo-callout')) {
        group.push(node);
        flush();
      } else if (node.matches('blockquote')) {
        flush();
        group.push(node);
      } else {
        group.push(node);
      }
    });
    flush();
  });
  progress.max = deck.length;

  function fit() {
    // A fixed slide canvas preserves a presentation layout on desktop.
    // Narrow screens use normal-size text and vertical scrolling instead.
    const narrow = matchMedia('(max-width: 900px)').matches;
    const scale = Math.min((stage.clientWidth - 32) / 1600, (stage.clientHeight - 24) / 900);
    frame.style.setProperty('--presentation-scale', String(Math.max(.1, scale)));
    frame.classList.toggle('presentation-narrow', narrow);
  }

  function show(index, updateAddress = true) {
    current = Math.max(0, Math.min(deck.length - 1, index));
    deck.forEach((item, i) => { item.slide.hidden = i !== current; });
    const item = deck[current];
    select.value = String(current);
    count.textContent = `${current + 1} / ${deck.length}`;
    count.setAttribute('aria-label', `${current + 1} / ${deck.length}：${item.title}`);
    progress.value = current + 1;
    previous.disabled = current === 0;
    next.disabled = current === deck.length - 1;
    item.slide.scrollTop = 0;
    item.slide.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    fit();
    if (dialog.open) item.slide.focus({ preventScroll: true });
    if (updateAddress) history.replaceState(null, '', `#present=${current + 1}`);
  }

  function start(index = 0, updateAddress = true) {
    if (!dialog.open) {
      returnHash = location.hash.startsWith('#present=') ? '' : location.hash;
      returnFocus = document.activeElement;
      returnScroll = window.scrollY;
      dialog.showModal();
      document.body.classList.add('is-presenting');
      if (updateAddress) history.pushState(null, '', `#present=${index + 1}`);
    }
    show(index, updateAddress);
  }

  function close(updateAddress = true) {
    if (!dialog.open) return;
    if (ownsFullscreen && document.fullscreenElement === document.documentElement) document.exitFullscreen().catch(() => {});
    ownsFullscreen = false;
    dialog.close();
    document.body.classList.remove('is-presenting');
    if (updateAddress) history.replaceState(null, '', returnHash || location.pathname + location.search);
    window.scrollTo({ top: returnScroll, behavior: 'instant' });
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  }

  async function toggleFullscreen() {
    if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return;
    try {
      if (document.fullscreenElement === document.documentElement) {
        await document.exitFullscreen();
        ownsFullscreen = false;
      } else {
        await document.documentElement.requestFullscreen();
        ownsFullscreen = true;
      }
    } catch {
      // The viewport presentation remains usable if the browser denies fullscreen.
    }
    fit();
  }
  full.hidden = !document.fullscreenEnabled || !document.documentElement.requestFullscreen;
  document.addEventListener('fullscreenchange', () => {
    full.textContent = document.fullscreenElement === document.documentElement ? '全画面を終了' : '全画面';
    full.setAttribute('aria-pressed', String(document.fullscreenElement === document.documentElement));
    fit();
  });

  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'previous') show(current - 1);
    if (action === 'next') show(current + 1);
    if (action === 'close') close();
    if (action === 'fullscreen') toggleFullscreen();
    const link = event.target.closest('a[href^="#"]');
    if (link && chapters.has(link.hash.slice(1))) {
      event.preventDefault();
      show(chapters.get(link.hash.slice(1)));
    }
  });
  select.addEventListener('change', () => show(Number(select.value)));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!dialog.open) {
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); start(); }
      return;
    }
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key) || (event.code === 'Space' && !event.target.closest('button, a'))) {
      event.preventDefault(); show(current + (event.shiftKey ? -1 : 1));
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault(); show(current - 1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); show(event.key === 'Home' ? 0 : deck.length - 1);
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault(); toggleFullscreen();
    } else if (event.key === 'Escape') {
      event.preventDefault(); close();
    }
  });
  stage.addEventListener('pointerdown', event => {
    touchStart = event.pointerType === 'touch' && !event.target.closest('a, button, select')
      ? { x: event.clientX, y: event.clientY } : null;
  });
  stage.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const x = event.clientX - touchStart.x;
    const y = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(x) > 65 && Math.abs(x) > Math.abs(y) * 1.5) show(current + (x < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { touchStart = null; });
  const route = () => {
    const match = /^#present=(\d+)$/.exec(location.hash);
    if (match) start(Number(match[1]) - 1, false);
    else if (dialog.open) close(false);
  };
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  new ResizeObserver(fit).observe(stage);
  launchers.forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => start());
  });
  route();
})();
