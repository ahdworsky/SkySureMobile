
// --- Report gallery v2.1 (zoom/close fix) ---
(function () {
  if (window.__reportV21) return; window.__reportV21 = true;

  // Image paths fallback
  window.REPORT_PAGES = window.REPORT_PAGES || [
    'images/SampleInspectionReport_page1_small.jpg',
    'images/SampleInspectionReport_page2_small.jpg',
    'images/SampleInspectionReport_page3_small.jpg',
    'images/SampleInspectionReport_page4_small.jpg'
  ];

  var overlay, imgEl, counterEl, idx = 0;
  var frameEl, thumbsEl, prevBtn, nextBtn;
  var zoomScale = 1, minZoom = 1, maxZoom = 2.5, zoomStep = 0.25;
  var isPanning = false, startX = 0, startY = 0, originX = 0, originY = 0;

  function el(id){ return document.getElementById(id); }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function buildThumbs(){
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    window.REPORT_PAGES.forEach(function(src, i){
      var t = new Image();
      t.src = src;
      t.alt = 'Page ' + (i+1);
      if (i === idx) t.classList.add('active');
      t.addEventListener('click', function(){ setImage(i); });
      thumbsEl.appendChild(t);
    });
  }

  function markActiveThumb(){
    if (!thumbsEl) return;
    var kids = thumbsEl.querySelectorAll('img');
    kids.forEach(function(k, i){
      if (i === idx) k.classList.add('active');
      else k.classList.remove('active');
    });
  }

  function setImage(i){
    idx = clamp(i, 0, window.REPORT_PAGES.length - 1);
    imgEl.src = window.REPORT_PAGES[idx];
    if (counterEl) counterEl.textContent = (idx + 1) + ' / ' + window.REPORT_PAGES.length;
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) nextBtn.disabled = (idx === window.REPORT_PAGES.length - 1);
    // preload neighbors
    [idx - 1, idx + 1].forEach(function (n){
      if (n >= 0 && n < window.REPORT_PAGES.length){
        var pre = new Image(); pre.src = window.REPORT_PAGES[n];
      }
    });
    resetZoom();
    markActiveThumb();
  }

  function onKey(e){
    if (overlay.hidden) return;
    if (e.key === 'Escape'){ closeReportGallery(); }
    else if (e.key === 'ArrowRight'){ nextReport(); }
    else if (e.key === 'ArrowLeft'){ prevReport(); }
    else if (e.key === '+'){ zoomIn(); }
    else if (e.key === '-'){ zoomOut(); }
    else if (e.key === '0'){ resetZoom(); }
  }

  function stopScroll(lock){
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function applyTransform(){
    imgEl.style.transform = 'translate(' + originX + 'px,' + originY + 'px) scale(' + zoomScale + ')';
    imgEl.style.transformOrigin = 'center center';
    if (zoomScale > 1) frameEl.classList.add('zoomed');
    else frameEl.classList.remove('zoomed');
  }

  function zoomIn(){ zoomScale = clamp(zoomScale + zoomStep, minZoom, maxZoom); applyTransform(); }
  function zoomOut(){ zoomScale = clamp(zoomScale - zoomStep, minZoom, maxZoom); if (zoomScale === 1){ originX = 0; originY = 0; } applyTransform(); }
  function resetZoom(){ zoomScale = 1; originX = 0; originY = 0; applyTransform(); }

  function startPan(e){
    if (zoomScale === 1) return;
    isPanning = true;
    var p = (e.touches && e.touches[0]) || e;
    startX = p.clientX - originX;
    startY = p.clientY - originY;
    e.preventDefault && e.preventDefault();
  }
  function movePan(e){
    if (!isPanning) return;
    var p = (e.touches && e.touches[0]) || e;
    originX = p.clientX - startX;
    originY = p.clientY - startY;
    applyTransform();
    e.preventDefault && e.preventDefault();
  }
  function endPan(){ isPanning = false; }

  window.openReportGallery = function(startIndex){
    overlay   = overlay   || el('report-overlay');
    imgEl     = imgEl     || el('report-image');
    counterEl = counterEl || el('report-counter');
    frameEl   = frameEl   || document.querySelector('.report-frame');
    thumbsEl  = thumbsEl  || el('report-thumbs');
    prevBtn   = prevBtn   || el('report-prev');
    nextBtn   = nextBtn   || el('report-next');

    if (thumbsEl && !thumbsEl.hasChildNodes()) buildThumbs();
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

  document.addEventListener('DOMContentLoaded', function(){
    var root = el('report-overlay');
    if (!root) return;

    // Close on any element with [data-close], not just direct target
    root.addEventListener('click', function(e){
      var target = e.target.closest('[data-close]');
      if (target) { closeReportGallery(); }
    });

    // Controls
    el('report-prev') && el('report-prev').addEventListener('click', function(){ prevReport(); });
    el('report-next') && el('report-next').addEventListener('click', function(){ nextReport(); });

    // Zoom buttons (optional if present)
    var zin = document.getElementById('zoom-in');
    var zout = document.getElementById('zoom-out');
    var zreset = document.getElementById('zoom-reset');
    if (zin) zin.addEventListener('click', function(e){ e.preventDefault(); zoomIn(); });
    if (zout) zout.addEventListener('click', function(e){ e.preventDefault(); zoomOut(); });
    if (zreset) zreset.addEventListener('click', function(e){ e.preventDefault(); resetZoom(); });

    // Double-click / double-tap to zoom
    var lastTap = 0;
    frameEl = document.querySelector('.report-frame');
    frameEl.addEventListener('dblclick', function(){ (zoomScale === 1)? zoomIn() : resetZoom(); });
    frameEl.addEventListener('touchend', function(e){
      var now = Date.now();
      if (now - lastTap < 300){ (zoomScale === 1)? zoomIn() : resetZoom(); }
      lastTap = now;
    });

    // Drag/pan when zoomed
    imgEl = el('report-image');
    frameEl.addEventListener('mousedown', startPan);
    frameEl.addEventListener('mousemove', movePan);
    window.addEventListener('mouseup', endPan);
    frameEl.addEventListener('touchstart', startPan, {passive:false});
    frameEl.addEventListener('touchmove', function(e){ movePan(e); if (zoomScale>1) e.preventDefault(); }, {passive:false});
    frameEl.addEventListener('touchend', endPan);
  });
})();
