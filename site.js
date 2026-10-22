(function () {
  var dots = document.querySelectorAll('.dots a');
  var targets = [];
  dots.forEach(function (a) { targets.push(document.getElementById(a.getAttribute('href').slice(1))); });
  function update() {
    var y = window.scrollY + 1, cur = 0;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    dots.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }

  // TV 목업: 페이지를 열 때는 아무것도 재생하지 않는다. 스크롤해서 "Sling TV OVERHAUL" 헤더가 화면에 들어오고 TV 화면도 보이면
  // 1.5초 뒤에 음소거 예고편을 한 번만 재생한다 (배경 사진 위로 페이드인, 끝나면 사진으로 페이드아웃하고 멈춤).
  // 모션 줄이기 설정이면 사진만 보여 준다.
  var tv = document.querySelector('.tvscr');
  if (tv && 'IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var trigger = document.getElementById('overhaul') || tv.parentNode;
    new IntersectionObserver(function (es, ob) {
      if (!es[0].isIntersecting) return;
      ob.disconnect();
      var id = tv.getAttribute('data-yt'), box = tv.querySelector('.vid');
      var f = document.createElement('iframe');
      // autoplay=0: 로드만 해 두고, 조건이 맞으면 재생 명령을 보낸다
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=0&mute=1&controls=0' +
        '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1';
      f.allow = 'autoplay; encrypted-media'; f.title = 'The Walking Dead preview'; f.tabIndex = -1;
      var dur = 0, since = Date.now(), ready = false, started = false, done = false, fading = false, tvVisible = false, away = false;
      function cmd(fn, args) { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); }
      function start() {
        if (started || done || !ready || !tvVisible || Date.now() - since < 1500) return;
        started = true; cmd('mute'); cmd('seekTo', [0, true]); cmd('playVideo');
      }
      function onReady() { ready = true; start(); }
      var poll = setInterval(function () { if (started || done) clearInterval(poll); else start(); }, 200);
      // TV 화면이 보이지 않는 동안에는 영상을 숨기고 멈춰 두었다가, 다시 보이면 이어서 재생한다.
      // (브라우저·YouTube 가 화면 밖 영상을 알아서 멈추면 재생/일시정지 아이콘이 가운데 뜨기 때문에 직접 처리)
      function goAway() { if (!started || done || away) return; away = true; box.classList.remove('on'); cmd('pauseVideo'); }
      function comeBack() {
        if (!away || done || !tvVisible || document.hidden) return;
        away = false; setTimeout(function () { if (!done) cmd('playVideo'); }, 600);
      }
      new IntersectionObserver(function (e2) {
        var vis = e2[0].isIntersecting;
        if (vis && !tvVisible) { tvVisible = true; if (!started) since = Math.max(since, Date.now()); }
        if (!vis) tvVisible = false;
        if (vis) comeBack(); else goAway();
      }, { threshold: 0.4 }).observe(tv.parentNode);
      // 다른 탭으로 갔다 오는 경우도 같은 방식으로 처리한다
      document.addEventListener('visibilitychange', function () { if (document.hidden) goAway(); else comeBack(); });
      function finish() {
        if (done) return; done = true;
        box.classList.remove('on');
        setTimeout(function () { cmd('pauseVideo'); }, 1800);
      }
      window.addEventListener('message', function (e) {
        if (e.source !== f.contentWindow) return;
        var d; try { d = JSON.parse(e.data); } catch (_) { return; }
        var inf = d.info || {};
        if (d.event === 'onReady') onReady();
        if (done) return;
        var st = d.event === 'onStateChange' ? d.info : (d.event === 'infoDelivery' ? inf.playerState : undefined);
        // 재생이 시작(또는 재개)되면 YouTube 가 가운데에 잠깐 띄우는 아이콘이 사라질 때까지 숨겨 두었다가 나타나게 한다
        if (st === 1 && started && !away && !box.classList.contains('on') && !fading) { fading = true; setTimeout(function () { if (!done && !away) box.classList.add('on'); fading = false; }, 2200); }
        if (d.event === 'onStateChange' && d.info === 0) finish();
        if (inf.duration) dur = inf.duration;   // duration 과 currentTime 은 다른 메시지로 오므로 따로 기억해 둔다
        if (dur && inf.currentTime && inf.currentTime > dur - 2.6) finish();
      });
      f.onload = function () {
        f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        setTimeout(onReady, 1500);   // onReady 메시지를 못 받는 경우 대비 (재생이 시작되기 전에는 화면에 나오지 않음)
      };
      box.appendChild(f);
    }, { threshold: 0.3 }).observe(trigger);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
