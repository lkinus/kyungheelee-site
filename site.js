(function () {
  var dots = document.querySelectorAll('.dots a');
  var targets = [];
  dots.forEach(function (a) { targets.push(document.getElementById(a.getAttribute('href').slice(1))); });
  function update() {
    var y = window.scrollY + 1, cur = 0;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
    dots.forEach(function (a, i) { a.classList.toggle('on', i === cur); });
  }

  // TV 목업: 화면에 들어오면 음소거 예고편을 로드하고, 1.5~2초 뒤 배경 사진 위로 페이드인 (모션 줄이기 설정이면 사진만)
  var tv = document.querySelector('.tvscr');
  if (tv && 'IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    new IntersectionObserver(function (es, ob) {
      if (!es[0].isIntersecting) return;
      ob.disconnect();
      var id = tv.getAttribute('data-yt'), box = tv.querySelector('.vid');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0' +
        '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1';
      f.allow = 'autoplay; encrypted-media'; f.title = 'The Walking Dead preview'; f.tabIndex = -1;
      // 플레이어 UI(재생/앞/뒤 버튼 등)가 잠깐 보이지 않도록, 실제로 재생이 시작된 뒤 2초 지나서 페이드인
      var shown = false;
      function show() { if (shown) return; shown = true; setTimeout(function () { box.classList.add('on'); }, 2000); }
      function cmd(fn, args) { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); }
      // 반복은 YouTube 의 loop/playlist 대신 직접 처리 (playlist 모드는 이전/다음 버튼과 재생 오버레이를 띄움)
      window.addEventListener('message', function (e) {
        if (e.source !== f.contentWindow) return;
        var d; try { d = JSON.parse(e.data); } catch (_) { return; }
        var inf = d.info || {};
        if ((d.event === 'onStateChange' && d.info === 1) || (d.event === 'infoDelivery' && inf.playerState === 1)) show();
        if (d.event === 'onStateChange' && d.info === 0) { cmd('seekTo', [0, true]); cmd('playVideo'); }
        if (d.event === 'infoDelivery' && inf.duration && inf.currentTime && inf.currentTime > inf.duration - 0.7) cmd('seekTo', [0, true]);
      });
      f.onload = function () {
        f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
        setTimeout(show, 8000);   // 메시지를 못 받는 경우 대비
      };
      box.appendChild(f);
    }, { threshold: 0.5 }).observe(tv.parentNode);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
