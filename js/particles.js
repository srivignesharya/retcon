// Particle & Onomatopoeia Comic FX System for RETCON

class FXSystem {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  triggerShake(amount = 8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, amount);
  }

  clear() {
    this.particles = [];
    this.popups = [];
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  // Create comic onomatopoeia popup: "POW!", "RETCON!", "WHOOSH!", "CLICK!"
  addPopup(text, x, y, options = {}) {
    const defaultColor = options.color || '#FFE600';
    const borderColor = options.borderColor || '#000000';
    const scale = options.scale || 1.0;
    const rotation = (Math.random() - 0.5) * 0.4;
    
    this.popups.push({
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: -100 - Math.random() * 50,
      scale: 0.1,
      targetScale: scale,
      rotation,
      color: defaultColor,
      borderColor,
      life: 0.8,
      maxLife: 0.8,
      burstPoints: this.generateBurstPoints(12, 45 * scale, 25 * scale)
    });
  }

  generateBurstPoints(points, outerR, innerR) {
    const pts = [];
    const step = (Math.PI * 2) / (points * 2);
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step;
      pts.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
    return pts;
  }

  // Comic particles (dust puffs, reality sparks, melting bubbles)
  emit(x, y, count = 10, type = 'spark', color = '#FFF') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'dust' ? 20 : 0),
        size: 3 + Math.random() * 6,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color,
        type
      });
    }
  }

  update(dt) {
    // Screen shake update
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity -= dt * 25;
      if (this.shakeIntensity < 0) {
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Update Popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt; // slight gravity
      // Scale pop-in bounce
      if (p.scale < p.targetScale) {
        p.scale += (p.targetScale - p.scale) * 15 * dt;
      }
      if (p.life <= 0) {
        this.popups.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.type === 'dust') {
        pt.vy -= 15 * dt; // buoyant dust
      } else {
        pt.vy += 120 * dt; // gravity for sparks
      }
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // Render particles
    ctx.save();
    for (const pt of this.particles) {
      const alpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#000';

      ctx.beginPath();
      if (pt.type === 'square') {
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        ctx.strokeRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      } else {
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();

    // Render comic popups (Starburst + Bangers font text)
    for (const p of this.popups) {
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);
      ctx.globalAlpha = alpha;

      // Draw burst backdrop
      if (p.burstPoints && p.burstPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(p.burstPoints[0].x, p.burstPoints[0].y);
        for (let i = 1; i < p.burstPoints.length; i++) {
          ctx.lineTo(p.burstPoints[i].x, p.burstPoints[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.stroke();
      }

      // Draw text
      ctx.font = '900 24px "Bangers", "Impact", "Arial Black", sans-serif';
      try { ctx.letterSpacing = '2px'; } catch (e) {}
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(p.text, 0, 0);

      ctx.restore();
    }
  }
}

window.fx = new FXSystem();
