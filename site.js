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
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id +
        '&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&fs=0';
      f.allow = 'autoplay; encrypted-media'; f.title = 'The Walking Dead preview'; f.tabIndex = -1;
      f.onload = function () { setTimeout(function () { box.classList.add('on'); }, 2500); };
      box.appendChild(f);
    }, { threshold: 0.5 }).observe(tv.parentNode);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
