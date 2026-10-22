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
  //  - 스크롤해서 "Sling TV OVERHAUL" 헤더가 보이고 TV 화면도 화면에 들어오면 1.5초 뒤에 음소거 예고편을 재생한다
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
    function boot(now) {
      if (booted) return; booted = true;
      var id = tv.getAttribute('data-yt'), box = tv.querySelector('.vid');
      var f = document.createElement('iframe');
      // autoplay=0: 로드만 해 두고, 조건이 맞으면 재생 명령을 보낸다
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=0&mute=1&controls=0' +
        '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1';
      f.allow = 'autoplay; encrypted-media'; f.title = 'The Walking Dead preview'; f.tabIndex = -1;
      var dur = 0, since = now ? 0 : Date.now(), ready = false, started = false, fading = false, tvVisible = !!now,
          away = false, paused = false, lastSeek = 0;
      function cmd(fn, args) { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); }
      function start() {
        if (started || !ready || !tvVisible || Date.now() - since < 1500) return;
        started = true; cmd('mute'); cmd('seekTo', [0, true]); cmd('playVideo');
      }
      function onReady() { ready = true; start(); }
      var poll = setInterval(function () { if (started) clearInterval(poll); else start(); }, 200);
      function goAway() { if (!started || away) return; away = true; box.classList.remove('on'); if (!paused) cmd('pauseVideo'); }
      function comeBack() {
        if (!away || !tvVisible || document.hidden) return;
        away = false; if (!paused) setTimeout(function () { cmd('playVideo'); }, 600);
      }
      // TV 화면이 보이지 않는 동안에는 영상을 숨기고 멈춰 두었다가, 다시 보이면 이어서 재생한다.
      // (브라우저·YouTube 가 화면 밖 영상을 알아서 멈추면 재생/일시정지 아이콘이 가운데 뜨기 때문에 직접 처리)
      new IntersectionObserver(function (e2) {
        var vis = e2[0].isIntersecting;
        if (vis && !tvVisible) { tvVisible = true; if (!started) since = Math.max(since, Date.now()); }
        if (!vis) tvVisible = false;
        if (vis) comeBack(); else goAway();
      }, { threshold: 0.4 }).observe(tv.parentNode);
      // 다른 탭으로 갔다 오는 경우도 같은 방식으로 처리한다
      document.addEventListener('visibilitychange', function () { if (document.hidden) goAway(); else comeBack(); });
      // 반복은 YouTube 의 loop/playlist 대신 직접 처리한다 (playlist 모드는 이전/다음 버튼을 띄우고, 영상이 끝까지 가면
      // "다시 재생" 아이콘이 가운데 뜨므로 끝나기 직전에 처음으로 돌린다)
      window.addEventListener('message', function (e) {
        if (e.source !== f.contentWindow) return;
        var d; try { d = JSON.parse(e.data); } catch (_) { return; }
        var inf = d.info || {};
        if (d.event === 'onReady') onReady();
        var st = d.event === 'onStateChange' ? d.info : (d.event === 'infoDelivery' ? inf.playerState : undefined);
        // 재생이 시작(또는 재개)되면 YouTube 가 가운데에 잠깐 띄우는 아이콘이 사라질 때까지 숨겨 두었다가 나타나게 한다
        if (st === 1 && started && !away && !paused && !box.classList.contains('on') && !fading) {
          fading = true; setTimeout(function () { if (!away && !paused) box.classList.add('on'); fading = false; }, 2000);
        }
        if (d.event === 'onStateChange' && d.info === 0 && !paused) { box.classList.remove('on'); cmd('seekTo', [0, true]); cmd('playVideo'); }
        if (inf.duration) dur = inf.duration;   // duration 과 currentTime 은 다른 메시지로 오므로 따로 기억해 둔다
        if (started && !away && !paused && dur && inf.currentTime && inf.currentTime > dur - 1.2 && Date.now() - lastSeek > 3000) { lastSeek = Date.now(); cmd('seekTo', [0, true]); }
      });
      f.onload = function () {
        f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        setTimeout(onReady, 1500);   // onReady 메시지를 못 받는 경우 대비 (재생이 시작되기 전에는 화면에 나오지 않음)
      };
      box.appendChild(f);
      // 클릭: 아직 시작 전이면 바로 시작, 재생 중이면 일시정지(사진으로 페이드아웃), 일시정지 중이면 재생
      api = { click: function () {
        if (!started) { tvVisible = true; since = 0; start(); return; }
        if (!paused) { paused = true; box.classList.remove('on'); cmd('pauseVideo'); }
        else { paused = false; cmd('playVideo'); }
      } };
    }
    fig.style.cursor = 'pointer';
    fig.addEventListener('click', function () { if (!booted) boot(true); else api.click(); });
    if (!reduced) {
      var trigger = document.getElementById('overhaul') || tv.parentNode;
      new IntersectionObserver(function (es, ob) {
        if (!es[0].isIntersecting) return;
        ob.disconnect(); boot(false);
      }, { threshold: 0.3 }).observe(trigger);
    }
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
