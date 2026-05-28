const navLinks = document.querySelectorAll('.site-nav a');
    const sections = document.querySelectorAll('.content section');

    // Active nav on click
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    // Active nav on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(l => l.classList.remove('active'));
          const active = document.querySelector('.site-nav a[href="#' + id + '"]');
          if (active) active.classList.add('active');
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(s => observer.observe(s));

    // --- Radial Visualizer ---
    (function() {
      const canvas = document.getElementById('radialCanvas');
      const ctx = canvas.getContext('2d');
      const BAR_COUNT = 64;
      let time = 0;
      const colorStops = [
        {pos: 0,    color: [220, 40,  40]},
        {pos: 0.2,  color: [230, 130, 20]},
        {pos: 0.45, color: [20,  200, 200]},
        {pos: 0.7,  color: [230, 130, 20]},
        {pos: 1,    color: [220, 40,  40]},
      ];
      function lerpColor(t) {
        for (let i = 0; i < colorStops.length - 1; i++) {
          const a = colorStops[i], b = colorStops[i+1];
          if (t >= a.pos && t <= b.pos) {
            const f = (t - a.pos) / (b.pos - a.pos);
            return a.color.map((v, j) => Math.round(v + f * (b.color[j] - v)));
          }
        }
        return colorStops[colorStops.length-1].color;
      }
      function getHeight(i, t) {
        const norm = i / BAR_COUNT;
        const envelope = Math.sin(norm * Math.PI) * 0.85 + 0.15;
        const wave1 = Math.sin(norm * 8 - t * 2.5) * 0.4;
        const wave2 = Math.sin(norm * 14 + t * 1.8) * 0.25;
        const wave3 = Math.sin(norm * 3 - t * 0.9) * 0.35;
        const noise = (Math.sin(i * 17.3 + t * 3.7) * 0.5 + 0.5) * 0.15;
        return Math.max(0.04, (0.5 + wave1 + wave2 + wave3 + noise) * envelope);
      }
      function draw() {
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        time += 0.018;
        const cx = W/2, cy = H/2, rBase = Math.min(W,H) * 0.22;
        for (let i = 0; i < BAR_COUNT; i++) {
          const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI/2;
          const h = getHeight(i, time) * rBase * 1.1;
          const x1 = cx + Math.cos(angle) * rBase;
          const y1 = cy + Math.sin(angle) * rBase;
          const x2 = cx + Math.cos(angle) * (rBase + h);
          const y2 = cy + Math.sin(angle) * (rBase + h);
          const [r,g,b] = lerpColor(i / (BAR_COUNT - 1));
          ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1,y1);
          ctx.lineTo(x2,y2);
          ctx.stroke();
        }
        requestAnimationFrame(draw);
      }
      draw();
    })();

    // --- Video System ---
    var activeThumb = null;

    // Restore a thumb to its original black screen + play button state
    function resetThumb(thumb) {
      if (!thumb) return;
      var originalSrc = thumb.getAttribute('data-src');
      // Remove iframe
      thumb.innerHTML = '';
      thumb.style.cursor = 'pointer';
      // Rebuild black overlay + play button
      var playBtn = document.createElement('div');
      playBtn.className = 'play-btn';
      playBtn.style.cssText = 'width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;';
      playBtn.innerHTML = '<svg width="18" height="20" viewBox="0 0 18 20" fill="none"><path d="M2 2L16 10L2 18V2Z" fill="white" opacity="0.9"/></svg>';
      thumb.appendChild(playBtn);
      // Restore data-src (so next click still works)
      thumb.setAttribute('data-src', originalSrc);
    }

    // Stop the active video and restore its UI
    function stopActiveVideo() {
      if (activeThumb) {
        resetThumb(activeThumb);
        activeThumb = null;
      }
    }

    // Stop ALL video thumbs (section leave / nav click)
    function stopAllVideos() {
      document.querySelectorAll('.video-thumb').forEach(function(thumb) {
        if (thumb.querySelector('iframe')) {
          resetThumb(thumb);
        }
      });
      activeThumb = null;
    }

    // Attach events to all video thumbs
    function attachThumbEvents(thumb) {
      thumb.addEventListener('mouseenter', function() {
        var btn = thumb.querySelector('.play-btn');
        if (btn) { btn.style.background = 'rgba(255,255,255,0.22)'; btn.style.transform = 'scale(1.1)'; }
      });
      thumb.addEventListener('mouseleave', function() {
        var btn = thumb.querySelector('.play-btn');
        if (btn) { btn.style.background = 'rgba(255,255,255,0.12)'; btn.style.transform = 'scale(1)'; }
      });
      thumb.addEventListener('click', function() {
        // If this thumb is already playing, do nothing
        if (thumb === activeThumb) return;
        // Stop previous active video — reset it to black screen
        stopActiveVideo();
        // Load iframe with exact original src, no modifications
        var src = thumb.getAttribute('data-src');
        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', src);
        iframe.setAttribute('allow', 'autoplay');
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
        thumb.innerHTML = '';
        thumb.style.cursor = 'default';
        thumb.appendChild(iframe);
        // Mark as active
        activeThumb = thumb;
      });
    }

    document.querySelectorAll('.video-thumb').forEach(function(thumb) {
      attachThumbEvents(thumb);
    });

    // --- vcard border hover ---
    document.querySelectorAll('.vcard').forEach(function(card) {
      card.addEventListener('mouseenter', function() { card.style.border = '0.5px solid rgba(255,255,255,0.22)'; });
      card.addEventListener('mouseleave', function() { card.style.border = '0.5px solid rgba(255,255,255,0.08)'; });
    });

    // --- Auto-stop: restore black overlay when section leaves viewport ---
    var videoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) {
          entry.target.querySelectorAll('.video-thumb').forEach(function(thumb) {
            if (thumb.querySelector('iframe')) {
              resetThumb(thumb);
              if (thumb === activeThumb) activeThumb = null;
            }
          });
        }
      });
    }, { threshold: 0.05 });

    sections.forEach(function(s) { videoObserver.observe(s); });

    // Stop all on nav click
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() { stopAllVideos(); });
    });