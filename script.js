(function () {
  var pageRoot = document.getElementById('page-root');
  var isNavigating = false;
  var navGraceUntil = 0;

  function inNavigationGrace() {
    return isNavigating || performance.now() < navGraceUntil;
  }

  function beginNavigationGrace(extraMs) {
    navGraceUntil = performance.now() + (extraMs || 900);
  }

  function getSiteRoot() {
    var path = window.location.pathname;
    var pagesIndex = path.indexOf('/pages/');
    if (pagesIndex !== -1) return path.slice(0, pagesIndex);
    var lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) return '';
    return path.slice(0, lastSlash);
  }

  function resolveInternalUrl(link) {
    var href = link.getAttribute('href');
    if (!href) return window.location.href;
    if (href.charAt(0) === '/') {
      return new URL(href, window.location.origin).href;
    }
    var root = getSiteRoot();
    var base = window.location.origin + (root ? root + '/' : '/');
    return new URL(href, base).href;
  }

  function getCurrentPageName() {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts.length ? pathParts[pathParts.length - 1] : 'index.html';
  }

  function updateActiveNav() {
    var currentPage = getCurrentPageName();
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      var href = link.getAttribute('href');
      var linkPage = href.split('/').filter(Boolean).pop();
      link.classList.toggle('active', linkPage === currentPage);
    });
  }

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

  function resolvePageUrls(container, pageUrl) {
    var base = pageUrl.replace(/[^/]*$/, '');
    container.querySelectorAll('[src], [href]').forEach(function (el) {
      ['src', 'href'].forEach(function (attr) {
        var value = el.getAttribute(attr);
        if (!value) return;
        if (/^(https?:|\/|mailto:|tel:|javascript:|#)/i.test(value)) return;
        el.setAttribute(attr, new URL(value, base).href);
      });
    });
  }

  function destroyCurrentPage() {
    if (window.__portfolioPage && typeof window.__portfolioPage.cleanup === 'function') {
      window.__portfolioPage.cleanup();
    }
    window.__portfolioPage = null;
  }

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
        '.logo-card',
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

  function initNav() {
    var header = document.querySelector('.site-header');
    var navToggle = document.querySelector('.nav-toggle');
    var siteNav = document.getElementById('site-nav');
    if (!header || !navToggle || !siteNav || siteNav.dataset.bound === '1') return;

    siteNav.dataset.bound = '1';

    function closeNav() {
      header.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
    }

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

  function initHomePage() {
    var canvas = document.getElementById('radialCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var BAR_COUNT = 64;
    var time = 0;
    var rafId = null;
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
      rafId = requestAnimationFrame(draw);
    }

    draw();

    var scrollCue = document.getElementById('scrollCue');
    var aboutSection = document.getElementById('about');
    var onScroll = null;
    var aboutObserver = null;

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
      onScroll = updateScrollCue;
      window.addEventListener('scroll', onScroll, { passive: true });
      updateScrollCue();
    }

    if (aboutSection) {
      if ('IntersectionObserver' in window) {
        aboutObserver = new IntersectionObserver(function (entries) {
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

    window.__portfolioPage = {
      cleanup: function () {
        if (rafId) cancelAnimationFrame(rafId);
        if (onScroll) window.removeEventListener('scroll', onScroll);
        if (aboutObserver) aboutObserver.disconnect();
      }
    };
  }

  function initVideos() {
    var thumbs = document.querySelectorAll('.video-thumb');
    if (!thumbs.length) return;

    function getVideoEmbedUrl(url) {
      if (!url) return '';
      var normalized = url.trim();
      if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
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
      if (youtubeId) return 'https://www.youtube.com/embed/' + youtubeId + '?autoplay=1&rel=0';
      return normalized;
    }

    var activeThumb = null;

    function isLocalVideoSrc(url) {
      return /\.(mp4|webm|mov)(\?|#|$)/i.test(url || '');
    }

    function resetThumb(thumb) {
      if (!thumb) return;
      var originalSrc = thumb.getAttribute('data-src');
      var isLocalVideo = thumb.getAttribute('data-type') === 'file' || isLocalVideoSrc(originalSrc);
      var poster = thumb.getAttribute('data-poster');
      thumb.innerHTML = '';
      thumb.style.cursor = 'pointer';
      if (isLocalVideo) {
        var preview = document.createElement('video');
        preview.className = 'video-thumb__img';
        preview.src = originalSrc;
        preview.muted = true;
        preview.playsInline = true;
        preview.preload = 'metadata';
        preview.setAttribute('aria-label', 'Video preview');
        thumb.appendChild(preview);
      } else if (poster) {
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
        var rawSrc = thumb.getAttribute('data-src');
        var isLocalVideo = thumb.getAttribute('data-type') === 'file' || isLocalVideoSrc(rawSrc);
        thumb.innerHTML = '';
        thumb.style.cursor = 'default';
        if (isLocalVideo) {
          var video = document.createElement('video');
          video.setAttribute('src', rawSrc);
          video.setAttribute('controls', '');
          video.setAttribute('autoplay', '');
          video.setAttribute('playsinline', '');
          video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;';
          thumb.appendChild(video);
        } else {
          var src = getVideoEmbedUrl(rawSrc);
          var iframe = document.createElement('iframe');
          iframe.setAttribute('src', src);
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          iframe.setAttribute('allowfullscreen', '');
          iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
          thumb.appendChild(iframe);
        }
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

    var onVisibility = function () {
      if (document.hidden) stopActiveVideo();
    };
    document.addEventListener('visibilitychange', onVisibility);

    window.__portfolioPage = {
      cleanup: function () {
        stopActiveVideo();
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }

  function initFestivalHeroVideo() {
    var wrap = document.querySelector('.festival-hero__video-wrap');
    if (!wrap) return;

    var video = wrap.querySelector('.festival-hero__video');
    var muteBtn = wrap.querySelector('.festival-hero__mute');
    if (!video || !muteBtn) return;

    function updateMuteUi() {
      muteBtn.classList.toggle('is-muted', video.muted);
      muteBtn.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
      muteBtn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    }

    function tryPlay() {
      var playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function () {});
      }
    }

    function onMuteClick() {
      video.muted = !video.muted;
      updateMuteUi();
      if (!video.muted) tryPlay();
    }

    function onVisibility() {
      if (document.hidden) {
        video.pause();
        return;
      }
      tryPlay();
    }

    muteBtn.addEventListener('click', onMuteClick);
    video.addEventListener('loadeddata', tryPlay);
    document.addEventListener('visibilitychange', onVisibility);
    updateMuteUi();
    tryPlay();

    var prevCleanup = window.__portfolioPage && window.__portfolioPage.cleanup;
    window.__portfolioPage = {
      cleanup: function () {
        muteBtn.removeEventListener('click', onMuteClick);
        document.removeEventListener('visibilitychange', onVisibility);
        video.pause();
        if (typeof prevCleanup === 'function') prevCleanup();
      }
    };
  }

  function initCurrentPage() {
    destroyCurrentPage();
    initPageReveal();
    initVideos();
    initFestivalHeroVideo();
    updateActiveNav();
    if (document.getElementById('radialCanvas')) {
      requestAnimationFrame(function () {
        requestAnimationFrame(initHomePage);
      });
    }
  }

  function resumeMusicAfterNav() {
    var player = window.__portfolioMusic;
    if (!player || !player.scWidget || player.isMuted) return;
    player.scWidget.isPaused(function (paused) {
      if (paused && player.hasStarted) {
        player.scWidget.play();
        player.isPlaying = true;
      }
    });
  }

  function applyPageSwap(nextRoot, url, pushHistory, docTitle) {
    destroyCurrentPage();
    resolvePageUrls(nextRoot, url);
    pageRoot.innerHTML = nextRoot.innerHTML;
    document.title = docTitle || document.title;

    if (pushHistory !== false) {
      history.pushState({ pjax: true, url: url }, '', url);
    }

    window.scrollTo(0, 0);
    document.documentElement.classList.remove('is-leaving');
    initCurrentPage();
    beginNavigationGrace(900);
    resumeMusicAfterNav();
    window.setTimeout(resumeMusicAfterNav, 120);
    window.setTimeout(resumeMusicAfterNav, 350);
  }

  function navigateTo(url, pushHistory) {
    if (isNavigating) return;
    isNavigating = true;
    beginNavigationGrace(2500);

    fetch(url, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Page fetch failed');
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nextRoot = doc.getElementById('page-root');
        if (!nextRoot || !pageRoot) {
          window.location.href = url;
          return;
        }

        if (window.__portfolioMusic && typeof window.__portfolioMusic.saveState === 'function') {
          window.__portfolioMusic.saveState();
        }

        var docTitle = doc.title;

        requestAnimationFrame(function () {
          applyPageSwap(nextRoot, url, pushHistory, docTitle);
        });
      })
      .catch(function () {
        window.location.href = url;
      })
      .finally(function () {
        isNavigating = false;
      });
  }

  function initPageTransitions() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link || !isInternalPageLink(link)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return;

      e.preventDefault();
      var url = resolveInternalUrl(link);
      if (url === window.location.href) return;

      document.documentElement.classList.add('is-leaving');
      window.setTimeout(function () {
        navigateTo(url, true);
      }, 420);
    });

    window.addEventListener('popstate', function (e) {
      if (e.state && e.state.url) {
        navigateTo(e.state.url, false);
      } else {
        navigateTo(window.location.href, false);
      }
    });

    if (!history.state) {
      history.replaceState({ pjax: true, url: window.location.href }, '', window.location.href);
    }
  }

  function initMusicPlayer() {
    var scBar = document.getElementById('soundcloudBar');
    if (!scBar) return;

    if (window.__portfolioMusic && window.__portfolioMusic.ready) {
      window.__portfolioMusic.syncUi();
      return;
    }

    var trackUrl = scBar.getAttribute('data-track');

    function normalizeSoundCloudUrl(url) {
      try {
        var parsed = new URL(url.trim());
        if (parsed.hostname.indexOf('soundcloud.com') === -1) return url.trim();
        parsed.search = '';
        parsed.hash = '';
        parsed.pathname = parsed.pathname.replace(/\/s-[A-Za-z0-9]+$/i, '');
        return parsed.toString().replace(/\/$/, '');
      } catch (e) {
        return url.trim();
      }
    }

    trackUrl = normalizeSoundCloudUrl(trackUrl);
    var scIframe = document.getElementById('soundcloudPlayer');
    if (!trackUrl || !scIframe) return;

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

    var embedUrl = 'https://w.soundcloud.com/player/?' + scParams;
    if (!scIframe.src || scIframe.src.indexOf('soundcloud.com/player') === -1) {
      scIframe.src = embedUrl;
    }

    var player = {
      ready: false,
      scWidget: null,
      hasStarted: false,
      isMuted: sessionStorage.getItem('musicMuted') === '1',
      savedVolume: 100,
      trackBpm: parseFloat(scBar.getAttribute('data-bpm')) || 124,
      beatOffset: parseFloat(scBar.getAttribute('data-beat-offset')) || 0,
      lastPositionMs: parseFloat(sessionStorage.getItem('musicPosition')) || 0,
      lastProgressAt: performance.now(),
      beatLoopId: null,
      isPlaying: sessionStorage.getItem('musicPlaying') === '1',
      musicToggle: document.getElementById('musicToggle'),
      musicToggleRail: document.getElementById('musicToggleRail'),
      waveBack: null,
      waveFront: null,
      saveTimer: null
    };

    function refreshWaveRefs() {
      player.waveBack = document.querySelector('.music-toggle__wave-path--back');
      player.waveFront = document.querySelector('.music-toggle__wave-path--front');
      player.musicToggle = document.getElementById('musicToggle');
      player.musicToggleRail = document.getElementById('musicToggleRail');
    }

    function wavePath(amplitude, invert) {
      var mid = 7;
      var sign = invert ? 1 : -1;
      var a = amplitude * sign;
      return 'M0 7 C2 ' + (mid + a * 0.42) + ' 4 ' + (mid - a) + ' 6 7 S10 ' + (mid + a * 0.42) + ' 12 7 S16 ' + (mid - a) + ' 18 7 S22 ' + (mid + a * 0.42) + ' 24 7';
    }

    function beatEnvelope(positionMs) {
      if (!player.trackBpm) return 0;
      var beatMs = 60000 / player.trackBpm;
      var pos = positionMs - player.beatOffset;
      while (pos < 0) pos += beatMs;
      var phase = (pos % beatMs) / beatMs;
      var kick = Math.exp(-phase * 14);
      var halfBeat = (pos + beatMs * 0.5) % beatMs / beatMs;
      var offbeat = Math.exp(-halfBeat * 11) * 0.28;
      return Math.min(1, kick + offbeat);
    }

    function breatheAmount(now) {
      return 0.5 + 0.5 * Math.sin(now * 0.0028);
    }

    function setBeatVars(env, now) {
      refreshWaveRefs();
      if (!player.musicToggle) return;
      var breathe = breatheAmount(now);
      var y = (0.68 + env * 0.72) * (0.86 + breathe * 0.18);
      var x = (1 + env * 0.1) * (0.94 + breathe * 0.08);
      var opacity = (0.52 + env * 0.48) * (0.82 + breathe * 0.22);
      var glow = env * 0.85 + breathe * 0.24;
      player.musicToggle.style.setProperty('--beat-y', y.toFixed(3));
      player.musicToggle.style.setProperty('--beat-x', x.toFixed(3));
      player.musicToggle.style.setProperty('--beat-opacity', Math.min(1, opacity).toFixed(3));
      player.musicToggle.style.setProperty('--beat-glow', Math.min(1, glow).toFixed(3));
      if (player.waveBack && player.waveFront) {
        var amp = (1.1 + env * 3.8) * (0.9 + breathe * 0.14);
        player.waveBack.setAttribute('d', wavePath(amp, false));
        player.waveFront.setAttribute('d', wavePath(amp * 0.88, true));
      }
    }

    function resetBeatVars() {
      setBeatVars(0, performance.now());
    }

    function updateBeatViz(positionMs, now) {
      if (player.isMuted || !player.isPlaying) {
        resetBeatVars();
        return;
      }
      setBeatVars(beatEnvelope(positionMs), now);
    }

    function beatLoop(now) {
      if (player.isPlaying && !player.isMuted) {
        var pos = player.lastPositionMs + (now - player.lastProgressAt);
        updateBeatViz(pos, now);
      } else if (!player.isMuted && player.musicToggle && player.musicToggle.classList.contains('is-beat-sync')) {
        setBeatVars(0, now);
      }
      player.beatLoopId = requestAnimationFrame(beatLoop);
    }

    function startBeatLoop() {
      if (player.beatLoopId) return;
      player.beatLoopId = requestAnimationFrame(beatLoop);
    }

    function updateMusicToggleUi() {
      refreshWaveRefs();
      if (!player.musicToggle) return;
      player.musicToggle.classList.toggle('is-muted', player.isMuted);
      player.musicToggle.setAttribute('aria-pressed', player.isMuted ? 'true' : 'false');
      player.musicToggle.setAttribute('aria-label', player.isMuted ? 'Unmute music' : 'Mute music');
      sessionStorage.setItem('musicMuted', player.isMuted ? '1' : '0');
      if (player.isMuted) resetBeatVars();
    }

    function saveState() {
      if (!player.scWidget) return;
      player.scWidget.getPosition(function (ms) {
        sessionStorage.setItem('musicPosition', String(ms));
        player.lastPositionMs = ms;
        player.lastProgressAt = performance.now();
      });
      sessionStorage.setItem('musicPlaying', player.isPlaying ? '1' : '0');
    }

    function resumeFromSavedState() {
      if (!player.scWidget) return;
      var savedPos = parseFloat(sessionStorage.getItem('musicPosition')) || 0;
      var shouldPlay = sessionStorage.getItem('musicPlaying') !== '0';

      function tryResume() {
        if (savedPos > 500) {
          player.scWidget.seekTo(savedPos);
          player.lastPositionMs = savedPos;
          player.lastProgressAt = performance.now();
        }
        if (shouldPlay && !player.isMuted) {
          player.scWidget.play();
          player.hasStarted = true;
          player.isPlaying = true;
        }
      }

      tryResume();
      if (savedPos > 500) {
        window.setTimeout(tryResume, 200);
        window.setTimeout(tryResume, 700);
      } else if (shouldPlay && !player.isMuted) {
        window.setTimeout(tryResume, 120);
      }
    }

    function toggleMute() {
      if (!player.scWidget) return;
      if (player.isMuted) {
        player.scWidget.setVolume(player.savedVolume || 100);
        player.isMuted = false;
        player.isPlaying = true;
        player.scWidget.play();
        updateMusicToggleUi();
        saveState();
        return;
      }
      player.scWidget.getVolume(function (volume) {
        player.savedVolume = volume > 0 ? volume : 100;
        player.scWidget.setVolume(0);
        player.isMuted = true;
        updateMusicToggleUi();
        saveState();
      });
    }

    function showMusicToggle() {
      refreshWaveRefs();
      if (player.musicToggleRail) player.musicToggleRail.classList.add('is-ready');
      if (player.musicToggle) player.musicToggle.classList.add('is-beat-sync');
      startBeatLoop();
    }

    function bindToggleClick() {
      refreshWaveRefs();
      if (!player.musicToggle || player.musicToggle.dataset.bound === '1') return;
      player.musicToggle.dataset.bound = '1';
      player.musicToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        if (!player.scWidget) return;
        if (!player.hasStarted) {
          player.scWidget.play();
          player.hasStarted = true;
          player.isPlaying = true;
        }
        toggleMute();
      });
    }

    function bindFirstInteraction() {
      var events = ['click', 'touchstart', 'keydown'];
      function onInteract() {
        if (!player.scWidget || player.hasStarted) {
          events.forEach(function (name) {
            document.removeEventListener(name, onInteract);
          });
          return;
        }
        player.scWidget.play();
        player.hasStarted = true;
        player.isPlaying = true;
        saveState();
        events.forEach(function (name) {
          document.removeEventListener(name, onInteract);
        });
      }
      events.forEach(function (name) {
        document.addEventListener(name, onInteract);
      });
    }

    function initTrackBpm() {
      if (!player.scWidget) return;
      player.scWidget.getCurrentSound(function (sound) {
        if (sound && sound.bpm) {
          player.trackBpm = sound.bpm;
        } else if (!parseFloat(scBar.getAttribute('data-bpm'))) {
          player.trackBpm = 124;
        }
      });
    }

    player.syncUi = function () {
      refreshWaveRefs();
      updateMusicToggleUi();
      showMusicToggle();
    };

    player.saveState = saveState;
    player.resumeIfNeeded = resumeMusicAfterNav;

    window.__portfolioMusic = player;

    bindToggleClick();

    function bootWidget() {
      player.scWidget = SC.Widget(scIframe);

      player.scWidget.bind(SC.Widget.Events.READY, function () {
        player.ready = true;
        initTrackBpm();
        showMusicToggle();
        if (player.isMuted) {
          player.scWidget.setVolume(0);
        } else {
          player.scWidget.play();
          player.hasStarted = true;
          player.isPlaying = true;
        }
        updateMusicToggleUi();
        resumeFromSavedState();
        bindFirstInteraction();
      });

      player.scWidget.bind(SC.Widget.Events.PLAY, function () {
        player.hasStarted = true;
        player.isPlaying = true;
        saveState();
      });

      player.scWidget.bind(SC.Widget.Events.PAUSE, function () {
        if (inNavigationGrace()) {
          if (!player.isMuted) {
            window.setTimeout(function () {
              if (!player.isMuted && player.scWidget) player.scWidget.play();
            }, 20);
          }
          return;
        }
        player.isPlaying = false;
        resetBeatVars();
        saveState();
      });

      player.scWidget.bind(SC.Widget.Events.FINISH, function () {
        player.lastPositionMs = 0;
        player.lastProgressAt = performance.now();
        sessionStorage.setItem('musicPosition', '0');
        if (player.isMuted) return;
        player.scWidget.seekTo(0);
        window.setTimeout(function () {
          if (player.isMuted) return;
          player.scWidget.play();
          player.hasStarted = true;
          player.isPlaying = true;
          saveState();
        }, 120);
      });

      player.scWidget.bind(SC.Widget.Events.PLAY_PROGRESS, function (data) {
        player.lastPositionMs = data.currentPosition;
        player.lastProgressAt = performance.now();
      });
    }

    function whenScApiReady(fn) {
      if (window.SC && window.SC.Widget) {
        fn();
        return;
      }
      var pending = document.querySelector('script[data-sc-api="1"]');
      if (pending) {
        pending.addEventListener('load', fn, { once: true });
        return;
      }
      var scScript = document.createElement('script');
      scScript.src = 'https://w.soundcloud.com/player/api.js';
      scScript.dataset.scApi = '1';
      scScript.onload = fn;
      document.head.appendChild(scScript);
    }

    whenScApiReady(bootWidget);

    player.saveTimer = window.setInterval(saveState, 2000);
    window.addEventListener('pagehide', saveState);
  }

  initMusicPlayer();
  initNav();
  initPageTransitions();
  initCurrentPage();
})();
