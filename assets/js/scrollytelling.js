/**
 * SYNAPTIQ lab — Scrollytelling, Kinetic Typography & 3D Fly-Outs
 * Powered by GSAP ScrollTrigger + Lenis Smooth Scroll
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll with GSAP
  let lenis = null;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2
    });
    window.lenis = lenis;

    // Sync Lenis ONLY through GSAP ticker (NEVER double-call raf!)
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(500, 33);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  // 2. Register GSAP Plugins
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    initHeroAnimation();
    initProtocolTerminal();
    initManifestPinAnimation();
    initEcosystemScroll();

    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
    });
  }

  // 3. 3D Tilt Effect on Cards
  initCard3DTilt();

  // 4. Sandbox Controls
  initSandboxControls();

  // 5. Contact Terminal
  initContactTerminal();
});

/* ==========================================================================
   Hero Animation (Smooth Fade-In without layout shifts)
   ========================================================================== */
function initHeroAnimation() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.9 } });

  tl.from('#hero-badge', { opacity: 0, scale: 0.95, delay: 0.1 })
    .from('#hero-title', { opacity: 0, scale: 0.96, duration: 1.0 }, '-=0.6')
    .from('#hero-subtitle', { opacity: 0, duration: 0.8 }, '-=0.6')
    .from('#hero-actions', { opacity: 0, y: 10, duration: 0.7 }, '-=0.5')
    .from('.hero-hud-element', { opacity: 0, stagger: 0.1 }, '-=0.5');
}

/* ==========================================================================
   Protocol Code Terminal Execution Animation
   ========================================================================== */
function initProtocolTerminal() {
  const terminalSec = document.getElementById('protocol-terminal');
  if (!terminalSec) return;

  const codeLines = document.querySelectorAll('#code-lines-container .code-line');
  const statusBadge = document.getElementById('protocol-status-text');
  const statusDot = document.getElementById('protocol-status-dot');
  
  // Console output elements
  const consoleCmd = document.getElementById('console-line-cmd');
  const consoleStep1 = document.getElementById('console-line-step1');
  const consoleStep2 = document.getElementById('console-line-step2');
  const consoleMain = document.getElementById('console-line-main');
  const consoleSuccess = document.getElementById('console-line-success');
  const progressContainer = document.getElementById('console-progress-container');
  const progressBar = document.getElementById('console-progress-bar');
  const progressPct = document.getElementById('console-progress-pct');
  const rerunBtn = document.getElementById('btn-rerun-protocol');

  let hasRun = false;
  let termTl = null;

  function runCodeSequence() {
    if (termTl) termTl.kill();

    // 1. Reset all elements to initial state
    gsap.set(codeLines, { opacity: 0, x: -10 });
    gsap.set([consoleCmd, consoleStep1, consoleStep2, consoleMain, consoleSuccess, progressContainer], { opacity: 0 });
    gsap.set(progressBar, { width: '0%' });
    if (progressPct) progressPct.textContent = '0%';
    
    if (statusBadge) {
      statusBadge.textContent = 'INITIALIZING PROTOCOL...';
      statusBadge.className = 'text-cyan-neon font-bold';
    }
    if (statusDot) {
      statusDot.className = 'w-2 h-2 rounded-full bg-cyan-neon animate-ping';
    }

    termTl = gsap.timeline();

    // Phase 1: Reveal code lines one by one at a readable, deliberate pace
    termTl.to(codeLines, {
      opacity: 1,
      x: 0,
      duration: 0.35,
      stagger: 0.28,
      ease: 'power1.out',
      onComplete: () => {
        if (statusBadge) statusBadge.textContent = 'EXECUTING SCRIPT...';
      }
    });

    // Phase 2: Command prompt execution
    termTl.to(consoleCmd, { opacity: 1, duration: 0.35 }, '+=0.25');

    // Phase 3: "Starting FUTURE PROTOCOL..." appears
    termTl.to(consoleStep1, {
      opacity: 1,
      duration: 0.45,
      ease: 'power2.out',
      onStart: () => {
        if (statusBadge) statusBadge.textContent = 'STARTING FUTURE PROTOCOL...';
      }
    }, '+=0.35');

    // Phase 4: "Preparing the FUTURE..." appears
    termTl.to(consoleStep2, {
      opacity: 1,
      duration: 0.45,
      ease: 'power2.out',
      onStart: () => {
        if (statusBadge) statusBadge.textContent = 'PREPARING THE FUTURE...';
      }
    }, '+=0.35');

    // Phase 5: ">>> Creating the future..." bursts in with neon glow
    termTl.to(consoleMain, {
      opacity: 1,
      scale: 1.02,
      duration: 0.5,
      ease: 'back.out(1.6)',
      onStart: () => {
        if (statusBadge) statusBadge.textContent = 'RUNNING predict_future()...';
      }
    }, '+=0.4');

    // Phase 6: "SUCCESS: Protocol Complete" pops in
    termTl.to(consoleSuccess, {
      opacity: 1,
      duration: 0.45,
      ease: 'power2.out',
      onStart: () => {
        if (statusBadge) {
          statusBadge.textContent = 'SUCCESS: PROTOCOL COMPLETE';
          statusBadge.className = 'text-emerald-400 font-bold';
        }
        if (statusDot) {
          statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        }
      }
    }, '+=0.35');

    // Phase 7: Green Loading Progress Bar fills up (0% to 100%)
    termTl.to(progressContainer, { opacity: 1, duration: 0.3 }, '+=0.2');

    const progressTracker = { value: 0 };
    termTl.to(progressTracker, {
      value: 100,
      duration: 1.3,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.round(progressTracker.value);
        if (progressPct) progressPct.textContent = `${val}%`;
        if (progressBar) progressBar.style.width = `${val}%`;
      },
      onComplete: () => {
        if (statusBadge) {
          statusBadge.textContent = 'SYSTEMS SYNCHRONIZED';
        }
      }
    }, '+=0.1');

    // Phase 8: Smooth auto-scroll to the next block (Manifest)!
    termTl.call(() => {
      const nextSec = document.getElementById('manifest-pin');
      if (window.lenis && nextSec) {
        window.lenis.scrollTo(nextSec, { duration: 1.6, offset: 0 });
      } else if (nextSec) {
        nextSec.scrollIntoView({ behavior: 'smooth' });
      }
    }, null, '+=0.45');
  }

  // ScrollTrigger: Start sequence automatically when user scrolls to terminal
  ScrollTrigger.create({
    trigger: terminalSec,
    start: 'top 70%',
    onEnter: () => {
      if (!hasRun) {
        hasRun = true;
        runCodeSequence();
      }
    }
  });

  // Rerun button handler
  if (rerunBtn) {
    rerunBtn.addEventListener('click', () => {
      runCodeSequence();
    });
  }
}

