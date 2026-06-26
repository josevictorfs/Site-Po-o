document.addEventListener('DOMContentLoaded', () => {
  // --- NAVBAR SCROLL EFFECT ---
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // --- MOBILE NAV TOGGLE ---
  const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileNavToggle && navMenu) {
    mobileNavToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const isExpanded = navMenu.classList.contains('active');
      mobileNavToggle.innerHTML = isExpanded ? '<i class="fa fa-times"></i>' : '<i class="fa fa-bars"></i>';
    });
  }

  // Close mobile nav when clicking a link
  const navLinks = document.querySelectorAll('.nav-item a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileNavToggle.innerHTML = '<i class="fa fa-bars"></i>';
      }
    });
  });

  // --- SCROLL STORYTELLING CANVAS ANIMATION (Apple-style) ---
  const canvas = document.getElementById('animation-canvas');
  if (canvas) {
    const context = canvas.getContext('2d');
    const heroSection = document.getElementById('hero');
    const heroLoader = document.getElementById('hero-loader');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const frameCount = 80;
    const images = new Array(frameCount);
    let imagesReady = false;
    let loadedCount = 0;

    // --- Initialize canvas size immediately ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- Frame URL generator ---
    const getFrameUrl = (index) => {
      return `artesian_well_animation/frame_${index.toString().padStart(3, '0')}.jpg`;
    };

    // --- Draw image with "object-fit: cover" logic ---
    const drawCoverImage = (img) => {
      if (!img || !img.naturalWidth) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const imgRatio = iw / ih;
      const canvasRatio = cw / ch;

      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawH = ch;
        drawW = ch * imgRatio;
        drawX = (cw - drawW) / 2;
        drawY = 0;
      } else {
        drawW = cw;
        drawH = cw / imgRatio;
        drawX = 0;
        drawY = (ch - drawH) / 2;
      }

      context.drawImage(img, drawX, drawY, drawW, drawH);
    };

    // --- Track last rendered frame to avoid redundant draws ---
    let lastRenderedFrame = -1;

    const renderFrame = (frameIndex) => {
      const idx = Math.max(0, Math.min(frameCount - 1, frameIndex));
      if (idx === lastRenderedFrame && canvas.width === window.innerWidth) return;
      lastRenderedFrame = idx;

      if (images[idx] && images[idx].naturalWidth) {
        drawCoverImage(images[idx]);
      }
    };

    // --- Hide loader when ready ---
    const hideLoader = () => {
      if (heroLoader) {
        heroLoader.classList.add('hidden');
        // Remove from DOM after transition completes
        setTimeout(() => {
          heroLoader.style.display = 'none';
        }, 700);
      }
    };

    // --- Preload all frames ---
    const onFrameLoaded = () => {
      loadedCount++;

      // Render first frame as soon as it loads
      if (loadedCount === 1 && images[0] && images[0].naturalWidth) {
        renderFrame(0);
      }

      // All frames loaded
      if (loadedCount >= frameCount) {
        imagesReady = true;
        hideLoader();
        // Force render current scroll position
        lastRenderedFrame = -1;
        const progress = calculateScrollProgress();
        const frame = Math.round(progress * (frameCount - 1));
        renderFrame(frame);
      }
    };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.onload = onFrameLoaded;
      img.onerror = () => {
        console.warn(`Frame ${i} failed to load`);
        onFrameLoaded(); // Don't block
      };
      img.src = getFrameUrl(i);
      images[i] = img;
    }

    // Fallback: hide loader after 10s even if not all frames loaded
    setTimeout(() => {
      if (!imagesReady) {
        imagesReady = true;
        hideLoader();
      }
    }, 10000);

    // --- Canvas resize handler ---
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      lastRenderedFrame = -1; // Force redraw at new size
    };

    // --- Apple-style scroll progress calculation ---
    let targetProgress = 0;
    let currentProgress = 0;
    let currentDisplayFrame = 0;

    const calculateScrollProgress = () => {
      const rect = heroSection.getBoundingClientRect();
      const scrolled = -rect.top;
      const scrollableHeight = rect.height - window.innerHeight;

      if (scrollableHeight <= 0) return 0;

      let progress = scrolled / scrollableHeight;
      return Math.max(0, Math.min(1, progress));
    };

    // --- Text overlay synchronization ---
    const textBlocks = document.querySelectorAll('.hero-text-block');

    const updateTextOverlays = (progress) => {
      const ranges = [
        { start: 0, end: 0.25, index: 0 },
        { start: 0.33, end: 0.58, index: 1 },
        { start: 0.66, end: 0.95, index: 2 }
      ];

      ranges.forEach(range => {
        const block = textBlocks[range.index];
        if (!block) return;

        if (progress >= range.start && progress <= range.end) {
          block.classList.add('active');
        } else {
          block.classList.remove('active');
        }
      });

      // Fade out scroll indicator as user scrolls
      if (scrollIndicator) {
        scrollIndicator.style.opacity = Math.max(0, 1 - progress * 5);
      }
    };

    // --- Main animation loop (runs at display refresh rate) ---
    const LERP_FACTOR = 1;
    const SNAP_THRESHOLD = 0.002;

    const animationLoop = () => {
      // Calculate raw scroll progress
      targetProgress = calculateScrollProgress();

      // Smooth interpolation toward target
      const delta = targetProgress - currentProgress;
      if (Math.abs(delta) > SNAP_THRESHOLD) {
        currentProgress += delta * LERP_FACTOR;
      } else {
        currentProgress = targetProgress;
      }

      // Apple-style frame mapping:
      // progress = 0 → frame 0 (first frame / dry terrain)
      // progress = 1 → frame 79 (last frame / irrigated farm)
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(currentProgress * frameCount)
      );

      // Render the frame
      if (frameIndex !== currentDisplayFrame || lastRenderedFrame === -1) {
        currentDisplayFrame = frameIndex;
        renderFrame(frameIndex);
      }

      // Update text overlays
      updateTextOverlays(currentProgress);

      requestAnimationFrame(animationLoop);
    };

    // Start animation loop immediately
    requestAnimationFrame(animationLoop);

    // --- Resize listener ---
    window.addEventListener('resize', () => {
      resizeCanvas();
      renderFrame(currentDisplayFrame);
    });
  }

  // --- REVEAL ON SCROLL ANIMATION ---
  const revealElements = document.querySelectorAll('.reveal-up');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target); // Trigger once
        }
      });
    }, {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    // Add indexes for staggered delay calculation
    const staggerContainers = document.querySelectorAll('.stagger-container');
    staggerContainers.forEach(container => {
      const children = container.querySelectorAll('.reveal-up');
      children.forEach((child, index) => {
        child.style.setProperty('--stagger-index', index);
      });
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // --- STATS COUNTER ANIMATION ---
  const statsSection = document.getElementById('results');
  const stats = document.querySelectorAll('.stat-number');

  if (statsSection && stats.length > 0) {
    let countersStarted = false;

    const startCounters = () => {
      stats.forEach(stat => {
        const targetStr = stat.getAttribute('data-target');
        // Extract raw number and any suffix like '+' or 'm'
        const rawNum = parseInt(targetStr.replace(/\D/g, ''), 10);
        const suffix = targetStr.replace(/[0-9]/g, '');

        let count = 0;
        const duration = 1800; // Total animation milliseconds
        const frameTime = 1000 / 60; // 60fps frame duration
        const steps = duration / frameTime;
        const increment = rawNum / steps;

        const updateCount = () => {
          count += increment;
          if (count >= rawNum) {
            stat.textContent = rawNum + suffix;
          } else {
            stat.textContent = Math.floor(count) + suffix;
            requestAnimationFrame(updateCount);
          }
        };

        requestAnimationFrame(updateCount);
      });
    };

    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersStarted) {
          countersStarted = true;
          startCounters();
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statsObserver.observe(statsSection);
  }

  // --- CONTACT MODAL (WHATSAPP MODAL) ---
  const modal = document.getElementById('contact-modal');
  const openModalBtns = document.querySelectorAll('.open-modal');
  const closeModalBtn = document.querySelector('.modal-close');

  if (modal) {
    const openModal = (e) => {
      e.preventDefault();
      modal.style.display = 'flex';
      setTimeout(() => {
        modal.classList.add('active');
      }, 10);
      document.body.style.overflow = 'hidden'; // Stop background scrolling
    };

    const closeModal = () => {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
      document.body.style.overflow = '';
    };

    openModalBtns.forEach(btn => btn.addEventListener('click', openModal));
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
    }

    // Close when clicking outside content box
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // --- FORM SUBMIT INTEGRATION (WHATSAPP REDIRECT) ---
  const contactForm = document.getElementById('lead-contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = document.getElementById('form-name').value;
      const tel = document.getElementById('form-phone').value;
      const email = document.getElementById('form-email').value;
      const msg = document.getElementById('form-message') ? document.getElementById('form-message').value : '';

      // Build custom message
      const intro = `Olá, gostaria de solicitar um orçamento para perfuração de poço artesiano.`;
      const details = `\n\nNome: ${nome}\nWhatsApp: ${tel}\nE-mail: ${email}${msg ? `\nMensagem: ${msg}` : ''}`;
      const fullMessage = encodeURIComponent(intro + details);

      // Conversion trigger event (gtag and facebook)
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', { 'send_to': 'AW-11030424545/SuvhCJvoxYMYEOHX24sp' });
      }
      if (typeof fbq === 'function') {
        fbq('track', 'Lead');
      }

      // WhatsApp link - using user's original approved conversion link number
      const whatsappNumber = '55011998671054';
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${fullMessage}`;

      // Open in a new window/tab
      window.open(whatsappUrl, '_blank');

      // Close modal
      if (modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
        setTimeout(() => {
          modal.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
      }
    });
  }
});
