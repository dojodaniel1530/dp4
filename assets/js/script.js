document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------------
   * Toast Notifications Helper
   * ------------------------------------------------------------------ */
  const actionToast = document.getElementById('actionToast');
  const toastMsg = document.getElementById('toastMsg');
  let toastTimer = null;

  function showToast(text) {
    if (!actionToast || !toastMsg) return;
    toastMsg.textContent = text;
    actionToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => actionToast.classList.remove('show'), 3000);
  }

  /* ------------------------------------------------------------------
   * Left On Base Feature Button
   * ------------------------------------------------------------------ */
  const playLobEpisodeBtn = document.getElementById('playLobEpisodeBtn');
  if (playLobEpisodeBtn) {
    playLobEpisodeBtn.addEventListener('click', () => {
      const station = document.getElementById('tuner-station');
      if (station) {
        station.scrollIntoView({ behavior: 'smooth' });
      }
      showToast('Loaded Episode #88 into player!');
    });
  }

  /* ------------------------------------------------------------------
   * Weekly Schedule Renderer
   * (Handled by /assets/js/schedule.js, which fetches the real lineup
   * from /assets/js/schedule.json and renders it into #schedule-grid.)
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
   * Auto-select Current Day in Schedule
   * ------------------------------------------------------------------ */
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = daysOfWeek[new Date().getDay()];
  const todayButton = document.querySelector(`.day-tab-btn[data-day="${currentDay}"]`);

  if (todayButton) {
    todayButton.click();
  }

  /* ------------------------------------------------------------------
   * Embedded Player Auto-Resize
   * The player lives in a same-origin iframe (emb.html), so rather than
   * trusting a single postMessage sent once on load - which misses any
   * height added afterward by async content like the listener count,
   * track list, or VU meter - we read the iframe's own document height
   * directly and keep it in sync with a ResizeObserver, plus a short
   * poll as a fallback for engines where ResizeObserver misses a beat.
   * The postMessage listener is kept as a backup in case emb.html is
   * ever swapped for a genuinely cross-origin embed.
   * ------------------------------------------------------------------ */
  const playerFrame = document.querySelector('.player-iframe');
  if (playerFrame) {

    function applyPlayerHeight(h) {
      const height = Number(h);
      if (!Number.isFinite(height) || height <= 0) return;
      const next = `${Math.ceil(height)}px`;
      if (playerFrame.style.height !== next) {
        playerFrame.style.height = next;
      }
    }

    function getPlayerInnerHeight() {
      try {
        const doc = playerFrame.contentDocument || playerFrame.contentWindow.document;
        if (!doc || !doc.documentElement) return null;
        return Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0
        );
      } catch (err) {
        return null; // cross-origin - postMessage listener below will handle it
      }
    }

    function syncPlayerHeight() {
      const h = getPlayerInnerHeight();
      if (h) applyPlayerHeight(h);
    }

    function watchPlayerFrame() {
      let doc;
      try {
        doc = playerFrame.contentDocument || playerFrame.contentWindow.document;
      } catch (err) {
        return; // cross-origin, nothing more to do here
      }
      if (!doc) return;

      syncPlayerHeight();

      if ('ResizeObserver' in window && doc.documentElement) {
        const ro = new ResizeObserver(() => syncPlayerHeight());
        ro.observe(doc.documentElement);
      }

      // Belt-and-suspenders: keep checking for a few seconds after load
      // to catch late-loading fonts/images/async widgets, then stop.
      let ticks = 0;
      const poll = setInterval(() => {
        syncPlayerHeight();
        ticks += 1;
        if (ticks > 20) clearInterval(poll); // ~6 seconds
      }, 300);
    }

    playerFrame.addEventListener('load', watchPlayerFrame);
    watchPlayerFrame(); // in case it already finished loading

    window.addEventListener('message', (event) => {
      if (event.source !== playerFrame.contentWindow) return;
      const data = event.data;
      if (!data) return;

      if ((data.type === 'KDJO_PLAYER_RESIZE' || data.type === 'PLAYER_RESIZE') && data.height) {
        applyPlayerHeight(data.height);
      }
    });
  }

  /* ------------------------------------------------------------------
   * Lightbox Gallery Modal
   * ------------------------------------------------------------------ */
  const galleryThumbs = document.querySelectorAll('.gallery-thumb');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let currentGalleryIdx = 0;

  function openLightbox(idx) {
    if (!lightboxModal || !lightboxImg) return;
    currentGalleryIdx = idx;
    const target = galleryThumbs[idx];
    lightboxImg.src = target.getAttribute('data-src');
    if (lightboxCaption) {
      lightboxCaption.textContent = target.getAttribute('data-caption');
    }
    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  galleryThumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => openLightbox(idx));
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIdx = (currentGalleryIdx - 1 + galleryThumbs.length) % galleryThumbs.length;
      openLightbox(currentGalleryIdx);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIdx = (currentGalleryIdx + 1) % galleryThumbs.length;
      openLightbox(currentGalleryIdx);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxPrev) lightboxPrev.click();
    if (e.key === 'ArrowRight' && lightboxNext) lightboxNext.click();
  });

  /* ------------------------------------------------------------------
   * Parallax Radio Towers & Back to Top
   * ------------------------------------------------------------------ */
  const towerLeft = document.getElementById('towerLeft');
  const towerRight = document.getElementById('towerRight');
  const backToTopBtn = document.getElementById('backToTopBtn');

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    if (towerLeft && towerRight && window.innerWidth > 992) {
      towerLeft.style.transform = `translateY(${scrolled * 0.14}px)`;
      towerRight.style.transform = `scaleX(-1) translateY(${scrolled * 0.14}px)`;
    }

    if (backToTopBtn) {
      if (scrolled > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    }
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
   * Mobile Menu Drawer & Interactivity
   * ------------------------------------------------------------------ */
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });

    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mobileDrawer.classList.remove('open'));
    });
  }

  const sdSticker = document.getElementById('sdSticker');
  if (sdSticker) {
    sdSticker.addEventListener('click', () => {
      showToast("Go Padres!!");
    });
  }

  /* ------------------------------------------------------------------
   * Postcard Contact Form (Live Formspree AJAX Submission)
   * ------------------------------------------------------------------ */
  const postcardForm = document.getElementById('postcardForm');
  if (postcardForm) {
    postcardForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = postcardForm.querySelector('button[type="submit"], input[type="submit"]');
      const originalText = submitBtn ? (submitBtn.innerHTML || submitBtn.value) : 'Send Message';

      if (submitBtn) {
        submitBtn.disabled = true;
        if (submitBtn.tagName === 'BUTTON') {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        } else {
          submitBtn.value = 'Sending...';
        }
      }

      const formData = new FormData(postcardForm);
      const endpoint = postcardForm.action || 'https://formspree.io/f/xdaqdvpw';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const senderName = document.getElementById('senderName');
          const name = senderName && senderName.value.trim() ? senderName.value.trim() : 'Listener';
          showToast(`Thank you, ${name}! Your message was sent to the booth.`);
          postcardForm.reset();
        } else {
          const data = await response.json();
          if (data && data.errors) {
            showToast(data.errors.map(err => err.message).join(", "));
          } else {
            showToast("Oops! There was an issue sending your message.");
          }
        }
      } catch (err) {
        showToast("Network error. Please try again later.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitBtn.tagName === 'BUTTON') {
            submitBtn.innerHTML = originalText;
          } else {
            submitBtn.value = originalText;
          }
        }
      }
    });
  }

});
