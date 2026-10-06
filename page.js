// Runtime for generated drafts: menu overlay, scroll motion, word split, magnetic buttons, custom cursor.
(() => {
  const body = document.body, d = body.dataset;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const menu = document.querySelector('.menu-btn'), overlay = document.querySelector('.overlay');
  if (menu && overlay) menu.addEventListener('click', () => {
    const open = overlay.hidden; overlay.hidden = !open; body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open)); menu.textContent = open ? 'Close' : 'Menu';
  });
  if (menu && overlay) overlay.addEventListener('click', event => { if (event.target.closest('a')) menu.click(); });
  // Header menus built on <details> (section modules): choosing a link closes the panel.
  const drops = [...document.querySelectorAll('header.nav details')];
  for (const drop of drops) drop.addEventListener('click', event => { if (event.target.closest('a[href]')) drop.open = false; });
  addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (menu && overlay && !overlay.hidden) { menu.click(); menu.focus(); }
    for (const drop of drops) if (drop.open) { drop.open = false; drop.querySelector('summary')?.focus(); }
  });
  // Height of a header that stays stuck to the top, so sticky parts of sections can sit below it: top: calc(var(--nav-h, 0px) + …).
  const bar = document.querySelector('header.nav');
  if (bar) {
    const measure = () => document.documentElement.style.setProperty('--nav-h', getComputedStyle(bar).position === 'sticky' ? `${bar.offsetHeight}px` : '0px');
    measure(); addEventListener('resize', measure); if ('ResizeObserver' in window) new ResizeObserver(measure).observe(bar);
  }

  if (d.scroll === 'text-split' && !reduce) for (const el of document.querySelectorAll('.split-target')) {
    let i = 0;
    el.innerHTML = el.innerHTML.split(/(<br>)/u).map(part => part === '<br>' ? part : part.split(/(\s+)/u).map(word => word.trim() ? `<span class="w" style="animation-delay:${(i++) * 70}ms">${word}</span>` : word).join('')).join('');
  }
  if (['fade-reveal', 'parallax', 'pinned', 'text-split'].includes(d.scroll)) {
    // .is-in starts the reveal; .is-done hands opacity/transform back to the element (hover, its own transitions).
    const done = el => { el.classList.add('is-done'); el.style.transitionDelay = ''; };
    const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { const el = e.target; el.classList.add('is-in'); io.unobserve(el); el.addEventListener('transitionend', event => { if (event.target === el) done(el); }); setTimeout(done, 1600, el); } }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(el); });
  }
  if (d.scroll === 'parallax' && !reduce) {
    const items = [...document.querySelectorAll('.media img')];
    const move = () => { for (const img of items) { const r = img.parentElement.getBoundingClientRect(); const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; img.style.transform = `translateY(${(t * -40).toFixed(1)}px) scale(1.12)`; } };
    addEventListener('scroll', move, { passive: true }); move();
  }
  if (d.scroll === 'pinned') {
    for (const rail of document.querySelectorAll('.rail')) rail.addEventListener('wheel', event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && rail.scrollWidth > rail.clientWidth) { const max = rail.scrollWidth - rail.clientWidth; if ((event.deltaY > 0 && rail.scrollLeft < max) || (event.deltaY < 0 && rail.scrollLeft > 0)) { event.preventDefault(); rail.scrollLeft += event.deltaY; } } }, { passive: false });
  }
  if (d.hover === 'magnetic' && !reduce) for (const el of document.querySelectorAll('.btn')) {
    el.addEventListener('pointermove', event => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${((event.clientX - r.left) / r.width - 0.5) * 12}px,${((event.clientY - r.top) / r.height - 0.5) * 10}px)`; });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
  for (const close of document.querySelectorAll('.banner-close')) close.addEventListener('click', () => { close.closest('.banner').hidden = true; });
  const cursor = document.querySelector('.cursor');
  if (cursor && d.cursor === 'follower') cursor.classList.add('is-follower');
  if (cursor) {
    addEventListener('pointermove', event => { if (event.pointerType !== 'mouse') return; cursor.classList.add('is-on'); cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`; cursor.classList.toggle('is-hot', Boolean(event.target.closest('a,button,.work'))); });
  }
})();

