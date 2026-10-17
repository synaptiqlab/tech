/**
 * SYNAPTIQ lab — Synaptic Canvas Engine
 * High-performance neural network, impulse particles, and interactive force fields
 * 3 Iconic Modes: Synaptic Mesh, Quantum Vortex, Synaptiq Matrix
 */

class SynapticEngine {
  constructor(canvasId, options = {}) {
    this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.nodes = [];
    this.pulses = [];
    this.shockwaves = [];
    
    // Config parameters
    this.config = {
      nodeCount: options.nodeCount || 115,
      connectionDist: options.connectionDist || 140,
      cursorDist: 420, // 2.5x wider interactive halo
      pulseFrequency: 0.05,
      pulseSpeed: options.pulseSpeed || 1.8,
      mode: options.mode || 'synaptic', // 'synaptic' | 'quantum' | 'matrix'
      colorCyan: '#00f0ff',
      colorBlue: '#38bdf8'
    };

    this.mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      isActive: false
    };

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.animId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Helper to get relative canvas coordinates from PointerEvent or Touch
    const getCanvasCoords = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    // Pointer events (Desktop mouse + touch devices)
    this.canvas.addEventListener('pointermove', (e) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      this.mouse.targetX = coords.x;
      this.mouse.targetY = coords.y;
      this.mouse.isActive = true;

      // Update HUD coordinates if hero
      const hudCoords = document.getElementById('hud-coords');
      if (hudCoords && this.canvas.id === 'synaptic-canvas') {
        hudCoords.textContent = `X: ${Math.round(this.mouse.targetX).toString().padStart(4, '0')} // Y: ${Math.round(this.mouse.targetY).toString().padStart(4, '0')}`;
      }
    }, { passive: true });

    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.isActive = false;
      this.mouse.targetX = -1000;
      this.mouse.targetY = -1000;
    });

    // Tap / Click Shockwave
    this.canvas.addEventListener('click', (e) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      this.createShockwave(coords.x, coords.y);
    });

    // Direct Touch Support for Mobile & Tablets:
    // 1. In sandbox chamber: direct touchmove controls particles / vortex
    if (this.canvas.id === 'sandbox-canvas') {
      this.canvas.style.touchAction = 'none'; // allows fluid finger drag inside sandbox without page scrolling

      const handleTouchMove = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        this.mouse.targetX = coords.x;
        this.mouse.targetY = coords.y;
        this.mouse.isActive = true;
      };

      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          const coords = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
          this.mouse.targetX = coords.x;
          this.mouse.targetY = coords.y;
          this.mouse.isActive = true;
          this.createShockwave(coords.x, coords.y);
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });

      this.canvas.addEventListener('touchend', () => {
        setTimeout(() => {
          this.mouse.isActive = false;
          this.mouse.targetX = -1000;
          this.mouse.targetY = -1000;
        }, 300);
      }, { passive: true });
    } else {
      // 2. In Hero canvas: tapping or touching generates kinetic shockwaves and activates neural attractor
      // without locking or disrupting page vertical scrolling
      const heroContainer = this.canvas.closest('section');
      if (heroContainer) {
        heroContainer.addEventListener('touchstart', (e) => {
          if (!e.touches || e.touches.length === 0) return;
          // Don't intercept clicks on buttons or links
          if (e.target.closest('a, button, input, textarea')) return;

          const touch = e.touches[0];
          const coords = getCanvasCoords(touch.clientX, touch.clientY);
          this.mouse.targetX = coords.x;
          this.mouse.targetY = coords.y;
          this.mouse.isActive = true;
          this.createShockwave(coords.x, coords.y);
        }, { passive: true });

        heroContainer.addEventListener('touchmove', (e) => {
          if (!e.touches || e.touches.length === 0) return;
          const touch = e.touches[0];
          const coords = getCanvasCoords(touch.clientX, touch.clientY);
          this.mouse.targetX = coords.x;
          this.mouse.targetY = coords.y;
          this.mouse.isActive = true;
        }, { passive: true });

        heroContainer.addEventListener('touchend', () => {
          setTimeout(() => {
            this.mouse.isActive = false;
            this.mouse.targetX = -1000;
            this.mouse.targetY = -1000;
          }, 600);
        }, { passive: true });
      }
    }

    this.spawnNodes();
    this.animate();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || this.canvas.clientWidth || window.innerWidth;
    this.height = rect.height || this.canvas.clientHeight || 450;
    
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    // Responsive node count
    const isMobile = this.width < 768;
    const targetCount = isMobile ? 65 : (this.canvas.id === 'sandbox-canvas' ? 120 : 75);
    this.config.nodeCount = targetCount;
    this.config.cursorDist = isMobile ? 260 : 420;
    
    this.spawnNodes();
  }

  spawnNodes() {
    this.nodes = [];
    for (let i = 0; i < this.config.nodeCount; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.35,
        pulseOffset: Math.random() * Math.PI * 2,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 140 + 30
      });
    }

    if (this.canvas.id === 'sandbox-canvas') {
      const el = document.getElementById('sandbox-hud-nodes');
      if (el) el.textContent = `NODES: ${this.nodes.length}`;
    }
  }

  createShockwave(x, y) {
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: Math.min(this.width, this.height) * 0.75,
      alpha: 1.0,
      speed: 8.5
    });

    // Explosive push away of nodes with wave falloff
    for (let node of this.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 100000 && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = ((320 - dist) / 320) * 14;
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
      }
    }
  }

  setMode(modeName) {
    this.config.mode = modeName;
    if (modeName === 'quantum') {
      this.config.connectionDist = 160;
      for (let n of this.nodes) {
        n.vx = (Math.random() - 0.5) * 4;
        n.vy = (Math.random() - 0.5) * 4;
      }
    } else if (modeName === 'matrix') {
      this.config.connectionDist = 80;
    } else {
      // Synaptic Mesh default
      this.config.connectionDist = this.width < 768 ? 105 : 140;
    }
  }

  animate() {
    this.time += 0.02 * this.config.pulseSpeed;

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.14;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.14;

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.config.mode === 'matrix') {
      this.renderKineticMatrix();
    } else if (this.config.mode === 'quantum') {
      this.renderQuantumVortex();
    } else {
      this.renderSynapses();
    }

    this.renderShockwaves();

    this.animId = requestAnimationFrame(() => this.animate());
  }

  /* ==========================================================================
     MODE 1: SYNAPTIQ MESH (2.5x Wider Halo + Wave-delayed Propagation)
     ========================================================================== */
  renderSynapses() {
    const ctx = this.ctx;
    const maxDist = this.config.connectionDist;
    const maxDistSq = maxDist * maxDist;
    const cursorDist = this.config.cursorDist; // ~420px wide!
    const cursorDistSq = cursorDist * cursorDist;

    // Soft radial magnetic glow around cursor
    if (this.mouse.isActive) {
      const haloGrad = ctx.createRadialGradient(
        this.mouse.x, this.mouse.y, 10,
        this.mouse.x, this.mouse.y, cursorDist
      );
      haloGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      haloGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.03)');
      haloGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, cursorDist, 0, Math.PI * 2);
      ctx.fill();

      // Delicate radar concentric ripple
      const rippleR = (this.time * 60) % cursorDist;
      const rippleAlpha = (1 - rippleR / cursorDist) * 0.15;
      ctx.strokeStyle = `rgba(0, 240, 255, ${rippleAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 1. Update node physics with Wave-Delay Falloff
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];

      if (this.mouse.isActive) {
        const dx = n.x - this.mouse.x;
        const dy = n.y - this.mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < cursorDistSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const ratio = dist / cursorDist; // 0 (center) to 1 (outer edge)

          // WAVE MECHANICS:
          // Inner zone (< 0.25): strong, immediate agile push + orbit
          // Mid zone (0.25 - 0.75): wave ripple delay using sine function
          // Outer zone (> 0.75): gentle subtle sway
          if (ratio < 0.25) {
            const innerForce = (1 - ratio / 0.25) * 1.6;
            n.vx += (dx / dist) * innerForce + (-dy / dist) * innerForce * 0.35;
            n.vy += (dy / dist) * innerForce + (dx / dist) * innerForce * 0.35;
          } else {
            // Harmonic wave propagation radiating outward
            const wave = Math.sin(this.time * 5.0 - ratio * 7.5);
            const waveStrength = (1 - ratio) * 0.85;
            n.vx += (dx / dist) * wave * waveStrength;
            n.vy += (dy / dist) * wave * waveStrength;
          }
        }
      }

      // Drag friction
      n.vx *= 0.97;
      n.vy *= 0.97;

      if (Math.abs(n.vx) < 0.12) n.vx += (Math.random() - 0.5) * 0.1;
      if (Math.abs(n.vy) < 0.12) n.vy += (Math.random() - 0.5) * 0.1;

      n.x += n.vx;
      n.y += n.vy;

      // Screen boundary wrap
      if (n.x < -20) n.x = this.width + 20;
      if (n.x > this.width + 20) n.x = -20;
      if (n.y < -20) n.y = this.height + 20;
      if (n.y > this.height + 20) n.y = -20;
    }

    // 2. Render connections & trigger pulses
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];

      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / maxDist) * 0.28;

          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Spawn occasional synaptic impulse pulse along the line
          if (Math.random() < this.config.pulseFrequency * 0.04) {
            this.pulses.push({
              x1: a.x, y1: a.y,
              x2: b.x, y2: b.y,
              progress: 0,
              speed: (Math.random() * 0.015 + 0.01) * this.config.pulseSpeed
            });
          }
        }
      }

      // Connect to mouse pointer within wide halo
      if (this.mouse.isActive) {
        const mdx = this.mouse.x - a.x;
        const mdy = this.mouse.y - a.y;
        const mdistSq = mdx * mdx + mdy * mdy;

        if (mdistSq < cursorDistSq) {
          const mdist = Math.sqrt(mdistSq);
          const mAlpha = Math.pow(1 - mdist / cursorDist, 1.4) * 0.55;
          ctx.strokeStyle = `rgba(56, 189, 248, ${mAlpha})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(this.mouse.x, this.mouse.y);
          ctx.stroke();
        }
      }

      // Draw node core
      const pulseBrightness = 0.6 + 0.4 * Math.sin(this.time * 2 + a.pulseOffset);
      const totalAlpha = a.baseAlpha * pulseBrightness;
      
      // Outer glow
      ctx.fillStyle = `rgba(0, 240, 255, ${totalAlpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Sharp inner core
      ctx.fillStyle = `rgba(255, 255, 255, ${totalAlpha})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render moving synaptic pulses
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.progress += pulse.speed;

      if (pulse.progress >= 1) {
        this.pulses.splice(p, 1);
        continue;
      }

      const px = pulse.x1 + (pulse.x2 - pulse.x1) * pulse.progress;
      const py = pulse.y1 + (pulse.y2 - pulse.y1) * pulse.progress;

      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ==========================================================================
     MODE 2: QUANTUM VORTEX (Orbital Gravitational Vortex)
     ========================================================================== */
  renderQuantumVortex() {
    const ctx = this.ctx;
    const centerX = this.mouse.isActive ? this.mouse.x : this.width * 0.5;
    const centerY = this.mouse.isActive ? this.mouse.y : this.height * 0.5;

    // Draw gravity core ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32 + Math.sin(this.time * 4) * 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 70 + Math.cos(this.time * 3) * 12, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];

      // Orbital rotation around center
      n.orbitAngle += (0.015 + (i % 6) * 0.004) * this.config.pulseSpeed;
      const targetX = centerX + Math.cos(n.orbitAngle) * (n.orbitRadius + (i * 2.2));
      const targetY = centerY + Math.sin(n.orbitAngle) * (n.orbitRadius * 0.65 + (i * 1.6));

      n.x += (targetX - n.x) * 0.12;
      n.y += (targetY - n.y) * 0.12;

      // Draw quantum streak trail
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + (i / this.nodes.length) * 0.4})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(n.x - Math.sin(n.orbitAngle) * 14, n.y + Math.cos(n.orbitAngle) * 9);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();

      // Node particle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ==========================================================================
     MODE 3: SYNAPTIQ MATRIX (Living Undulating 3D Dot Matrix with Liquid Waves)
     ========================================================================== */
  renderKineticMatrix() {
    const ctx = this.ctx;
    const step = 32;
    const mouseX = this.mouse.isActive ? this.mouse.x : this.width * 0.5;
    const mouseY = this.mouse.isActive ? this.mouse.y : this.height * 0.5;
    const maxLensRadius = 300;

    // Crosshair target rings around cursor
    if (this.mouse.isActive) {
      // Soft breathing halo
      const halo = ctx.createRadialGradient(mouseX, mouseY, 10, mouseX, mouseY, maxLensRadius);
      halo.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      halo.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, maxLensRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer delicate radar ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 160, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let x = 18; x < this.width - 10; x += step) {
      for (let y = 18; y < this.height - 10; y += step) {
        // 1. ORGANIC UNDULATING WAVE MOTION (Fluid 3D breathing surface)
        const waveAngle1 = (x * 0.007) + (y * 0.005) + (this.time * 1.6);
        const waveAngle2 = (x * 0.004) - (y * 0.008) - (this.time * 1.2);
        
        // Horizontal & Vertical silky drift
        const waveShiftX = Math.sin(waveAngle1) * 7 + Math.cos(waveAngle2) * 4;
        const waveShiftY = Math.cos(waveAngle1) * 9 + Math.sin(waveAngle2) * 5;
        
        // Depth breathing (point size and glow)
        const depthBreathing = (Math.sin(waveAngle1 * 1.4) + Math.cos(waveAngle2 * 1.2)) * 0.5; // -1 to 1

        let renderX = x + waveShiftX;
        let renderY = y + waveShiftY;
        let pointSize = 1.6 + depthBreathing * 0.5;
        let alpha = 0.22 + depthBreathing * 0.12;

        // 2. MOUSE INTERACTION (Magnetic lens + Wave Ripples)
        if (this.mouse.isActive) {
          const dx = renderX - mouseX;
          const dy = renderY - mouseY;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxLensRadius * maxLensRadius && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / maxLensRadius; // 1 at center, 0 at edge

            // Dynamic ripple radiating from mouse
            const rippleShift = Math.sin(dist * 0.05 - this.time * 5.0) * factor * 12;
            
            // 3D elevation displacement
            const push = (factor * 26) + rippleShift;
            renderX += (dx / dist) * push;
            renderY += (dy / dist) * push;

            pointSize = 1.8 + factor * 3.6;
            alpha = 0.4 + factor * 0.6;

            // Connect nearest elevated points to mouse
            if (dist < 130) {
              ctx.strokeStyle = `rgba(0, 240, 255, ${factor * 0.4})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(renderX, renderY);
              ctx.lineTo(mouseX, mouseY);
              ctx.stroke();
            }
          }
        }

        // Draw matrix dot
        ctx.fillStyle = alpha > 0.65 ? '#ffffff' : `rgba(0, 240, 255, ${Math.max(0.1, alpha)})`;
        ctx.beginPath();
        ctx.arc(renderX, renderY, Math.max(0.8, pointSize), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ==========================================================================
     Shockwaves & Explosive Impulses
     ========================================================================== */
  renderShockwaves() {
    const ctx = this.ctx;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha *= 0.94;

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0.02) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Global initialization of both Hero and Sandbox engines
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('synaptic-canvas')) {
    window.heroEngine = new SynapticEngine('synaptic-canvas', { nodeCount: 65, cursorDist: 380 });
  }
  if (document.getElementById('sandbox-canvas')) {
    window.sandboxEngine = new SynapticEngine('sandbox-canvas', { mode: 'synaptic', nodeCount: 115, cursorDist: 420 });
  }
});
