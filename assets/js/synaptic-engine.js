/**
 * SYNAPTIQ lab — Synaptic Canvas Engine
 * High-performance neural network, impulse particles, and interactive force fields
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
      nodeCount: options.nodeCount || 60,
      connectionDist: options.connectionDist || 130,
      cursorDist: 170,
      pulseFrequency: 0.04,
      pulseSpeed: options.pulseSpeed || 1.8,
      mode: options.mode || 'synaptic', // 'synaptic' | 'quantum' | 'waves'
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

    // Mouse & Pointer events strictly bound to this canvas
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.targetX = e.clientX - rect.left;
      this.mouse.targetY = e.clientY - rect.top;
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

    // Click shockwave directly where clicked on this canvas
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.createShockwave(clickX, clickY);
    });

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
    const targetCount = this.width < 768 ? 35 : 60;
    if (this.nodes.length === 0 || Math.abs(this.nodes.length - targetCount) > 20) {
      this.config.nodeCount = targetCount;
      this.spawnNodes();
    }
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
        orbitRadius: Math.random() * 120 + 30
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
      maxRadius: Math.min(this.width, this.height) * 0.65,
      alpha: 1.0,
      speed: 7.5
    });

    // Explosive push away of nodes
    for (let node of this.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 50000 && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = ((220 - dist) / 220) * 12;
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
      }
    }
  }

  setMode(modeName) {
    this.config.mode = modeName;
    if (modeName === 'quantum') {
      this.config.connectionDist = 160;
      // Re-scatter nodes
      for (let n of this.nodes) {
        n.vx = (Math.random() - 0.5) * 4;
        n.vy = (Math.random() - 0.5) * 4;
      }
    } else if (modeName === 'waves') {
      this.config.connectionDist = 110;
    } else {
      this.config.connectionDist = this.width < 768 ? 95 : 130;
    }
  }

  animate() {
    this.time += 0.02;

    // Smooth mouse lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.14;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.14;

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.config.mode === 'waves') {
      this.renderWaves();
    } else if (this.config.mode === 'quantum') {
      this.renderQuantumVortex();
    } else {
      this.renderSynapses();
    }

    this.renderShockwaves();

    this.animId = requestAnimationFrame(() => this.animate());
  }

  renderSynapses() {
    const ctx = this.ctx;
    let connectionsCount = 0;
    const maxDist = this.config.connectionDist;
    const maxDistSq = maxDist * maxDist;
    const cursorDist = this.config.cursorDist;
    const cursorDistSq = cursorDist * cursorDist;

    // 1. Update node physics
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];

      if (this.mouse.isActive) {
        const dx = n.x - this.mouse.x;
        const dy = n.y - this.mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < cursorDistSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (cursorDist - dist) / cursorDist;
          n.vx += (dx / dist) * force * 0.5;
          n.vy += (dy / dist) * force * 0.5;
        }
      }

      // Drag friction
      n.vx *= 0.98;
      n.vy *= 0.98;

      if (Math.abs(n.vx) < 0.15) n.vx += (Math.random() - 0.5) * 0.1;
      if (Math.abs(n.vy) < 0.15) n.vy += (Math.random() - 0.5) * 0.1;

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
          connectionsCount++;
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

      // Connect to mouse pointer
      if (this.mouse.isActive) {
        const mdx = this.mouse.x - a.x;
        const mdy = this.mouse.y - a.y;
        const mdistSq = mdx * mdx + mdy * mdy;
        if (mdistSq < cursorDistSq) {
          const mdist = Math.sqrt(mdistSq);
          const mAlpha = (1 - mdist / cursorDist) * 0.6;
          ctx.strokeStyle = `rgba(56, 189, 248, ${mAlpha})`;
          ctx.lineWidth = 1.2;
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

      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderQuantumVortex() {
    const ctx = this.ctx;
    const centerX = this.mouse.isActive ? this.mouse.x : this.width * 0.5;
    const centerY = this.mouse.isActive ? this.mouse.y : this.height * 0.5;

    // Draw gravity core
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 + Math.sin(this.time * 4) * 8, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];

      // Orbital rotation around center
      n.orbitAngle += (0.015 + (i % 5) * 0.005) * this.config.pulseSpeed;
      const targetX = centerX + Math.cos(n.orbitAngle) * (n.orbitRadius + (i * 2));
      const targetY = centerY + Math.sin(n.orbitAngle) * (n.orbitRadius * 0.65 + (i * 1.5));

      n.x += (targetX - n.x) * 0.12;
      n.y += (targetY - n.y) * 0.12;

      // Draw quantum streak trail
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + (i / this.nodes.length) * 0.35})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(n.x - Math.sin(n.orbitAngle) * 12, n.y + Math.cos(n.orbitAngle) * 8);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();

      // Node particle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderWaves() {
    const ctx = this.ctx;
    const lines = 12;
    const step = 25;
    const mouseX = this.mouse.isActive ? this.mouse.x : this.width * 0.5;
    const mouseY = this.mouse.isActive ? this.mouse.y : this.height * 0.5;

    for (let i = 0; i < lines; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + (i / lines) * 0.25})`;
      ctx.lineWidth = 1.4;

      for (let x = 0; x <= this.width; x += step) {
        const wave1 = Math.sin(x * 0.004 + this.time * 1.2 * this.config.pulseSpeed + i * 0.45) * 35;
        const wave2 = Math.cos(x * 0.007 - this.time * 0.8 + i * 0.3) * 18;
        
        let mouseDistortion = 0;
        const dx = x - mouseX;
        const baseY = this.height * 0.25 + (i * 26) + wave1 + wave2;
        const dy = baseY - mouseY;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < 40000) {
          const dist = Math.sqrt(distSq);
          mouseDistortion = Math.sin((200 - dist) / 200 * Math.PI) * 45;
        }

        const y = baseY + mouseDistortion;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

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
    window.heroEngine = new SynapticEngine('synaptic-canvas');
  }
  if (document.getElementById('sandbox-canvas')) {
    window.sandboxEngine = new SynapticEngine('sandbox-canvas', { mode: 'synaptic', nodeCount: 65 });
  }
});
