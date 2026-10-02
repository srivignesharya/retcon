// RETCON Visual Design System & Theme Engine
// Comic-noir limited palette, consistent typography scale, and reusable component renderers.

const THEME = {
  // STRICT COLOR PALETTE (comic-noir)
  colors: {
    ink: '#1a1a2e',        // Background/ink: deep navy-black, used for outlines & panels
    paper: '#fdf6e3',      // Paper: warm cream, used for backgrounds of UI panels
    primary: '#ff3860',    // Primary accent: hot red/pink, used for important buttons & word pills
    secondary: '#ffd400',  // Secondary accent: comic yellow, used for captions & highlights
    success: '#2ec4b6',    // Success: teal green, used for PLAY/confirm buttons
    info: '#3a86ff',       // Info/neutral: blue, used for secondary buttons
    textDark: '#1a1a2e',   // Text on light backgrounds
    textLight: '#fdf6e3',  // Text on dark backgrounds
    locked: '#6c757d',     // Grey pill for locked words
    lockedBorder: '#343a40'
  },

  // STRICT TYPOGRAPHY SCALE
  typography: {
    displayFont: '"Bangers", "Impact", sans-serif',
    bodyFont: '"Arial Black", "Trebuchet MS", "Impact", sans-serif',
    titleSize: 64,         // Title 64px
    headerSize: 32,        // Section header 32px
    bodySize: 22,          // Body 22px
    smallSize: 16,         // HUD/small 16px
    strokeWidth: 3,        // Consistent 3px dark outline/stroke
    letterSpacing: '1.2px'
  },

  // Cached halftone pattern
  halftonePattern: null,

  init(ctx) {
    if (this.halftonePattern) return;
    const patCanvas = document.createElement('canvas');
    patCanvas.width = 12;
    patCanvas.height = 12;
    const pctx = patCanvas.getContext('2d');
    pctx.fillStyle = 'rgba(26, 26, 46, 0.09)'; // 9% opacity ink dots
    pctx.beginPath();
    pctx.arc(6, 6, 2.2, 0, Math.PI * 2);
    pctx.fill();
    this.halftonePattern = ctx.createPattern(patCanvas, 'repeat');
  },

  // Helper: Apply letter spacing safely
  applyLetterSpacing(ctx, spacing = '1.2px') {
    try {
      ctx.letterSpacing = spacing;
    } catch (e) {}
  },

  // COMPONENT: Standard Comic Button
  // paper/colored bg, 4px ink border, 4px hard offset shadow, lifts 2px on hover, presses flat on click
  drawButton(ctx, { x, y, width, height, text, bg = null, textColor = null, isHovered = false, isPressed = false, fontSize = 28, font = null }) {
    ctx.save();
    const bgColor = bg || this.colors.paper;
    const txtColor = textColor || (bgColor === this.colors.paper ? this.colors.textDark : this.colors.textLight);
    const chosenFont = font || this.typography.displayFont;

    // Hover lifts up 2px; click presses down 2px
    const liftY = isPressed ? 2 : (isHovered ? -2 : 0);
    const shadowOffset = isPressed ? 2 : (isHovered ? 6 : 4);
    const rad = 8;

    // Hard offset shadow (no blur)
    ctx.fillStyle = this.colors.ink;
    ctx.beginPath();
    ctx.roundRect(x + shadowOffset, y + liftY + shadowOffset, width, height, rad);
    ctx.fill();

    // Button body
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y + liftY, width, height, rad);
    ctx.fill();

    // 4px ink border
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.colors.ink;
    ctx.stroke();

    // Button Text with 3px ink stroke for comic pop
    ctx.font = `900 ${fontSize}px ${chosenFont}`;
    this.applyLetterSpacing(ctx, '1.5px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text outline
    ctx.lineWidth = this.typography.strokeWidth;
    ctx.strokeStyle = this.colors.ink;
    ctx.strokeText(text, x + width / 2, y + liftY + height / 2);

    // Text fill
    ctx.fillStyle = txtColor;
    ctx.fillText(text, x + width / 2, y + liftY + height / 2);

    ctx.restore();
  },

  // COMPONENT: Comic Panel
  // 5px ink border, paper/ink bg, subtle halftone texture at 8-10% opacity, 4px hard offset shadow
  drawPanel(ctx, { x, y, width, height, bg = null, shadowOffset = 4, radius = 8, hasHalftone = true }) {
    ctx.save();
    const bgColor = bg || this.colors.paper;

    // Hard offset shadow
    if (shadowOffset > 0) {
      ctx.fillStyle = this.colors.ink;
      ctx.beginPath();
      ctx.roundRect(x + shadowOffset, y + shadowOffset, width, height, radius);
      ctx.fill();
    }

    // Main panel background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    // Halftone dot overlay
    if (hasHalftone && this.halftonePattern) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = this.halftonePattern;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }

    // 5px ink border
    ctx.lineWidth = 5;
    ctx.strokeStyle = this.colors.ink;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();

    ctx.restore();
  },

  // COMPONENT: Comic Speech Bubble
  // Speech bubble with paper background, 4px ink border, 4px hard shadow, and pointer tail
  drawSpeechBubble(ctx, { x, y, width, height, text, tailX = null, tailY = null, fontSize = 20 }) {
    ctx.save();
    const rad = 10;
    const shadowOffset = 4;

    // Tail anchor points
    const tx = tailX !== null ? tailX : (x + width / 2);
    const ty = tailY !== null ? tailY : (y + height + 16);
    const baseCenterX = x + width / 2;

    // Path builder for bubble + tail
    const createBubblePath = (bx, by) => {
      ctx.beginPath();
      ctx.roundRect(bx, by, width, height, rad);
      // Add tail
      ctx.moveTo(baseCenterX - 12, by + height);
      ctx.lineTo(tx, ty);
      ctx.lineTo(baseCenterX + 12, by + height);
    };

    // Hard shadow
    ctx.fillStyle = this.colors.ink;
    createBubblePath(x + shadowOffset, y + shadowOffset);
    ctx.fill();

    // Paper background
    ctx.fillStyle = this.colors.paper;
    createBubblePath(x, y);
    ctx.fill();

    // 4px ink border
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.colors.ink;
    createBubblePath(x, y);
    ctx.stroke();

    // Bubble Text
    ctx.fillStyle = this.colors.textDark;
    ctx.font = `900 ${fontSize}px ${this.typography.bodyFont}`;
    this.applyLetterSpacing(ctx, '1.2px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    ctx.restore();
  },

  // COMPONENT: Torn-Paper Banner Shape (for team credits / titles)
  drawTornPaperBanner(ctx, { x, y, width, height, text }) {
    ctx.save();
    const shadow = 4;
    const teeth = 8;
    const toothW = width / teeth;

    // Torn polygon path generator
    const makeTornPath = (ox, oy) => {
      ctx.beginPath();
      // Top jagged edge
      ctx.moveTo(ox, oy + 4);
      for (let i = 0; i < teeth; i++) {
        const mx = ox + i * toothW + toothW / 2;
        const my = oy + (i % 2 === 0 ? -4 : 4);
        ctx.lineTo(mx, my);
        ctx.lineTo(ox + (i + 1) * toothW, oy);
      }
      ctx.lineTo(ox + width, oy + height - 4);
      // Bottom jagged edge
      for (let i = teeth; i > 0; i--) {
        const mx = ox + (i - 1) * toothW + toothW / 2;
        const my = oy + height + (i % 2 === 0 ? 4 : -4);
        ctx.lineTo(mx, my);
        ctx.lineTo(ox + (i - 1) * toothW, oy + height);
      }
      ctx.closePath();
    };

    // Hard shadow
    ctx.fillStyle = this.colors.ink;
    makeTornPath(x + shadow, y + shadow);
    ctx.fill();

    // Paper body
    ctx.fillStyle = this.colors.paper;
    makeTornPath(x, y);
    ctx.fill();

    // Halftone overlay
    if (this.halftonePattern) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = this.halftonePattern;
      ctx.fillRect(x, y - 6, width, height + 12);
      ctx.restore();
    }

    // 3px ink stroke
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.colors.ink;
    makeTornPath(x, y);
    ctx.stroke();

    // Centered caption text
    ctx.fillStyle = this.colors.textDark;
    ctx.font = `bold ${this.typography.smallSize}px ${this.typography.bodyFont}`;
    this.applyLetterSpacing(ctx, '1.2px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    ctx.restore();
  },

  // COMPONENT: Clickable / Locked Word Pill
  drawWordPill(ctx, { x, y, width, height, word, isLocked = false, isHovered = false, pulse = 0 }) {
    ctx.save();
    const rad = height / 2;
    const scale = isLocked ? 1.0 : (1.0 + pulse * 0.04 + (isHovered ? 0.05 : 0));
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    if (isLocked) {
      // Locked word: grey pill, padlock icon, slightly transparent
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = this.colors.ink;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, width, height, rad);
      ctx.fill();

      ctx.fillStyle = this.colors.locked;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, rad);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = this.colors.ink;
      ctx.stroke();

      // Padlock icon + word
      ctx.fillStyle = this.colors.paper;
      ctx.font = `900 16px ${this.typography.bodyFont}`;
      this.applyLetterSpacing(ctx, '1.2px');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🔒 ${word}`, cx, cy);
    } else {
      // Clickable word: hot pink pill shape (#ff3860), white bold text
      ctx.fillStyle = this.colors.ink;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, width, height, rad);
      ctx.fill();

      ctx.fillStyle = this.colors.primary;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, rad);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = this.colors.ink;
      ctx.stroke();

      // Word text in white bold
      ctx.font = `900 17px ${this.typography.bodyFont}`;
      this.applyLetterSpacing(ctx, '1.4px');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineWidth = this.typography.strokeWidth;
      ctx.strokeStyle = this.colors.ink;
      ctx.strokeText(`[ ${word} ]`, cx, cy);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`[ ${word} ]`, cx, cy);

      // Subtle tap cursor icon on hover
      if (isHovered) {
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '12px sans-serif';
        ctx.fillText('👆', x + width + 4, y + 4);
      }
    }

    ctx.restore();
  },

  // COMPONENT: Comic Star Icon
  drawStar(ctx, cx, cy, radius, filled = true) {
    ctx.save();
    const spikes = 5;
    const step = Math.PI / spikes;
    let rot = (Math.PI / 2) * 3;

    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * radius;
      let y = cy + Math.sin(rot) * radius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * (radius * 0.45);
      y = cy + Math.sin(rot) * (radius * 0.45);
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - radius);
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = this.colors.secondary; // Comic Yellow
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(26, 26, 46, 0.25)'; // Empty grey
      ctx.fill();
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.colors.ink;
    ctx.stroke();

    ctx.restore();
  },

  // COMPONENT: Modern Angled Comic Action Lines (2-3 bold angled speed slashes, NOT a dated full sunburst)
  drawActionLines(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 212, 0, 0.12)'; // Subtle secondary yellow tint
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.35, 0);
    ctx.lineTo(width * 0.15, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 56, 96, 0.08)'; // Subtle hot pink tint
    ctx.beginPath();
    ctx.moveTo(width * 0.65, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height * 0.6);
    ctx.lineTo(width * 0.45, height);
    ctx.closePath();
    ctx.fill();

    // 2 bold sharp ink action accent strokes
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.15);
    ctx.lineTo(width * 0.3, height * 0.85);
    ctx.moveTo(width * 0.7, height * 0.1);
    ctx.lineTo(width * 0.92, height * 0.7);
    ctx.stroke();

    ctx.restore();
  }
};

window.THEME = THEME;
