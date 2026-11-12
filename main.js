(() => {
  const CREDIT_TYPES = ['Produced', 'Written', 'Mixed', 'Mastered', 'Engineered', 'Edited'];

  // [year, credits, title, artist, audio file id]
  const WORKS = [
    ['2026', ['Produced', 'Written', 'Mixed', 'Engineered', 'Edited'], 'Gracias', 'YoSoyJackie', 'track-03'],
    ['2026', ['Produced', 'Written', 'Mixed', 'Engineered', 'Edited'], 'Amores de Mentiras', 'Perla Caballero', 'track-04'],
    ['2026', ['Produced', 'Written', 'Engineered', 'Edited'], 'Balas Al Pecho', 'Mily Alcubierre', 'track-05'],
    ['2025', ['Produced', 'Written', 'Mixed', 'Mastered', 'Engineered', 'Edited'], 'acoustictypeshit', 'kekas', 'track-01'],
    ['2024', ['Produced', 'Written', 'Mixed', 'Mastered', 'Engineered', 'Edited'], '6.6 EP', 'Vale Palacios', 'track-02'],
  ].map(([year, credits, title, artist, id]) => ({ year, credits, title, artist, id, src: `audio/${id}.mp3` }));

  const DEMOS = [
    ['Llegamos Antes', 'Sofi Ochoa'],
    ['Guerra Fría', 'Sofi Ochoa'],
    ['Esta Night', 'Anddy Diga'],
    ['=', 'YOZI'],
    ['Sinicos', 'YOZI'],
    ['Medianoche', 'YOZI'],
    ['Piezas', 'YOZI'],
  ].map(([title, interpreter], i) => {
    const id = 'demo-' + pad(i + 1);
    return { title, interpreter, id, src: `audio/${id}.mp3` };
  });

  const ICON_PLAY = 'M3.5 1.5v11l9-5.5z';
  const ICON_PAUSE = 'M3 2h3v10H3zM8 2h3v10H8z';
  const BAR_COUNT = 56;

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function playButton(id, title) {
    return `<button class="play-btn" type="button" data-play="${id}" aria-label="Play ${esc(title)}">` +
      `<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="${ICON_PLAY}"></path></svg></button>`;
  }

  // ---------- Render ----------
  $('#credit-list').innerHTML = CREDIT_TYPES.map((label, i) =>
    `<div class="credit-row"><dt><a href="#work-${label.toLowerCase()}">${label}</a></dt>` +
    `<a class="no" href="#work-${label.toLowerCase()}" aria-hidden="true" tabindex="-1">1.${i + 1} ↓</a></div>`
  ).join('');

  function trackRow(w, no, withCredits) {
    const tags = withCredits
      ? `<span class="c-credits">${w.credits.map(c => `<a class="tag" href="#work-${c.toLowerCase()}">${c}</a>`).join('')}</span>`
      : '';
    return `<div class="track" data-track="${w.id}">
      <span class="c-play">${playButton(w.id, w.title)}<span class="track-no">${no}</span></span>
      <span class="c-song"><span class="track-title">${esc(w.title)}</span><span class="track-artist">${esc(w.artist)}</span></span>
      ${tags}
      <span class="c-year">${w.year}</span>
      <a class="c-listen" href="#">Listen ↗</a>
      <div class="progress" hidden><span class="progress-bar"><span></span></span><span class="progress-time">0:00 / 0:00</span></div>
      <div class="missing" hidden>[Audio placeholder — add file: ${w.src}]</div>
    </div>`;
  }

  $('#all-count').textContent = WORKS.length + ' tracks';
  $('#all-tracks').innerHTML = WORKS.map((w, i) => trackRow(w, pad(i + 1), true)).join('');

  $('#work-groups').innerHTML = CREDIT_TYPES.map((title, gi) => {
    const tracks = WORKS.filter(w => w.credits.includes(title));
    return `<div class="group" id="work-${title.toLowerCase()}">
      <div class="list-head">
        <h3 class="sub-title"><span class="section-no">1.${gi + 1}</span>${title}</h3>
        <span class="label">${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}</span>
      </div>
      ${tracks.map((w, i) => trackRow(w, pad(i + 1), false)).join('')}
    </div>`;
  }).join('');

  function seededBars(seed) {
    let s = seed; const out = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      s = (s * 9301 + 49297) % 233280;
      const env = Math.sin((i / (BAR_COUNT - 1)) * Math.PI) * 0.55 + 0.35;
      out.push(Math.max(8, Math.round((0.35 + (s / 233280) * 0.65) * env * 100)));
    }
    return out;
  }
  function barsHtml(heights) { return heights.map(h => `<span style="height:${h}%"></span>`).join(''); }

  $('#demo-grid').innerHTML = DEMOS.map((d, i) => `
    <article class="demo" data-track="${d.id}">
      <div class="demo-meta label"><span>Demo ${pad(i + 1)}</span><span class="demo-time">—:—</span></div>
      <h3>${esc(d.title)}</h3>
      <div class="demo-interp"><span class="label">Interpreter</span><span>${esc(d.interpreter)}</span></div>
      <div class="demo-player">
        ${playButton(d.id, d.title)}
        <div class="wave" aria-hidden="true">${barsHtml(seededBars(i * 37 + 7))}</div>
      </div>
    </article>`).join('');

  // ---------- Player (one shared audio element) ----------
  const audio = new Audio();
  audio.preload = 'none';
  const durations = {};
  let currentId = null;
  const missing = new Set();
  const isDemo = id => id.startsWith('demo-');

  function setButtons() {
    $$('[data-play]').forEach(btn => {
      const on = btn.dataset.play === currentId && !audio.paused;
      btn.classList.toggle('is-playing', on);
      btn.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + btn.getAttribute('aria-label').replace(/^(Play|Pause) /, ''));
      btn.querySelector('path').setAttribute('d', on ? ICON_PAUSE : ICON_PLAY);
    });
  }

  function updateProgress() {
    if (!currentId) return;
    const t = audio.currentTime, d = audio.duration || 0;
    const pct = d ? (t / d) * 100 : 0;
    if (isDemo(currentId)) {
      const card = $(`.demo[data-track="${currentId}"]`);
      $('.demo-time', card).textContent = fmt(t) + ' / ' + fmt(d || durations[currentId]);
      const bars = $$('.wave span', card), lit = (pct / 100) * bars.length;
      bars.forEach((b, j) => b.classList.toggle('on', j < lit));
    } else {
      $$(`.track[data-track="${currentId}"]`).forEach(row => {
        $('.progress-bar span', row).style.width = pct + '%';
        $('.progress-time', row).textContent = fmt(t) + ' / ' + fmt(d);
      });
    }
  }

  function resetDemo(id) {
    const card = $(`.demo[data-track="${id}"]`);
    if (!card) return;
    $('.demo-time', card).textContent = durations[id] ? fmt(durations[id]) : '—:—';
    $$('.wave span', card).forEach(b => b.classList.remove('on'));
  }

  function select(id, src) {
    if (currentId) {
      if (isDemo(currentId)) resetDemo(currentId);
      else $$(`.track[data-track="${currentId}"] .progress`).forEach(p => { p.hidden = true; });
    }
    currentId = id;
    audio.src = src;
    if (!isDemo(id)) {
      $$(`.track[data-track="${id}"]`).forEach(row => {
        $('.progress', row).hidden = missing.has(id);
        $('.progress-bar span', row).style.width = '0%';
        $('.progress-time', row).textContent = '0:00 / 0:00';
      });
    }
  }

  function toggle(id) {
    const item = WORKS.find(w => w.id === id) || DEMOS.find(d => d.id === id);
    if (!item) return;
    if (currentId !== id) select(id, item.src);
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
    setButtons();
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-play]');
    if (btn) toggle(btn.dataset.play);
    const listen = e.target.closest('.c-listen');
    if (listen && listen.getAttribute('href') === '#') e.preventDefault();
  });

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('play', setButtons);
  audio.addEventListener('pause', setButtons);
  audio.addEventListener('ended', () => { audio.currentTime = 0; updateProgress(); setButtons(); });
  audio.addEventListener('error', () => {
    if (!currentId || isDemo(currentId)) return setButtons();
    missing.add(currentId);
    $$(`.track[data-track="${currentId}"]`).forEach(row => {
      $('.progress', row).hidden = true;
      $('.missing', row).hidden = false;
    });
    setButtons();
  });

  // ---------- Real waveforms for demos (decoded after page load) ----------
  async function loadPeaks() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    for (const d of DEMOS) {
      try {
        const buf = await (await fetch(d.src)).arrayBuffer();
        const ab = await ctx.decodeAudioData(buf);
        const ch = ab.getChannelData(0), step = Math.floor(ch.length / BAR_COUNT), out = [];
        for (let b = 0; b < BAR_COUNT; b++) {
          let m = 0;
          for (let j = b * step; j < (b + 1) * step; j += 64) { const v = Math.abs(ch[j]); if (v > m) m = v; }
          out.push(m);
        }
        const mx = Math.max(...out) || 1;
        durations[d.id] = ab.duration;
        const card = $(`.demo[data-track="${d.id}"]`);
        $('.wave', card).innerHTML = barsHtml(out.map(v => Math.max(6, Math.round((v / mx) * 100))));
        if (currentId === d.id) updateProgress(); else resetDemo(d.id);
      } catch (e) { /* keep placeholder bars */ }
    }
    if (ctx.close) ctx.close();
  }
  if (document.readyState === 'complete') loadPeaks();
  else window.addEventListener('load', loadPeaks);
})();