// Liquid glass: real rim refraction, ported from the owner's own implementation
// (Desktop/Tools/liquid-glass). A backdrop-filter layer samples the live page behind
// the element and an SVG feDisplacementMap bends only the rim — a "border dome":
// distance from the edge by SDF, direction toward the centre, flat in the middle.
// Chromium on a desktop pointer only (the mobile path was janky); everywhere else the
// CSS blur/tint/rim fallback in page.css stays.
(() => {
  const d = document.body.dataset;
  if (d.elev !== 'liquid-glass' && d.buttonId !== 'liquid-glass') return;
  if (!/Chrome\//.test(navigator.userAgent) || !CSS.supports('backdrop-filter', 'blur(1px) url(#lens)')) return;
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches || innerWidth < 761) return;
  const NS = 'http://www.w3.org/2000/svg', EDGE = 82, cache = new Map();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  const defs = svg.appendChild(document.createElementNS(NS, 'defs')); document.body.append(svg);
  const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

  function lens(W, H, R) {
    const key = `${W}x${H}x${R}`; if (cache.has(key)) return cache.get(key);
    // The map is drawn small and stretched by the filter; the displacement field is smooth.
    const k = Math.min(1, 320 / Math.max(W, H)), w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k)), rad = Math.min(R * k, w / 2 - 1, h / 2 - 1);
    const cx = w / 2, cy = h / 2, hw = cx - 1, hh = cy - 1, half = Math.min(hw, hh);
    const aspect = Math.max(w / h, h / w), flat = 1 - (2 * half + 2) / Math.min(w, h);
    const band = 1.2 + Math.min(0.4, (aspect - 1) * 0.11) + flat * 0.15, gain = 1.25 + Math.min(0.4, (aspect - 1) * 0.09) + flat * 0.2;
    // Bars and pills keep a flat, readable middle: their bent rim is capped instead of spanning the whole height.
    const t = EDGE / 100, edge = Math.max(1, Math.min(half * 0.98, half * t ** 0.82 * band, H < 120 ? 20 * k : Infinity)), intensity = (0.25 + t * 1.35) * gain, power = 0.45 + t * 1.85;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const qx = Math.abs(x - cx) - hw + rad, qy = Math.abs(y - cy) - hh + rad;
      const dist = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rad;
      let r = 128, g = 128;
      if (dist < 0 && -dist < edge) {
        const dx = cx - x, dy = cy - y, len = Math.hypot(dx, dy) || 1, push = smooth(1 - (-dist / edge)) ** power * 108 * intensity;
        r += dx / len * push; g += dy / len * push;
      }
      const i = (y * w + x) * 4; img.data[i] = Math.max(0, Math.min(255, Math.round(r))); img.data[i + 1] = Math.max(0, Math.min(255, Math.round(g))); img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // A PNG wrapped in an SVG image loads reliably in feImage; a bare PNG data URI does not.
    const uri = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" xlink:href="${canvas.toDataURL('image/png')}"/></svg>`);
    const id = 'lg-' + cache.size, filter = document.createElementNS(NS, 'filter');
    filter.id = id; filter.setAttribute('color-interpolation-filters', 'sRGB');
    for (const [name, value] of [['x', '0%'], ['y', '0%'], ['width', '100%'], ['height', '100%']]) filter.setAttribute(name, value);
    const map = document.createElementNS(NS, 'feImage'); map.setAttribute('href', uri); map.setAttributeNS('http://www.w3.org/1999/xlink', 'href', uri); map.setAttribute('result', 'map'); map.setAttribute('preserveAspectRatio', 'none');
    const bend = document.createElementNS(NS, 'feDisplacementMap');
    for (const [name, value] of [['in', 'SourceGraphic'], ['in2', 'map'], ['xChannelSelector', 'R'], ['yChannelSelector', 'G'], ['scale', String(Math.round(Math.max(14, Math.min(72, Math.min(W, H) * 0.3))))]]) bend.setAttribute(name, value);
    filter.append(map, bend); defs.append(filter); cache.set(key, id); return id;
  }

  function dress(el) {
    const W = el.offsetWidth, H = el.offsetHeight; if (W < 24 || H < 24) return;
    const R = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, W / 2, H / 2);
    if (!el.querySelector(':scope > .lg-b')) el.prepend(Object.assign(document.createElement('span'), { className: 'lg-b', ariaHidden: 'true' }), Object.assign(document.createElement('span'), { className: 'lg-s', ariaHidden: 'true' }));
    el.classList.add('lg'); el.style.setProperty('--lens-filter', `url(#${lens(W, H, Math.round(R))})`);
  }
  // Glass on glass is forbidden (Apple HIG): buttons inside a glass nav or banner stay plain.
  const targets = [...document.querySelectorAll((d.elev === 'liquid-glass' ? '.card,.nav,.banner--pill,' : '') + '.btn')].filter(el => !(el.matches('.btn') && el.closest('.nav,.banner')));
  const seen = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { seen.unobserve(entry.target); dress(entry.target); } }, { rootMargin: '300px' });
  targets.forEach(el => seen.observe(el));
  let timer; addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => targets.filter(el => el.classList.contains('lg')).forEach(dress), 200); });
})();

// Pixel styles: every photo is drawn through a small canvas (1/6 size, nearest neighbour) so it
// reads as pixel art instead of an anti-aliased photo with a pixel font beside it.
(() => {
  if (document.body.dataset.pixelate !== 'yes') return;
  const px = img => {
    if (!img.naturalWidth || img.dataset.pixelated) return;
    const scale = 1 / 6, canvas = document.createElement('canvas');
    canvas.width = Math.max(8, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(8, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    try { img.src = canvas.toDataURL(); img.dataset.pixelated = 'yes'; } catch {}
  };
  for (const img of document.images) img.complete ? px(img) : img.addEventListener('load', () => px(img), { once: true });
})();

// Floating banners wait until the first screen has been read; a hero is never covered.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || !('IntersectionObserver' in window)) { document.body.classList.add('past-hero'); return; }
  new IntersectionObserver(([entry]) => document.body.classList.toggle('past-hero', !entry.isIntersecting), { threshold: 0.15 }).observe(hero);
})();
