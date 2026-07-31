// ============================================================
// honake — portfolio
// ============================================================

// ----- year / JST clock -----
(function () {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const el = document.getElementById('clock');
  if (!el) return;
  function pad(n) { return String(n).padStart(2, '0'); }
  function tick() {
    const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    el.textContent = `${pad(jst.getHours())}:${pad(jst.getMinutes())}:${pad(jst.getSeconds())} JST`;
  }
  tick();
  setInterval(tick, 1000);
})();

// ----- scroll reveal -----
(function () {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach(t => io.observe(t));
})();

// ----- mascot: a little slime bouncing along the kicker line -----
(function () {
  const canvas = document.getElementById('mascot');
  const hero = document.querySelector('.hero');
  const h1 = hero ? hero.querySelector('h1') : null;
  if (!canvas || !hero || !h1) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAL = { D: '#17191f', W: '#ffffff', B: '#2c4bff' };

  // 12x10 slime
  const BASE = [
    '....DDDD....',
    '..DDWWWWDD..',
    '.DWWWWWWWWD.',
    '.DWWWWWWWWD.',
    'DWWBWWWWBWWD',
    'DWWWWWWWWWWD',
    'DWWWWDDWWWWD',
    'DWWWWWWWWWWD',
    '.DWWWWWWWWD.',
    '..DDDDDDDD..',
  ];
  const BLINK = BASE.map((r, i) => i === 4 ? 'DWWWWWWWWWWD' : r);
  const HAPPY = BASE.map((r, i) => i === 6 ? 'DWWWDDDDWWWD' : r);
  // squashed landing pose
  const SQUASH = [
    '..DDDDDDDD..',
    '.DWWWWWWWWD.',
    'DWWBWWWWBWWD',
    'DWWWWWWWWWWD',
    'DWWWWDDWWWWD',
    '.DWWWWWWWWD.',
    '..DDDDDDDD..',
  ];

  // sprite bottom edge sits at y=21 inside the 24px canvas
  const BOTTOM_RATIO = 21 / 24;

  let x = 0, dir = 1, target = null;
  let idleT = 1.4;
  let airY = 0, airV = 0, airborne = false;
  let squashT = 0, pauseT = 0;
  let t = 0;
  let blinkTimer = 2 + Math.random() * 2, blinking = 0, happy = 0;
  let floorY = 0, minX = 0, maxX = 0;

  const HOP_V = -125;   // launch velocity, css px/s
  const GRAV = 580;
  const HOP_VX = 62;

  function measure() {
    const w = canvas.offsetWidth || 60;
    const kicker = hero.querySelector('.kicker');
    const anchor = kicker || h1;
    // ground line = the kicker's baseline, in the open space to its right
    floorY = anchor.offsetTop + anchor.offsetHeight;
    // measure the rendered TEXT, not the element box — a stretched grid item
    // would report the full row width and push the slime to the far right
    const range = document.createRange();
    range.selectNodeContents(anchor);
    const textRect = range.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    minX = (textRect.right - heroRect.left) + 28;
    const cs = getComputedStyle(hero);
    const contentRight = hero.clientWidth - parseFloat(cs.paddingRight) - w;
    // stay close to the kicker so the slime lives in the eye path
    maxX = Math.min(minX + 190, contentRight);
    if (maxX < minX + 40) maxX = minX + 40; // very narrow screens
    x = Math.min(Math.max(x, minX), maxX);
  }

  function place() {
    const w = canvas.offsetWidth || 60;
    const y = floorY - w * BOTTOM_RATIO + airY;
    canvas.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function drawSprite(rows, ox, oy, flip) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = flip ? row[row.length - 1 - c] : row[c];
        if (ch === '.') continue;
        ctx.fillStyle = PAL[ch];
        ctx.fillRect(ox + c, oy + r, 1, 1);
      }
    }
  }

  function frame(dt) {
    t += dt;

    // behaviour: idle → pick a spot → hop toward it
    if (!airborne && squashT <= 0 && pauseT <= 0) {
      if (target == null) {
        idleT -= dt;
        if (idleT <= 0) {
          target = minX + Math.random() * (maxX - minX);
          dir = target < x ? -1 : 1;
        }
      } else {
        airborne = true;
        airV = HOP_V;
      }
    }

    if (squashT > 0) squashT -= dt;
    if (pauseT > 0) pauseT -= dt;

    // hop physics: drift sideways while airborne
    if (airborne) {
      airV += GRAV * dt;
      airY += airV * dt;
      if (target != null) {
        x += dir * HOP_VX * dt;
        x = Math.min(Math.max(x, minX), maxX);
      }
      if (airY >= 0) {
        airY = 0;
        airborne = false;
        squashT = 0.13;
        pauseT = 0.16 + Math.random() * 0.22;
        if (target != null && (Math.abs(target - x) < 10 || x <= minX || x >= maxX)) {
          target = null;
          idleT = 2 + Math.random() * 4.5;
        }
      }
    }

    // blink / happy timers
    blinkTimer -= dt;
    if (blinkTimer <= 0) { blinking = 0.12; blinkTimer = 2 + Math.random() * 2.5; }
    if (blinking > 0) blinking -= dt;
    if (happy > 0) happy -= dt;

    // draw
    ctx.clearRect(0, 0, 24, 24);
    const breatheBob = (!airborne && target == null && !reduced && Math.sin(t * 2.1) > 0) ? 1 : 0;
    let rows;
    if (!airborne && squashT > 0) rows = SQUASH;
    else rows = happy > 0 ? HAPPY : (blinking > 0 ? BLINK : BASE);
    const oy = 21 - rows.length + breatheBob;
    drawSprite(rows, 6, oy, dir < 0);

    // "!" burst while happy
    if (happy > 0.4) {
      ctx.fillStyle = PAL.B;
      const bx = dir < 0 ? 4 : 19;
      ctx.fillRect(bx, oy - 7, 1, 3);
      ctx.fillRect(bx, oy - 3, 1, 1);
    }

    place();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(dt);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointerdown', () => {
    if (!airborne) {
      airborne = true;
      airV = -200;
    }
    happy = 1.2;
    if (reduced) frame(0.016);
  });

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { measure(); place(); }, 120);
  });

  // wait for fonts so the layout boxes are final before measuring the floor line
  (document.fonts?.ready || Promise.resolve()).then(() => {
    measure();
    x = minX + (maxX - minX) * 0.4;
    if (reduced) {
      frame(0.016);
      return;
    }
    last = performance.now();
    requestAnimationFrame(loop);
  });
})();

