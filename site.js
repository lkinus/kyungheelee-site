(function () {
  var dots = document.querySelectorAll('.dots a');
  var targets = [];
  dots.forEach(function (a) { targets.push(document.getElementById(a.getAttribute('href').slice(1))); });
  function update() {
    var y = window.scrollY + 1, cur = 0;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    dots.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }

  // TV 목업: 페이지를 열 때는 아무것도 재생하지 않는다. 스크롤해서 "Sling TV OVERHAUL" 헤더가 화면에 들어오면
  // 1.5초 뒤에 음소거 예고편을 처음부터 재생하고 배경 사진 위로 페이드인한다 (모션 줄이기 설정이면 사진만).
  var tv = document.querySelector('.tvscr');
  if (tv && 'IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var trigger = document.getElementById('overhaul') || tv.parentNode;
    new IntersectionObserver(function (es, ob) {
      if (!es[0].isIntersecting) return;
      ob.disconnect();
      var id = tv.getAttribute('data-yt'), box = tv.querySelector('.vid');
      var f = document.createElement('iframe');
      // autoplay=0: 로드만 해 두고, 1.5초가 지난 뒤에 재생 명령을 보낸다
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=0&mute=1&controls=0' +
        '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1';
      f.allow = 'autoplay; encrypted-media'; f.title = 'The Walking Dead preview'; f.tabIndex = -1;
      var t0 = Date.now(), ready = false, started = false;
      function cmd(fn, args) { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); }
      function start() {
        if (started || !ready || Date.now() - t0 < 1500) return;
        started = true; cmd('mute'); cmd('seekTo', [0, true]); cmd('playVideo');
      }
      function onReady() { ready = true; start(); }
      setTimeout(start, 1500);
      // 반복은 YouTube 의 loop/playlist 대신 직접 처리한다 (playlist 모드는 이전/다음 버튼을 띄우고,
      // 영상이 끝까지 가면 "다시 재생" 아이콘이 화면 가운데 뜨므로 끝나기 직전에 처음으로 돌린다)
      window.addEventListener('message', function (e) {
        if (e.source !== f.contentWindow) return;
        var d; try { d = JSON.parse(e.data); } catch (_) { return; }
        var inf = d.info || {};
        if (d.event === 'onReady') onReady();
        var st = d.event === 'onStateChange' ? d.info : (d.event === 'infoDelivery' ? inf.playerState : undefined);
        if (st === 1 && started && !box.classList.contains('on')) setTimeout(function () { box.classList.add('on'); }, 250);
        if (d.event === 'onStateChange' && d.info === 0) { box.classList.remove('on'); cmd('seekTo', [0, true]); cmd('playVideo'); }
        if (d.event === 'infoDelivery' && inf.duration && inf.currentTime && inf.currentTime > inf.duration - 1.2) cmd('seekTo', [0, true]);
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