/* ==========================================================================
   Manifest Section — Fully Automatic Cinematic Sequence (NO Pinning / Scrub)
   ========================================================================== */
function initManifestPinAnimation() {
  const manifestSection = document.querySelector('#manifest-pin');
  if (!manifestSection) return;

  const manifestTl = gsap.timeline({
    scrollTrigger: {
      trigger: manifestSection,
      start: 'top 75%',
      toggleActions: 'play none none none'
    }
  });

  // 1. Core Slogan reveals
  manifestTl.fromTo(
    '#manifest-heading',
    { scale: 0.94, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
  );

  // 2. The Problem: Generic websites are obsolete
  manifestTl.fromTo(
    '#manifest-sub',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    '-=0.2'
  );

  // 3. The Solution Manifesto
  manifestTl.fromTo(
    '#manifest-desc',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    '-=0.2'
  );

  // 4. 3D Cards automatically fly in from left & right
  manifestTl.fromTo(
    '#flyout-left',
    { x: -100, rotateY: 20, opacity: 0 },
    { x: 0, rotateY: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
    '-=0.1'
  );

  manifestTl.fromTo(
    '#flyout-right',
    { x: 100, rotateY: -20, opacity: 0 },
    { x: 0, rotateY: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
    '-=0.75'
  );
}

/* ==========================================================================
   Ecosystem Project Reveals
   ========================================================================== */
function initEcosystemScroll() {
  gsap.utils.toArray('.project-card-reveal').forEach((card, index) => {
    gsap.fromTo(
      card,
      { y: 80, opacity: 0, filter: 'blur(8px)' },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
}

/* ==========================================================================
   3D Tilt Card Interaction
   ========================================================================== */
function initCard3DTilt() {
  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* ==========================================================================
   Sandbox Controls & Physics Switcher
   ========================================================================== */
function initSandboxControls() {
  const modeButtons = document.querySelectorAll('[data-sandbox-mode]');
  const hudMode = document.getElementById('sandbox-hud-mode');

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => {
        b.classList.remove('active', 'border-cyan-400', 'text-cyan-400', 'bg-cyan-950/40');
        b.classList.add('border-white/10', 'text-white/60', 'bg-white/5');
      });

      btn.classList.add('active', 'border-cyan-400', 'text-cyan-400', 'bg-cyan-950/40');
      btn.classList.remove('border-white/10', 'text-white/60', 'bg-white/5');

      const mode = btn.getAttribute('data-sandbox-mode');
      if (hudMode) {
        hudMode.textContent = `MODE: ${btn.textContent.trim()}`;
      }

      if (window.sandboxEngine) {
        window.sandboxEngine.setMode(mode);
      }
      if (window.heroEngine) {
        window.heroEngine.setMode(mode);
      }
    });
  });

  // Pulse speed slider
  const speedSlider = document.getElementById('slider-speed');
  const speedVal = document.getElementById('slider-speed-val');
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (speedVal) {
        speedVal.textContent = `${val.toFixed(1)}x`;
      }
      if (window.sandboxEngine) {
        window.sandboxEngine.config.pulseSpeed = val;
      }
      if (window.heroEngine) {
        window.heroEngine.config.pulseSpeed = val;
      }
    });
  }

  // Business switcher in Pulse Core card
  const bizTabs = document.querySelectorAll('[data-biz-tab]');
  const metricRevenue = document.getElementById('metric-rev');
  const metricSync = document.getElementById('metric-sync');
  const metricStatus = document.getElementById('metric-status');

  const bizData = {
    barber: { rev: '+46.8%', sync: '0.04s', status: 'SHIFT & PAY ONLINE' },
    gastro: { rev: '+34.2%', sync: '0.08s', status: 'TABLE QR ACTIVE' },
    cowork: { rev: '+58.0%', sync: '0.02s', status: 'ACCESS SMART PASS' }
  };

  bizTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      bizTabs.forEach((t) => t.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-400/40'));
      tab.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-400/40');

      const key = tab.getAttribute('data-biz-tab');
      if (bizData[key] && metricRevenue && metricSync && metricStatus) {
        metricRevenue.textContent = bizData[key].rev;
        metricSync.textContent = bizData[key].sync;
        metricStatus.textContent = bizData[key].status;
      }
    });
  });
}

/* ==========================================================================
   Contact Terminal Copy
   ========================================================================== */
function initContactTerminal() {
  const copyBtn = document.getElementById('btn-copy-contact');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('@litt1e_roo').then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-emerald-400">COPIED: @litt1e_roo</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2200);
      });
    });
  }
}
