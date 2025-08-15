 
    // Modal open/close helpers with focus trapping + ESC + backdrop click
    (function(){
      const modal = document.getElementById('appointment-form');
      const backdrop = document.getElementById('modal-backdrop');
      const closeBtn = modal.querySelector('.close-btn');
      const form = document.getElementById('inspection-form');
      const submitBtn = document.getElementById('submit-btn');
      const msg = document.getElementById('form-message');
      let lastFocus = null;

      function fitModalScale(){
        if (modal.hasAttribute('hidden')) return;
        const baseScale = parseFloat(getComputedStyle(modal).getPropertyValue('--form-scale')) || 1;
        modal.style.transform = `translateX(-50%) scale(${baseScale})`;
        modal.style.transformOrigin = 'top center';
        const avail = Math.min(window.innerHeight, document.documentElement.clientHeight) - 40;
        const rect = modal.getBoundingClientRect();
        const scale = Math.min(1, avail / rect.height);
        modal.style.transform = `translateX(-50%) scale(${scale * baseScale})`;
      }

      function isOpen(){ return !modal.hasAttribute('hidden'); }
      function getFocusable(){
        return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => el.offsetParent !== null);
      }

      function openModal(){
        lastFocus = document.activeElement;
        document.body.classList.add('modal-open');
        backdrop.hidden = false;
        modal.hidden = false;
        msg.textContent = '';
        msg.classList.add('sr-only');
        const f = getFocusable();
        (f[0] || modal).focus();
        fitModalScale();
        window.addEventListener('resize', fitModalScale);
        window.addEventListener('orientationchange', fitModalScale);
      }

      function closeModal(){
        document.body.classList.remove('modal-open');
        modal.hidden = true;
        backdrop.hidden = true;
        modal.style.transform = 'translateX(-50%) scale(' + (parseFloat(getComputedStyle(modal).getPropertyValue('--form-scale')) || 1) + ')';
        window.removeEventListener('resize', fitModalScale);
        window.removeEventListener('orientationchange', fitModalScale);
        if (lastFocus) lastFocus.focus();
      }

      // Expose controls
      window.toggleForm = function(){ isOpen() ? closeModal() : openModal(); };
      window.closePopup = function(){
        const popup = document.getElementById('confirmation-popup');
        popup.hidden = true; backdrop.hidden = true;
        if (lastFocus) lastFocus.focus();
      };

      // Close when clicking outside
      backdrop.addEventListener('click', closeModal);
      closeBtn.addEventListener('click', closeModal);

      // Keyboard handling
      document.addEventListener('keydown', (e)=>{
        if (!isOpen()) return;
        if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
        if (e.key === 'Tab') {
          const f = getFocusable();
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });

      function showMessage(text, ok=false){
        msg.textContent = text;
        msg.classList.remove('sr-only');
        msg.style.color = ok ? '#0a7' : '#c00';
      }

      if (form) {
        form.addEventListener('submit', async (event)=>{
          event.preventDefault();
          const name = form.elements['Name'];
          const email = form.elements['Email'];
          if (!name.value.trim()) { name.focus(); showMessage('Please enter your name.'); return; }
          if (!email.validity.valid) { email.focus(); showMessage('Please enter a valid email.'); return; }

          submitBtn.disabled = true; const oldText = submitBtn.textContent; submitBtn.textContent = 'Submitting…';
          try {
            const formData = new FormData(form);
            const res = await fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept':'application/json' } });
            if (res.ok) {
              form.reset();
              closeModal();
              const popup = document.getElementById('confirmation-popup');
              const okBtn = popup.querySelector('button');
              popup.hidden = false; backdrop.hidden = false; okBtn.focus();
            } else {
              showMessage('There was a problem submitting the form. Please try again.');
            }
          } catch(err){
            console.error(err); showMessage('Network error. Please try again.');
          } finally {
            submitBtn.disabled = false; submitBtn.textContent = oldText;
          }
        });
      }

      // --- Minimal self-tests (non-invasive) ---
      document.addEventListener('DOMContentLoaded', function(){
        try {
          console.assert(typeof window.toggleForm === 'function', 'toggleForm should be defined');
          console.assert(!!document.getElementById('appointment-form'), '#appointment-form exists');
          console.assert(!!document.getElementById('modal-backdrop'), '#modal-backdrop exists');
          console.log('[Self-test] basic checks passed');
        } catch (e) {
          console.error('[Self-test] failed', e);
        }
      });
    })();

    // Snap logo just before service cards would touch the big logo (desktop + mobile) with hysteresis + direction gating
    (function(){
      const logo = document.getElementById('main-logo');
      const services = document.getElementById('services');
      const grid = services ? services.querySelector('.service-grid') : null;
      const firstCard = grid ? grid.querySelector('.service-box') : null; // precise trigger
      if (!logo || !services || !grid || !firstCard) return;

      // State
      let snapped = false;
      let largeBottomRef = null;      // cached bottom of the LARGE logo (stable threshold)
      let lastY = window.scrollY;     // scroll direction tracker
      let lastDir = 0;                // +down / -up
      let userScrolled = window.scrollY > 5; // prevent immediate snap on load in mobile portrait

      // Tunables
      const SNAP_IN_BUFFER_DEFAULT  = 8;   // px "just before"
      const SNAP_OUT_BUFFER_DEFAULT = 40;  // px hysteresis (scrolling back up)
      const isMobilePortrait  = () => window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
      const isMobileLandscape = () => window.matchMedia('(orientation: landscape) and (max-width: 915px)').matches;

      function ensureLargeBottom(){
        if (largeBottomRef == null && !snapped){
          largeBottomRef = logo.getBoundingClientRect().bottom;
        }
      }

      function resetCache(){ largeBottomRef = null; }

      function update(){
        ensureLargeBottom();
        const cardTop = firstCard.getBoundingClientRect().top;
        const largeBottom = largeBottomRef ?? logo.getBoundingClientRect().bottom; // fallback
        const SNAP_IN_BUFFER  = isMobileLandscape() ? 12 : SNAP_IN_BUFFER_DEFAULT; // 1/8" in mobile landscape
        const SNAP_OUT_BUFFER = SNAP_OUT_BUFFER_DEFAULT;

        const scrollingDown = lastDir > 0.5;
        const scrollingUp   = lastDir < -0.5;

        const requireScrollForSnap = isMobilePortrait();
        const allowSnap = !requireScrollForSnap || userScrolled;

        // Snap only while scrolling DOWN and crossing the IN threshold
        if (!snapped && allowSnap && scrollingDown && cardTop <= (largeBottom + SNAP_IN_BUFFER)){
          snapped = true;
          logo.classList.add('logo-fixed-small');
          if (isMobileLandscape()) {
            // wait two frames for layout to settle after snapping
            requestAnimationFrame(()=>requestAnimationFrame(()=>{
              const snappedBottom = logo.getBoundingClientRect().bottom;
              const cardTop = firstCard.getBoundingClientRect().top;
              const targetGap = 12; // 1/8" in CSS px
              const delta = Math.max(0, (snappedBottom + targetGap) - cardTop);
              services.style.setProperty('--snap-gap-adjust', delta + 'px');
            }));
          } else {
            services.style.removeProperty('--snap-gap-adjust');
          }
          // keep largeBottomRef (measured pre-snap) as the stable reference
        }
        // Unsnap only while scrolling UP and crossing the OUT threshold (uses the SAME large threshold)
        else if (snapped && scrollingUp && cardTop >= (largeBottom + SNAP_OUT_BUFFER)){
          snapped = false;
          logo.classList.remove('logo-fixed-small');
          if (services) services.style.removeProperty('--snap-gap-adjust');
          resetCache(); // re-measure large logo bottom next frame
        }
      }

      // rAF throttle
      let ticking = false;
      function onScrollOrResize(){
        const y = window.scrollY;
        lastDir = y - lastY;
        lastY = y;
        if (y > 5) userScrolled = true;
        if (!ticking){
          ticking = true;
          requestAnimationFrame(()=>{ ticking = false; update(); });
        }
      }

      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', ()=>{ resetCache(); onScrollOrResize(); });
      window.addEventListener('orientationchange', ()=>{ resetCache(); onScrollOrResize(); });
      window.addEventListener('load', ()=>{ resetCache(); update(); });
      document.addEventListener('DOMContentLoaded', ()=>{ resetCache(); update(); });
    })();

