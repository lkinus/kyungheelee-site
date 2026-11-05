(function () {
  var dots = document.querySelectorAll('.dots a');
  var targets = [];
  dots.forEach(function (a) { targets.push(document.getElementById(a.getAttribute('href').slice(1))); });
  function update() {
    var y = window.scrollY + 1, cur = 0;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    dots.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }

  // TV 목업 영상.
  //  - 페이지를 열 때는 아무것도 재생하지 않는다.
  //  - 스크롤해서 TV 화면이 보이기 시작하면 (위에서 내려오든 아래에서 올라오든) 1.5초 뒤에 음소거 예고편을 재생한다
  //    (배경 사진 위로 페이드인). 영상은 계속 반복된다. 소리는 항상 꺼져 있다.
  //  - TV 화면(사진)을 클릭하면 일시정지 / 재생이 번갈아 된다. 일시정지하면 영상은 사진으로 페이드아웃된다
  //    (YouTube 가 가운데에 띄우는 일시정지 아이콘이 보이지 않게).
  //  - TV 화면이 화면 밖으로 나가거나 다른 탭으로 가면 영상을 숨기고 멈췄다가, 돌아오면 이어서 재생한다.
  //  - "모션 줄이기" 설정이면 자동 재생은 하지 않고, 클릭했을 때만 재생한다.
  var tv = document.querySelector('.tvscr');
  if (tv && 'IntersectionObserver' in window) {
    var fig = tv.closest('figure') || tv.parentNode;
    var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var booted = false, api = null;
    // 이미지가 화면 가운데 즈음에 있을 때(중심이 화면 중심에서 화면 높이의 20% 안)만 '보이는 것'으로 본다
    function watch(el, cb) {
      var last = null, busy = false;
      function chk() {
        busy = false;
        var r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        var on = r.bottom > 0 && r.top < vh && Math.abs((r.top + r.bottom) / 2 - vh / 2) < vh * 0.2;
        if (on !== last) { last = on; cb(on); }
      }
      function sched() { if (!busy) { busy = true; setTimeout(chk, 60); } }
      window.addEventListener('scroll', sched, { passive: true });
      window.addEventListener('resize', sched);
      setInterval(sched, 500);   // 스크롤 이벤트가 드물게 오는 환경 대비
      chk();
    }
    function boot(now) {
      if (booted) return; booted = true;
      var src = tv.getAttribute('data-vid'), box = tv.querySelector('.vid');
      var v = document.createElement('video');
      v.src = src; v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.tabIndex = -1;
      v.setAttribute('aria-hidden', 'true');
      box.appendChild(v);
      var since = now ? 0 : Date.now(), tvVisible = !!now, away = false, paused = false, started = false;
      function play() { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      function start() { if (started || !tvVisible || Date.now() - since < 800) return; started = true; play(); }
      v.addEventListener('timeupdate', function () { if (v.currentTime > 25) v.currentTime = 0; });   // 처음부터 25초만 반복
      v.addEventListener('ended', function () { v.currentTime = 0; if (!paused && !away) play(); });
      v.addEventListener('playing', function () { if (!away && !paused) box.classList.add('on'); });
      var poll = setInterval(function () { if (started) clearInterval(poll); else start(); }, 200);
      function goAway() { if (!started || away) return; away = true; box.classList.remove('on'); if (!paused) v.pause(); }
      function comeBack() { if (!away || !tvVisible || document.hidden) return; away = false; if (!paused) play(); }
      // TV 화면이 보이지 않는 동안에는 영상을 숨기고 멈춰 두었다가, 다시 보이면 이어서 재생한다
      watch(tv.parentNode, function (vis) {
        if (vis && !tvVisible) { tvVisible = true; if (!started) since = Math.max(since, Date.now()); }
        if (!vis) tvVisible = false;
        if (vis) comeBack(); else goAway();
      });
      document.addEventListener('visibilitychange', function () { if (document.hidden) goAway(); else comeBack(); });
      // 클릭: 아직 시작 전이면 바로 시작, 재생 중이면 일시정지(사진으로 페이드아웃), 일시정지 중이면 재생
      api = { click: function () {
        if (!started) { tvVisible = true; since = 0; start(); return; }
        if (!paused) { paused = true; box.classList.remove('on'); v.pause(); }
        else { paused = false; play(); }
      } };
    }
    fig.style.cursor = 'pointer';
    fig.addEventListener('click', function () { if (!booted) boot(true); else api.click(); });
    if (!reduced) {
      // TV 화면이 보이기 시작하면(위에서 내려오든 아래에서 올라오든) 영상을 준비하고 1.5초 뒤에 재생한다
      watch(tv.parentNode, function (on) { if (on && !booted) boot(false); });
    }
  }

  // 홈 두 번째 목업(노트북): 화면이 보이면 1.5초 뒤 음소거 영상을 반복 재생하고, 화면 밖이면 멈춘다. 클릭하면 일시정지/재생.
  (function () {
  var bw = document.querySelector('.bws');
  if (bw && bw.getAttribute('data-vid') && 'IntersectionObserver' in window) {
    var bfig = bw.closest('figure') || bw.parentNode;
    var breduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var booted = false, api = null;
    function watch(el, cb) {
      var last = null, busy = false;
      function chk() {
        busy = false;
        var r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        var on = r.bottom > 0 && r.top < vh && Math.abs((r.top + r.bottom) / 2 - vh / 2) < vh * 0.2;
        if (on !== last) { last = on; cb(on); }
      }
      function sched() { if (!busy) { busy = true; setTimeout(chk, 60); } }
      window.addEventListener('scroll', sched, { passive: true });
      window.addEventListener('resize', sched);
      setInterval(sched, 500);   // 스크롤 이벤트가 드물게 오는 환경 대비
      chk();
    }
    function boot(now) {
      if (booted) return; booted = true;
      var box = bw.querySelector('.vid');
      var v = document.createElement('video');
      v.src = bw.getAttribute('data-vid'); v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto'; v.tabIndex = -1;
      v.setAttribute('aria-hidden', 'true');
      box.appendChild(v);
      var since = now ? 0 : Date.now(), vis = !!now, away = false, paused = false, started = false;
      function play() { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      function start() { if (started || !vis || Date.now() - since < 800) return; started = true; play(); }
      v.addEventListener('timeupdate', function () { if (v.currentTime > 25) v.currentTime = 0; });   // 처음부터 25초만 반복
      v.addEventListener('ended', function () { v.currentTime = 0; if (!paused && !away) play(); });
      v.addEventListener('playing', function () { if (!away && !paused) box.classList.add('on'); });
      var poll = setInterval(function () { if (started) clearInterval(poll); else start(); }, 200);
      function goAway() { if (!started || away) return; away = true; box.classList.remove('on'); if (!paused) v.pause(); }
      function comeBack() { if (!away || !vis || document.hidden) return; away = false; if (!paused) play(); }
      watch(bw.parentNode, function (on) {
        if (on && !vis) { vis = true; if (!started) since = Math.max(since, Date.now()); }
        if (!on) vis = false;
        if (on) comeBack(); else goAway();
      });
      document.addEventListener('visibilitychange', function () { if (document.hidden) goAway(); else comeBack(); });
      api = { click: function () {
        if (!started) { vis = true; since = 0; start(); return; }
        if (!paused) { paused = true; box.classList.remove('on'); v.pause(); }
        else { paused = false; play(); }
      } };
    }
    bfig.style.cursor = 'pointer';
    bfig.addEventListener('click', function () { if (!booted) boot(true); else api.click(); });
    if (!breduced) {
      watch(bw.parentNode, function (on) { if (on && !booted) boot(false); });
    }
  }
  })();

  // 홈 세 번째 목업(태블릿·폰): 영상의 시작 프레임이 바로 보이고, 화면 가운데 즈음에 있을 때만 재생한다. 클릭하면 일시정지/재생.
  (function () {
  var wrap = document.querySelector('.tbwrap');
  if (wrap && wrap.getAttribute('data-vid')) {
    var tfig = wrap.closest('figure') || wrap.parentNode;
    var treduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var items = [].slice.call(wrap.querySelectorAll('.tbw')).map(function (box) {
      var v = document.createElement('video');
      v.src = wrap.getAttribute('data-vid'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.tabIndex = -1;
      v.setAttribute('aria-hidden', 'true'); v.setAttribute('playsinline', '');
      box.querySelector('.vid').appendChild(v);
      var frac = parseFloat(box.getAttribute('data-start')) || 0;
      var it = { v: v, play: false };
      var sought = false;
      function seek() { if (v.duration && isFinite(v.duration)) { v.currentTime = v.duration * frac; sought = true; } }
      v.addEventListener('loadedmetadata', seek);
      v.addEventListener('canplay', function () { if (!sought) seek(); });
      function loopSeg() { var s = v.duration * frac; if (v.duration && v.currentTime > s + 25) v.currentTime = s; }   // 시작 지점부터 25초만 반복
      v.addEventListener('timeupdate', loopSeg);
      v.addEventListener('ended', function () { seek(); if (it.play) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
      return it;
    });
    var focus = false, userPaused = false;
    function apply() {
      items.forEach(function (it) {
        var want = focus && !userPaused && !treduced;
        if (want && it.v.paused) { var p = it.v.play(); if (p && p.catch) p.catch(function () {}); }
        if (!want && !it.v.paused) it.v.pause();
        it.play = want;
      });
    }
    function watch(el, cb) {
      var last = null, busy = false;
      function chk() {
        busy = false;
        var r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        var on = r.bottom > 0 && r.top < vh && Math.abs((r.top + r.bottom) / 2 - vh / 2) < vh * 0.2;
        if (on !== last) { last = on; cb(on); }
      }
      function sched() { if (!busy) { busy = true; setTimeout(chk, 60); } }
      window.addEventListener('scroll', sched, { passive: true });
      window.addEventListener('resize', sched);
      setInterval(sched, 500);
      chk();
    }
    watch(tfig, function (on) { focus = on; apply(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { var f = focus; focus = false; apply(); focus = f; } else apply(); });
    tfig.style.cursor = 'pointer';
    tfig.addEventListener('click', function () { userPaused = !userPaused; if (!userPaused) focus = true; apply(); });
  }
  })();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

(function () {
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  var items = [].slice.call(document.querySelectorAll('.hero h2.name, .hero .intro, .head > h2, .head > .info, figure.shot'));
  var fade = [].slice.call(document.querySelectorAll('.hero .links'));   /* 위치를 transform 으로 잡는 요소는 투명도만 */
  var all = items.concat(fade);
  all.forEach(function (e) { e.style.transition = 'none'; });   /* 숨기는 순간에는 전환 없이 (보였다 사라지는 깜빡임 방지) */
  items.forEach(function (e) { e.classList.add('rv'); });
  fade.forEach(function (e) { e.classList.add('rvo'); });
  void document.body.offsetHeight;
  all.forEach(function (e) { e.style.transition = ''; });
  var io = new IntersectionObserver(function (es) {
    var vis = es.filter(function (x) { return x.isIntersecting; }).sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
    vis.forEach(function (x, i) { x.target.style.setProperty('--rvd', Math.min(i, 4) * 90 + 'ms'); x.target.classList.add('in'); io.unobserve(x.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  items.concat(fade).forEach(function (e) { io.observe(e); });
})();