// ----- articles: Zenn + Note via rss2json -----
(function () {
  const grid = document.getElementById('articleList');
  const section = document.getElementById('articles');
  if (!grid || !section) return;

  const PER_PAGE = 5;
  let loaded = false;
  let all = [];
  let page = 1;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function load() {
    if (loaded) return;
    loaded = true;

    try {
      const [zennRes, noteRes] = await Promise.all([
        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://zenn.dev/honake/feed'),
        fetch('https://api.rss2json.com/v1/api.json?rss_url=https://note.com/honake/rss'),
      ]);
      const zenn = await zennRes.json();
      const note = await noteRes.json();

      if (zenn.status === 'ok') {
        zenn.items.forEach(item => all.push({
          title: item.title,
          link: item.link,
          date: new Date(item.pubDate),
          platform: 'zenn',
          label: 'ZENN',
          image: item.enclosure && item.enclosure.link ? item.enclosure.link : null,
        }));
      }
      if (note.status === 'ok') {
        note.items.forEach(item => all.push({
          title: item.title,
          link: item.link,
          date: new Date(item.pubDate),
          platform: 'note',
          label: 'NOTE',
          image: null, // rss2json drops note thumbnails; fetched via microlink below
        }));
      }

      all.sort((a, b) => b.date - a.date);

      if (!all.length) {
        grid.innerHTML = '<div class="loading-line">No articles found.</div>';
        return;
      }

      const count = document.getElementById('articlesCount');
      if (count) count.textContent = `(${String(all.length).padStart(2, '0')})`;
      render(1);
    } catch (e) {
      grid.innerHTML = '<div class="loading-line">Failed to load articles.</div>';
      loaded = false;
    }
  }

  function render(p) {
    page = p;
    grid.innerHTML = '';
    const totalPages = Math.ceil(all.length / PER_PAGE);
    const items = all.slice((p - 1) * PER_PAGE, p * PER_PAGE);

    items.forEach(item => {
      const a = document.createElement('a');
      a.className = 'article-entry';
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      const dateStr = item.date.toLocaleDateString('en-CA');
      const thumb = item.image
        ? `<span class="thumb" data-label="${item.label}"><img src="${esc(item.image)}" alt="" loading="lazy" /></span>`
        : `<span class="thumb" data-placeholder="true" data-label="${item.label}"></span>`;

      a.innerHTML = `
        ${thumb}
        <span class="a-body">
          <span class="a-title">${esc(item.title)}</span>
          <span class="a-meta"><span class="platform-badge ${item.platform}">${item.label}</span>${dateStr}</span>
        </span>
        <span class="go" aria-hidden="true">→</span>
      `;
      grid.appendChild(a);

      // fetch OGP thumbnail for note articles
      if (!item.image && item.platform === 'note') {
        const holder = a.querySelector('.thumb');
        fetch(`https://api.microlink.io/?url=${encodeURIComponent(item.link)}&filter=image`)
          .then(res => res.json())
          .then(data => {
            const url = data?.data?.image?.url;
            if (data.status === 'success' && url) {
              item.image = url;
              const img = document.createElement('img');
              img.src = url;
              img.alt = '';
              holder.appendChild(img);
              holder.removeAttribute('data-placeholder');
            }
          }).catch(() => {});
      }
    });

    const paginator = document.getElementById('articlesPagination');
    if (!paginator) return;
    const total = Math.ceil(all.length / PER_PAGE);
    if (total > 1) {
      paginator.style.display = 'flex';
      paginator.innerHTML = '';
      for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === page ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => { if (i !== page) render(i); });
        paginator.appendChild(btn);
      }
    } else {
      paginator.style.display = 'none';
    }
  }

  // lazy-load when the section approaches the viewport
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(en => en.isIntersecting)) {
        io.disconnect();
        load();
      }
    }, { rootMargin: '600px' });
    io.observe(section);
  } else {
    load();
  }
})();

// ----- konami: a small secret for those who look -----
(function () {
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  let timer = 0;

  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const expected = SEQ[pos];
    if (e.key === expected || e.key.toLowerCase() === expected) {
      pos++;
      if (pos === SEQ.length) {
        pos = 0;
        document.body.classList.add('party');
        clearTimeout(timer);
        timer = setTimeout(() => document.body.classList.remove('party'), 12000);
      }
    } else {
      pos = (e.key === SEQ[0]) ? 1 : 0;
    }
  });
})();