// --- Simple report gallery (4 pages) ---
(function () {
  if (window.openReportGallery) return; // avoid double-defining

  window.REPORT_PAGES = [
    'images/SampleInspectionReport_page1_small.jpg',
    'images/SampleInspectionReport_page2_small.jpg',
    'images/SampleInspectionReport_page3_small.jpg',
    'images/SampleInspectionReport_page4_small.jpg'
  ];

  var overlay, imgEl, counterEl, idx = 0;

  function el(id){ return document.getElementById(id); }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function setImage(i){
    idx = clamp(i, 0, REPORT_PAGES.length - 1);
    imgEl.src = REPORT_PAGES[idx];
    counterEl.textContent = (idx + 1) + ' / ' + REPORT_PAGES.length;
    el('report-prev').disabled = (idx === 0);
    el('report-next').disabled = (idx === REPORT_PAGES.length - 1);
    // preload neighbors
    [idx - 1, idx + 1].forEach(function (n){
      if (n >= 0 && n < REPORT_PAGES.length){
        var pre = new Image(); pre.src = REPORT_PAGES[n];
      }
    });
  }

  function onKey(e){
    if (overlay.hidden) return;
    if (e.key === 'Escape'){ closeReportGallery(); }
    else if (e.key === 'ArrowRight'){ nextReport(); }
    else if (e.key === 'ArrowLeft'){ prevReport(); }
  }

  function stopScroll(lock){
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  window.openReportGallery = function(startIndex){
    overlay = overlay || el('report-overlay');
    imgEl = imgEl || el('report-image');
    counterEl = counterEl || el('report-counter');

    setImage(startIndex || 0);
    overlay.hidden = false;
    stopScroll(true);
    document.addEventListener('keydown', onKey);
  };

  window.closeReportGallery = function(){
    if (!overlay) overlay = el('report-overlay');
    overlay.hidden = true;
    stopScroll(false);
    document.removeEventListener('keydown', onKey);
  };

  window.nextReport = function(){ setImage(idx + 1); };
  window.prevReport = function(){ setImage(idx - 1); };

  // Wire UI controls once DOM is ready
  document.addEventListener('DOMContentLoaded', function(){
    var root = el('report-overlay');
    if (!root) return;

    root.addEventListener('click', function(e){
      if (e.target.dataset.close) closeReportGallery();
    });

    var prevBtn = el('report-prev'), nextBtn = el('report-next');
    if (prevBtn) prevBtn.addEventListener('click', function(){ prevReport(); });
    if (nextBtn) nextBtn.addEventListener('click', function(){ nextReport(); });

    var img = el('report-image');
    if (img) img.addEventListener('click', function(){
      if (idx < REPORT_PAGES.length - 1) nextReport();
    });
  });
})();
