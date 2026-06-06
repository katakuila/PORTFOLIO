(function () {
  // Active nav link for current page
  var navLinks = document.querySelectorAll('.site-nav a');
  var pathParts = window.location.pathname.split('/').filter(Boolean);
  var currentPage = pathParts.length ? pathParts[pathParts.length - 1] : 'index.html';

  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    var linkPage = href.split('/').filter(Boolean).pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  // Hamburger menu (mobile / tablet)
  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('.nav-toggle');
  var siteNav = document.getElementById('site-nav');

  function closeNav() {
    if (!header || !navToggle) return;
    header.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  }

  if (header && navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = !header.classList.contains('is-open');
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  // Radial visualizer (home page only)
  var canvas = document.getElementById('radialCanvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var BAR_COUNT = 64;
    var time = 0;
    var colorStops = [
      { pos: 0, color: [220, 40, 40] },
      { pos: 0.2, color: [230, 130, 20] },
      { pos: 0.45, color: [20, 200, 200] },
      { pos: 0.7, color: [230, 130, 20] },
      { pos: 1, color: [220, 40, 40] }
    ];

    function lerpColor(t) {
      for (var i = 0; i < colorStops.length - 1; i++) {
        var a = colorStops[i];
        var b = colorStops[i + 1];
        if (t >= a.pos && t <= b.pos) {
          var f = (t - a.pos) / (b.pos - a.pos);
          return a.color.map(function (v, j) {
            return Math.round(v + f * (b.color[j] - v));
          });
        }
      }
      return colorStops[colorStops.length - 1].color;
    }

    function getHeight(i, t) {
      var norm = i / BAR_COUNT;
      var envelope = Math.sin(norm * Math.PI) * 0.85 + 0.15;
      var wave1 = Math.sin(norm * 8 - t * 2.5) * 0.4;
      var wave2 = Math.sin(norm * 14 + t * 1.8) * 0.25;
      var wave3 = Math.sin(norm * 3 - t * 0.9) * 0.35;
      var noise = (Math.sin(i * 17.3 + t * 3.7) * 0.5 + 0.5) * 0.15;
      return Math.max(0.04, (0.5 + wave1 + wave2 + wave3 + noise) * envelope);
    }

    function draw() {
      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      time += 0.018;
      var cx = W / 2;
      var cy = H / 2;
      var rBase = Math.min(W, H) * 0.22;
      for (var i = 0; i < BAR_COUNT; i++) {
        var angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        var h = getHeight(i, time) * rBase * 1.1;
        var x1 = cx + Math.cos(angle) * rBase;
        var y1 = cy + Math.sin(angle) * rBase;
        var x2 = cx + Math.cos(angle) * (rBase + h);
        var y2 = cy + Math.sin(angle) * (rBase + h);
        var rgb = lerpColor(i / (BAR_COUNT - 1));
        ctx.strokeStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      requestAnimationFrame(draw);
    }

    draw();
  }

  // SoundCloud player (home page only)
  var scBar = document.getElementById('soundcloudBar');
  if (scBar) {
    var trackUrl = scBar.getAttribute('data-track');
    var scIframe = document.getElementById('soundcloudPlayer');
    var audioHint = document.getElementById('audioHint');
    var audioPlayBtn = document.getElementById('audioPlayBtn');
    var homeAudio = document.querySelector('.home-audio');
    var isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    if (trackUrl && scIframe) {
      var embedUrl = 'https://w.soundcloud.com/player/?' + [
        'url=' + encodeURIComponent(trackUrl),
        'auto_play=true',
        'hide_related=true',
        'show_comments=false',
        'show_user=false',
        'show_reposts=false',
        'show_teaser=false',
        'visual=false',
        'color=ffffff'
      ].join('&');

      var scWidget = null;
      var scReady = false;
      var iframeLoaded = false;
      var audioStarted = false;

      function hideAudioHint() {
        if (audioHint) audioHint.classList.add('is-hidden');
      }

      function markPlaying() {
        audioStarted = true;
        hideAudioHint();
        if (homeAudio) homeAudio.classList.add('is-playing');
        if (audioPlayBtn) {
          audioPlayBtn.classList.remove('is-loading');
          audioPlayBtn.setAttribute('aria-label', 'Music playing');
        }
      }

      function initSoundCloudWidget() {
        if (typeof SC === 'undefined') {
          setTimeout(initSoundCloudWidget, 100);
          return;
        }

        scWidget = SC.Widget(scIframe);
        scReady = false;

        scWidget.bind(SC.Widget.Events.READY, function () {
          scReady = true;
          if (!isTouchDevice) {
            scWidget.play();
          }
          scWidget.isPaused(function (paused) {
            if (!paused) markPlaying();
          });
        });

        scWidget.bind(SC.Widget.Events.PLAY, markPlaying);

        scWidget.bind(SC.Widget.Events.PAUSE, function () {
          if (homeAudio) homeAudio.classList.remove('is-playing');
          if (audioPlayBtn) audioPlayBtn.setAttribute('aria-label', 'Play music');
          audioStarted = false;
        });
      }

      function loadAndPlay() {
        if (audioStarted) return;
        if (audioPlayBtn) audioPlayBtn.classList.add('is-loading');

        if (!iframeLoaded) {
          iframeLoaded = true;
          scIframe.src = embedUrl;
          initSoundCloudWidget();
          return;
        }

        if (scWidget && scReady) {
          scWidget.play();
        }
      }

      var lastPlayTap = 0;
      function onPlayGesture(e) {
        var now = Date.now();
        if (now - lastPlayTap < 400) return;
        lastPlayTap = now;
        if (e.type === 'touchstart') e.preventDefault();
        loadAndPlay();
      }

      if (isTouchDevice) {
        if (audioPlayBtn) {
          audioPlayBtn.addEventListener('touchstart', onPlayGesture, { passive: false });
          audioPlayBtn.addEventListener('click', function (e) {
            e.preventDefault();
            loadAndPlay();
          });
        }
        if (canvas) {
          canvas.addEventListener('touchstart', onPlayGesture, { passive: false });
          canvas.addEventListener('click', loadAndPlay);
        }
      } else {
        iframeLoaded = true;
        scIframe.src = embedUrl;
        initSoundCloudWidget();
        if (audioPlayBtn) audioPlayBtn.hidden = true;
        hideAudioHint();
      }
    }
  }

  // Video system (advertising page)
  var thumbs = document.querySelectorAll('.video-thumb');
  if (!thumbs.length) return;

  var activeThumb = null;

  function resetThumb(thumb) {
    if (!thumb) return;
    var originalSrc = thumb.getAttribute('data-src');
    thumb.innerHTML = '';
    thumb.style.cursor = 'pointer';
    var playBtn = document.createElement('div');
    playBtn.className = 'play-btn';
    playBtn.innerHTML = '<svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M2 2L16 10L2 18V2Z" fill="white" opacity="0.9"/></svg>';
    thumb.appendChild(playBtn);
    thumb.setAttribute('data-src', originalSrc);
  }

  function stopActiveVideo() {
    if (activeThumb) {
      resetThumb(activeThumb);
      activeThumb = null;
    }
  }

  function attachThumbEvents(thumb) {
    thumb.addEventListener('mouseenter', function () {
      var btn = thumb.querySelector('.play-btn');
      if (btn) {
        btn.style.background = 'rgba(255,255,255,0.22)';
        btn.style.transform = 'scale(1.1)';
      }
    });
    thumb.addEventListener('mouseleave', function () {
      var btn = thumb.querySelector('.play-btn');
      if (btn) {
        btn.style.background = 'rgba(255,255,255,0.12)';
        btn.style.transform = 'scale(1)';
      }
    });
    thumb.addEventListener('click', function () {
      if (thumb === activeThumb) return;
      stopActiveVideo();
      var src = thumb.getAttribute('data-src');
      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', src);
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('allowfullscreen', '');
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
      thumb.innerHTML = '';
      thumb.style.cursor = 'default';
      thumb.appendChild(iframe);
      activeThumb = thumb;
    });
  }

  thumbs.forEach(attachThumbEvents);

  document.querySelectorAll('.vcard').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      card.style.border = '0.5px solid rgba(255,255,255,0.22)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.border = '0.5px solid rgba(255,255,255,0.08)';
    });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopActiveVideo();
  });
})();
