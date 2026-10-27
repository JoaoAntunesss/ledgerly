/* Ledgerly — motion layer: count-up numbers, soft page transitions and a small three.js scene behind the hero.
   Everything here is decoration; it switches itself off for prefers-reduced-motion, missing WebGL or Save-Data. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lite = reduce || (navigator.connection && navigator.connection.saveData);
  var scene = null, threeP = null;

  function loadThree() {
    if (window.THREE) return Promise.resolve();
    threeP = threeP || new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'js/three.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    return threeP;
  }
  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } }

  /* ----- numbers count up ----- */
  function countUp(el) {
    if (lite || el.dataset.cu) return; el.dataset.cu = 1;
    var t = el.textContent, m = t.match(/-?\d[\d.,\s]*\d|\d/); if (!m) return;
    var tok = m[0].replace(/\s/g, ''), dec = /[.,]\d{1,2}$/.test(tok) ? tok.length - Math.max(tok.lastIndexOf('.'), tok.lastIndexOf(',')) - 1 : 0;
    var num = parseFloat(dec ? tok.slice(0, tok.length - dec - 1).replace(/[.,]/g, '') + '.' + tok.slice(-dec) : tok.replace(/[.,]/g, ''));
    if (!isFinite(num) || Math.abs(num) < 1) return;
    var neg = t.indexOf('-') > -1 && num > 0 ? -1 : 1, loc = document.documentElement.lang || undefined, start = performance.now(), dur = 900;
    function fmt(v) { return t.replace(m[0], v.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec })); }
    (function step(now) { var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(neg * num * e); if (p < 1) requestAnimationFrame(step); else el.textContent = t; })(start);
  }

  /* ----- three.js: drifting coins behind the hero ----- */
  function stop() { if (scene) { scene.dead = true; cancelAnimationFrame(scene.raf); try { scene.r.dispose(); scene.r.domElement.remove(); } catch (e) { } scene = null; } }
  function coins(host, big) {
    var T = window.THREE, w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    var r = new T.WebGLRenderer({ alpha: true, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); r.setSize(w, h);
    var cv = r.domElement; cv.className = 'fxcanvas'; cv.style.setProperty('--o', big ? 1 : .8); host.insertBefore(cv, host.firstChild);
    var sc = new T.Scene(), cam = new T.PerspectiveCamera(40, w / h, 0.1, 100); cam.position.z = 14;
    sc.add(new T.AmbientLight(0xffffff, 1.05)); var d = new T.DirectionalLight(0xfff1c9, 1.1); d.position.set(4, 6, 8); sc.add(d); var d2 = new T.PointLight(0x7fe3c4, .5, 40); d2.position.set(-8, -3, 6); sc.add(d2);
    var geo = new T.CylinderGeometry(1, 1, .16, 40), rim = new T.CylinderGeometry(1.02, 1.02, .12, 40);
    var gold = new T.MeshStandardMaterial({ color: 0xf2c14e, metalness: .55, roughness: .38 }), dark = new T.MeshStandardMaterial({ color: 0xd9a52a, metalness: .6, roughness: .5 });
    var list = [], n = big ? 1 : (w < 600 ? 5 : 9), i;
    for (i = 0; i < n; i++) {
      var g = new T.Group(); g.add(new T.Mesh(geo, gold)); var inner = new T.Mesh(new T.CylinderGeometry(.72, .72, .19, 36), dark); g.add(inner); g.add(new T.Mesh(rim, gold));
      var s = big ? 1.9 : .45 + Math.random() * .55; g.scale.set(s, s, s);
      g.position.set(big ? 0 : (big ? 0 : (.12 + Math.random() * .88)) * 9 * (w / h) / 2 * 1.0, big ? 0 : (Math.random() * 2 - 1) * 4.5, big ? 0 : -2 - Math.random() * 6);
      g.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.userData = { sx: (Math.random() * .6 + .2) * (Math.random() < .5 ? -1 : 1), sy: Math.random() * .5 + .2, f: Math.random() * 6, a: .15 + Math.random() * .3, y0: g.position.y };
      sc.add(g); list.push(g);
    }
    var mx = 0, my = 0, onMove = function (e) { var b = host.getBoundingClientRect(); mx = ((e.clientX - b.left) / b.width - .5) * 2; my = ((e.clientY - b.top) / b.height - .5) * 2; };
    if (!big) host.addEventListener('pointermove', onMove);
    var vis = true, io = window.IntersectionObserver ? new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }) : null; if (io) io.observe(host);
    var S = { r: r, dead: false, raf: 0 }, t0 = performance.now(), first = true;
    (function tick(now) {
      if (S.dead) return; S.raf = requestAnimationFrame(tick); if (!vis || document.hidden) return; var t = (now - t0) / 1000;
      list.forEach(function (g) { var u = g.userData; g.rotation.x += u.sx * .012; g.rotation.y += u.sy * .012; if (!big) g.position.y = u.y0 + Math.sin(t * u.a + u.f) * .6; });
      cam.position.x += (mx * 1.2 - cam.position.x) * .04; cam.position.y += (-my * .8 - cam.position.y) * .04; cam.lookAt(0, 0, 0);
      if (big) { var c0 = list[0]; c0.rotation.order = 'YXZ'; c0.rotation.set(Math.PI / 2 - .25, t * 1.4, 0); c0.position.y = Math.sin(t * 1.6) * .25; }
      r.render(sc, cam); if (first) { first = false; cv.style.opacity = 1; }
    })(t0);
    scene = S;
    var ro = window.ResizeObserver ? new ResizeObserver(function () { var W = host.clientWidth, H = host.clientHeight; if (W && H) { r.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix(); } }) : null; if (ro) ro.observe(host);
  }

  function after(name) {
    stop(); if (lite) return;
    var view = document.getElementById('view');
    view.querySelectorAll('.hero .big, .kpi b').forEach(countUp);
    if (!webgl()) return;
    var host = view.querySelector('.hero'), big = false;
    if (!host) { host = view.querySelector('.welcome'); big = true; if (host && !host.querySelector('.coinhost')) { var ch = document.createElement('div'); ch.className = 'coinhost'; host.insertBefore(ch, host.firstChild); host = ch; } else host = null; }
    if (!host) return;
    loadThree().then(function () { if (document.getElementById('view').contains(host)) coins(host, big); }).catch(function () { });
  }
  window.__fx = { after: after, count: countUp };
  after();
})();
