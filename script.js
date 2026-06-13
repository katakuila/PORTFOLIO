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

  // Page transition — fade out before navigating, fade in on load (CSS)
  function isInternalPageLink(link) {
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    try {
      return new URL(href, window.location.href).origin === window.location.origin;
    } catch (err) {
      return false;
    }
  }

  document.querySelectorAll('a').forEach(function (link) {
    if (!isInternalPageLink(link)) return;
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;
      e.preventDefault();
      document.documentElement.classList.add('is-leaving');
      window.setTimeout(function () {
        window.location.href = link.href;
      }, 420);
    });
  });

  // Staggered top-to-bottom page reveal
  function initPageReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var step = 0.22;
    var delay = 0.15;
    var items = [];
    var seen = new Set();

    function shouldReveal(el) {
      return el &&
        !el.classList.contains('scroll-cue') &&
        !el.classList.contains('about-reveal');
    }

    function add(el) {
      if (!shouldReveal(el) || seen.has(el)) return;
      seen.add(el);
      items.push(el);
    }

    add(document.querySelector('.site-header'));

    var main = document.querySelector('.page-content:not(.about-reveal)');
    if (main) {
      var revealSelector = [
        '.page-label',
        '.page-title',
        '.page-title--section',
        '.page-title-release',
        '.contact-intro',
        '.artist-intro',
        '.contact-block__label',
        '.social-card',
        '.contact-card',
        '.release-card',
        '.vcard',
        '.page-placeholder-text'
      ].join(', ');

      main.querySelectorAll(revealSelector).forEach(add);
    }

    items.forEach(function (el) {
      el.classList.add('page-reveal-item');
      el.style.animationDelay = delay + 's';
      delay += step;
    });
  }

  initPageReveal();

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

  // Scroll cue + About reveal (home page only)
  var scrollCue = document.getElementById('scrollCue');
  var aboutSection = document.getElementById('about');

  function updateScrollCue() {
    if (!scrollCue || !aboutSection) return;

    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var aboutVisible = aboutSection.classList.contains('is-visible');

    if (aboutVisible || scrollY > window.innerHeight * 0.4) {
      scrollCue.classList.remove('is-shown');
    } else if (scrollY > 12) {
      scrollCue.classList.add('is-shown');
    } else {
      scrollCue.classList.remove('is-shown');
    }
  }

  if (scrollCue && aboutSection) {
    scrollCue.addEventListener('click', function () {
      aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    window.addEventListener('scroll', updateScrollCue, { passive: true });
    updateScrollCue();
  }

  if (aboutSection) {
    if ('IntersectionObserver' in window) {
      var aboutObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            aboutObserver.unobserve(entry.target);
            updateScrollCue();
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
      aboutObserver.observe(aboutSection);
    } else {
      aboutSection.classList.add('is-visible');
      updateScrollCue();
    }
  }

  // SoundCloud player (home page only, hidden — audio only)
  var scBar = document.getElementById('soundcloudBar');
  if (scBar) {
    var trackUrl = scBar.getAttribute('data-track');
    var scIframe = document.getElementById('soundcloudPlayer');

    if (trackUrl && scIframe) {
      var scParams = [
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

      scIframe.src = 'https://w.soundcloud.com/player/?' + scParams;

      var scWidget = null;
      var hasStarted = false;

      function startMusic() {
        if (!scWidget || hasStarted) return;
        scWidget.play();
        scWidget.isPaused(function (paused) {
          if (!paused) hasStarted = true;
        });
      }

      function bindFirstInteraction() {
        var events = ['click', 'touchstart', 'keydown'];
        function onInteract() {
          startMusic();
          events.forEach(function (name) {
            document.removeEventListener(name, onInteract);
          });
        }
        events.forEach(function (name) {
          document.addEventListener(name, onInteract);
        });
      }

      var scScript = document.createElement('script');
      scScript.src = 'https://w.soundcloud.com/player/api.js';
      scScript.onload = function () {
        scWidget = SC.Widget(scIframe);

        scWidget.bind(SC.Widget.Events.READY, function () {
          startMusic();
          setTimeout(startMusic, 500);
          setTimeout(startMusic, 1500);
        });

        scWidget.bind(SC.Widget.Events.PLAY, function () {
          hasStarted = true;
        });

        bindFirstInteraction();
      };
      document.head.appendChild(scScript);
    }
  }

  // Video system (advertising page)
  var thumbs = document.querySelectorAll('.video-thumb');
  if (!thumbs.length) return;

  function getVideoEmbedUrl(url) {
    if (!url) return '';

    var normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    var youtubeId = null;

    var watchMatch = normalized.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) youtubeId = watchMatch[1];

    if (!youtubeId) {
      var shortsMatch = normalized.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) youtubeId = shortsMatch[1];
    }

    if (!youtubeId) {
      var embedMatch = normalized.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) youtubeId = embedMatch[1];
    }

    if (youtubeId) {
      return 'https://www.youtube.com/embed/' + youtubeId + '?autoplay=1&rel=0';
    }

    return normalized;
  }

  var activeThumb = null;

  function resetThumb(thumb) {
    if (!thumb) return;
    var originalSrc = thumb.getAttribute('data-src');
    var poster = thumb.getAttribute('data-poster');
    thumb.innerHTML = '';
    thumb.style.cursor = 'pointer';
    if (poster) {
      var img = document.createElement('img');
      img.className = 'video-thumb__img';
      img.src = poster;
      img.alt = '';
      img.loading = 'lazy';
      thumb.appendChild(img);
    }
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
      var src = getVideoEmbedUrl(thumb.getAttribute('data-src'));
      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', src);
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
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
