// Comic Book Visual Pipeline & Renderer for RETCON
// Features: Two-line caption box, typewriter dialogue display,
// Night lighting circle mask around hero with moonlit beam, pushable speech bubbles,
// solid caption platform, glowing panel border break, stars display, and strict draw order.

class ComicRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // Create procedural halftone pattern
    this.halftonePattern = this.createHalftonePattern();
    this.cloudOffset = 0;
  }

  createHalftonePattern() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 8;
    patternCanvas.height = 8;
    const pctx = patternCanvas.getContext('2d');
    pctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    pctx.beginPath();
    pctx.arc(4, 4, 1.6, 0, Math.PI * 2);
    pctx.fill();
    return this.ctx.createPattern(patternCanvas, 'repeat');
  }

  // Draw order (bottom to top):
  // sky -> sun/clouds -> platforms -> vine -> exit -> beasts -> hero -> night lighting -> particles -> HUD -> caption
  render(dt, state, hero, ruleEngine, fx, mousePos) {
    const ctx = this.ctx;
    ctx.save();
    try { ctx.letterSpacing = '1.5px'; } catch (e) {}

    // Apply Screen Shake
    if (fx && (fx.shakeOffsetX !== 0 || fx.shakeOffsetY !== 0)) {
      ctx.translate(fx.shakeOffsetX, fx.shakeOffsetY);
    }

    const timeWord = ruleEngine.words.time || 'DAY';
    const weatherWord = ruleEngine.words.weather || 'DRY';

    // 1. SKY & SUN/CLOUDS (Kept away from top caption box and right exit door)
    this.renderBackdrop(ctx, timeWord, dt);
    if (weatherWord === 'RAIN') {
      this.renderRain(ctx, dt);
    }

    // 2. PLATFORMS (Static ground/cliffs and dynamic: bridges, shadow ramps, cracked floors, switches, pushable blocks)
    this.renderSolids(ctx, state.currentLevel.solids);
    this.renderPlatforms(ctx, state.currentLevel.entities, ruleEngine);

    // 3. VINES
    this.renderVines(ctx, state.currentLevel.entities, ruleEngine);

    // 4. EXIT DOOR (with white outline glow so it always stands out)
    if (state.currentLevel.exit) {
      this.renderExit(ctx, state.currentLevel.exit, state.currentLevel.panelBorderExit);
    }

    // 5. BEASTS & GUARDS
    this.renderBeastsAndGuards(ctx, state.currentLevel.entities, ruleEngine);

    // 6. HERO ("Ed the Editor")
    hero.render(ctx);

    // 7. NIGHT LIGHTING: Soft light circle around hero + moonbeam
    if (timeWord === 'NIGHT') {
      this.renderNightLighting(ctx, hero);
    }

    // 8. PARTICLES & ONOMATOPOEIA POPUPS
    if (fx) {
      fx.render(ctx);
    }

    // 9. HALFTONE OVERLAY & COMIC PANEL BORDER
    if (this.halftonePattern) {
      ctx.fillStyle = this.halftonePattern;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    this.renderPanelBorder(ctx, state.currentLevel);

    // 10. HUD (Bottom bar: title left, retries center, controls right)
    this.renderBottomHUD(ctx, state, mousePos);

    // 11. CAPTION (Top yellow narrator box with 2 lines of interactive words & typewriter speech)
    this.renderNarratorBox(ctx, state.currentLevel, ruleEngine, mousePos);

    ctx.restore();
  }

  renderBackdrop(ctx, time, dt) {
    this.cloudOffset = (this.cloudOffset + dt * 12) % this.width;

    if (time === 'DAY') {
      const grad = ctx.createLinearGradient(0, 0, 0, 480);
      grad.addColorStop(0, '#56CFE1');
      grad.addColorStop(0.6, '#90E0EF');
      grad.addColorStop(1, '#CAF0F8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Comic Sun positioned safely below narrator box & subtitle (x: 190, y: 250)
      ctx.fillStyle = '#FFDD00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(190, 250, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(190, 250);
      for (let i = 0; i < 8; i++) {
        ctx.rotate((Math.PI * 2) / 8);
        ctx.fillStyle = '#FFB703';
        ctx.beginPath();
        ctx.moveTo(50, -7);
        ctx.lineTo(68, 0);
        ctx.lineTo(50, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      this.drawCloud(ctx, (130 - this.cloudOffset * 0.4 + this.width) % this.width, 210, 1.0);
      this.drawCloud(ctx, (430 - this.cloudOffset * 0.2 + this.width) % this.width, 240, 0.85);

    } else if (time === 'SUNSET') {
      const grad = ctx.createLinearGradient(0, 0, 0, 500);
      grad.addColorStop(0, '#7209B7');
      grad.addColorStop(0.35, '#F72585');
      grad.addColorStop(0.7, '#FF758F');
      grad.addColorStop(1, '#FFB703');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#FFDD00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(260, 360, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#240046';
      ctx.fillRect(0, 420, this.width, 180);

    } else if (time === 'NIGHT') {
      const grad = ctx.createLinearGradient(0, 0, 0, 500);
      grad.addColorStop(0, '#0D1B2A');
      grad.addColorStop(0.5, '#1B263B');
      grad.addColorStop(1, '#415A77');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#E0E1DD';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(150, 160, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0D1B2A';
      ctx.beginPath();
      ctx.arc(166, 150, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      const starCoords = [[280, 150], [380, 180], [500, 140], [620, 170], [340, 220]];
      for (const [sx, sy] of starCoords) {
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
    }
  }

  drawCloud(ctx, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(0, 0, 24, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(22, -18, 24, Math.PI * 0.8, Math.PI * 1.9);
    ctx.arc(54, -20, 20, Math.PI * 1.1, Math.PI * 2.1);
    ctx.arc(76, 0, 24, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  renderRain(ctx, dt) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.75)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const rx = (i * 27 + (Date.now() * 0.3) % 960) % 960;
      const ry = ((i * 43 + Date.now() * 0.8) % 550) + 60;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderSolids(ctx, solids) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';

    for (const s of solids) {
      ctx.fillStyle = s.color || '#332B3A';
      ctx.fillRect(s.x, s.y, s.width, s.height);
      ctx.strokeRect(s.x, s.y, s.width, s.height);

      ctx.fillStyle = '#221C26';
      ctx.fillRect(s.x, s.y, s.width, 8);
    }
    ctx.restore();
  }

  renderPlatforms(ctx, entities, ruleEngine) {
    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#000000';

    for (const ent of entities) {
      const state = ruleEngine.evaluateEntity(ent);

      if (ent.type === 'bridge') {
        if (ruleEngine.words.bridge === 'STONE') {
          ctx.fillStyle = '#7A7A7A';
          ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
          ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);
          ctx.fillStyle = '#555';
          for (let bx = ent.x; bx < ent.x + ent.width - 30; bx += 40) {
            ctx.strokeRect(bx, ent.y, 40, ent.height);
          }
        } else if (ruleEngine.words.bridge === 'ICE') {
          if (state.solid) {
            ctx.fillStyle = '#A0E8FF';
            ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
            ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(ent.x + 20, ent.y + 4, ent.width - 40, 4);
          } else {
            ctx.fillStyle = 'rgba(56, 182, 255, 0.45)';
            ctx.fillRect(ent.x, ent.y + 12, ent.width, 10);
          }
        }
      } else if (ent.type === 'shadow_ramp') {
        if (state.solid) {
          ctx.fillStyle = '#220F35';
          ctx.beginPath();
          ctx.moveTo(ent.x, ent.y + ent.height);
          ctx.lineTo(ent.x + ent.width, ent.y);
          ctx.lineTo(ent.x + ent.width, ent.y + ent.height);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000000';
          ctx.stroke();

          ctx.strokeStyle = '#432168';
          ctx.lineWidth = 2;
          for (let s = 40; s < ent.width; s += 50) {
            const rx = ent.x + s;
            const ry = ent.y + ent.height - (s / ent.width) * ent.height;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 8, ry + 12);
            ctx.stroke();
          }

          const slopeAngle = -Math.atan2(ent.height, ent.width);
          const labelX = ent.x + ent.width * 0.46;
          const labelY = (ent.y + ent.height - 0.46 * ent.height) - 30;

          ctx.save();
          ctx.translate(labelX, labelY);
          ctx.rotate(slopeAngle);

          ctx.fillStyle = '#FFE500';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(-75, -14, 150, 26, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = '900 13px "Bangers", "Impact", sans-serif';
          ctx.letterSpacing = '1.5px';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SOLID SHADOW RAMP', 0, 1);
          ctx.restore();

        } else if (state.visible) {
          ctx.fillStyle = 'rgba(15, 10, 30, 0.25)';
          ctx.beginPath();
          ctx.roundRect(ent.x + 60, ent.y + ent.height - 8, ent.width - 60, 8, 4);
          ctx.fill();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.font = '900 12px "Bangers", sans-serif';
          ctx.letterSpacing = '1px';
          ctx.textAlign = 'center';
          ctx.fillText('FLAT SHADOW (NOT SOLID)', ent.x + ent.width * 0.6, ent.y + ent.height - 12);
        }
      } else if (ent.type === 'cracked_floor') {
        if (!ent.broken) {
          ctx.fillStyle = '#8D7B68';
          ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
          ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);

          // Crack jagged lines
          ctx.strokeStyle = '#3D312A';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ent.x + 30, ent.y);
          ctx.lineTo(ent.x + 50, ent.y + 12);
          ctx.lineTo(ent.x + 70, ent.y + 6);
          ctx.lineTo(ent.x + 100, ent.y + 24);
          ctx.moveTo(ent.x + 160, ent.y);
          ctx.lineTo(ent.x + 190, ent.y + 18);
          ctx.lineTo(ent.x + 220, ent.y);
          ctx.stroke();

          ctx.fillStyle = '#000';
          ctx.font = '900 11px "Bangers", sans-serif';
          ctx.fillText('CRACKED (STOMPABLE)', ent.x + 20, ent.y + 16);
        }
      } else if (ent.type === 'speech_bubble_block') {
        // Pushable Speech Bubble block
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 8);
        ctx.fill();
        ctx.stroke();

        // Speech bubble pointer tail
        ctx.beginPath();
        ctx.moveTo(ent.x + 10, ent.y + ent.height);
        ctx.lineTo(ent.x + 4, ent.y + ent.height + 8);
        ctx.lineTo(ent.x + 18, ent.y + ent.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = '900 15px "Bangers", "Impact", sans-serif';
        ctx.letterSpacing = '1px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ent.text || '"HEFT!"', ent.x + ent.width / 2, ent.y + ent.height / 2);
      }
    }
    ctx.restore();
  }

  renderVines(ctx, entities, ruleEngine) {
    ctx.save();
    for (const ent of entities) {
      if (ent.type !== 'vine') continue;
      const state = ruleEngine.evaluateEntity(ent);

      if (state.climbable) {
        ctx.fillStyle = '#38B000';
        ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);

        ctx.fillStyle = '#70E000';
        for (let vy = ent.y + 18; vy < ent.y + ent.height; vy += 32) {
          ctx.beginPath();
          ctx.arc(ent.x - 6, vy, 9, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width + 6, vy + 10, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#8A5A36';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ent.x + ent.width / 2, ent.y + ent.height - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  renderExit(ctx, exit, isBorderBreak = false) {
    ctx.save();
    if (isBorderBreak) {
      // Fourth wall: glowing portal into next panel
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 6;
      ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);

      ctx.fillStyle = '#FFE500';
      ctx.font = '900 13px "Bangers", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT PANEL ➔', exit.x + exit.width / 2, exit.y - 12);
      ctx.restore();
      return;
    }

    // Standard Exit Door with white outline glow
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.strokeRect(exit.x - 2, exit.y - 2, exit.width + 4, exit.height + 4);
    ctx.shadowBlur = 0;

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#2B2D42';
    ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
    ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);

    const glowGrad = ctx.createLinearGradient(exit.x, exit.y, exit.x, exit.y + exit.height);
    glowGrad.addColorStop(0, '#52B788');
    glowGrad.addColorStop(1, '#74C69D');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(exit.x + 5, exit.y + 6, exit.width - 10, exit.height - 6);

    ctx.fillStyle = '#D90429';
    ctx.fillRect(exit.x - 4, exit.y - 18, exit.width + 8, 18);
    ctx.strokeRect(exit.x - 4, exit.y - 18, exit.width + 8, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 13px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exit.x + exit.width / 2, exit.y - 5);
    ctx.restore();
  }

  renderBeastsAndGuards(ctx, entities, ruleEngine) {
    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#000000';

    for (const ent of entities) {
      const state = ruleEngine.evaluateEntity(ent);

      if (ent.type === 'beast') {
        if (state.dissolved) {
          ctx.fillStyle = '#FFDD00';
          ctx.fillRect(ent.x + 20, ent.y + 40, 6, 6);
          ctx.fillRect(ent.x + 50, ent.y + 20, 8, 8);
        } else {
          ctx.fillStyle = state.color;
          ctx.beginPath();
          ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 12);
          ctx.fill();
          ctx.stroke();

          // Glowing beast eyes piercing through the dark
          ctx.save();
          const eyeColor = state.lethal ? '#FF0055' : '#8A99AD';
          ctx.shadowColor = eyeColor;
          ctx.shadowBlur = 10;
          ctx.fillStyle = eyeColor;
          ctx.beginPath();
          ctx.arc(ent.x + 24, ent.y + 32, 6, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width - 24, ent.y + 32, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.moveTo(ent.x + 10, ent.y);
          ctx.lineTo(ent.x + 18, ent.y - 18);
          ctx.lineTo(ent.x + 28, ent.y);
          ctx.moveTo(ent.x + ent.width - 28, ent.y);
          ctx.lineTo(ent.x + ent.width - 18, ent.y - 18);
          ctx.lineTo(ent.x + ent.width - 10, ent.y);
          ctx.fillStyle = state.color;
          ctx.fill();
          ctx.stroke();
        }
      } else if (ent.type === 'narrator_boss') {
        ctx.save();
        if (state.lethal) {
          // Evil Narrator (VILLAIN)
          ctx.fillStyle = '#3A0CA3';
          ctx.beginPath();
          ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 16);
          ctx.fill();
          ctx.stroke();

          // Sinister eyes
          ctx.fillStyle = '#FF0055';
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(ent.x + 24, ent.y + 36, 7, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width - 24, ent.y + 36, 7, 0, Math.PI * 2);
          ctx.fill();

          // Lightning crackles
          ctx.strokeStyle = '#FFE500';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ent.x - 10, ent.y + 20);
          ctx.lineTo(ent.x - 2, ent.y + 40);
          ctx.lineTo(ent.x - 14, ent.y + 60);
          ctx.stroke();
        } else {
          // Heroic Narrator (HERO)
          ctx.fillStyle = '#00B4D8';
          ctx.beginPath();
          ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 16);
          ctx.fill();
          ctx.stroke();

          // Friendly eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(ent.x + 24, ent.y + 36, 7, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width - 24, ent.y + 36, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(ent.x + 25, ent.y + 36, 3.5, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width - 23, ent.y + 36, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Smiling expression
          ctx.beginPath();
          ctx.arc(ent.x + ent.width / 2, ent.y + 62, 14, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }

        ctx.fillStyle = '#000';
        ctx.font = '900 15px "Bangers", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.label, ent.x + ent.width / 2, ent.y - 12);
        ctx.restore();
      } else if (ent.type === 'guard') {
        ctx.fillStyle = state.color;
        ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
        ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);

        ctx.fillStyle = '#FFDD00';
        ctx.fillRect(ent.x + 8, ent.y + 16, ent.width - 16, 8);

        ctx.fillStyle = '#000';
        ctx.font = '900 14px "Bangers", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(state.label, ent.x + ent.width / 2, ent.y - 10);
      }
    }
    ctx.restore();
  }

  // Soft light circle around hero in the dark + moonbeam
  renderNightLighting(ctx, hero) {
    ctx.save();
    const heroX = hero.x + hero.width / 2;
    const heroY = hero.y + hero.height / 2;

    const radGrad = ctx.createRadialGradient(heroX, heroY, 20, heroX, heroY, 175);
    radGrad.addColorStop(0, 'rgba(10, 14, 28, 0.0)');
    radGrad.addColorStop(0.35, 'rgba(10, 14, 28, 0.35)');
    radGrad.addColorStop(0.7, 'rgba(10, 14, 28, 0.78)');
    radGrad.addColorStop(1, 'rgba(10, 14, 28, 0.92)');

    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle moonbeam ray
    ctx.fillStyle = 'rgba(200, 230, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(150, 160);
    ctx.lineTo(heroX - 50, heroY);
    ctx.lineTo(heroX + 50, heroY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  renderPanelBorder(ctx, level) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(4, 4, this.width - 8, this.height - 8);

    if (level.panelBorderExit) {
      // Glow breach on right border
      ctx.save();
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(this.width - 4, 380);
      ctx.lineTo(this.width - 4, 490);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Two-line comic narrator caption box with design system component
  renderNarratorBox(ctx, level, ruleEngine, mousePos) {
    ctx.save();
    THEME.init(ctx);

    const boxX = 40;
    const boxY = level.solidCaptionBox ? 64 : 14;
    const boxW = this.width - 80;

    // Check if 2 lines
    const lines = (level.captionTemplate || "").split('\n');
    const isMultiLine = lines.length > 1;
    const boxH = isMultiLine ? 80 : 62;

    // Hard offset shadow (4px, no blur)
    ctx.fillStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.roundRect(boxX + 5, boxY + 5, boxW, boxH, 8);
    ctx.fill();

    // Solid Caption Box highlight if level has fourth wall feature
    if (level.solidCaptionBox) {
      ctx.fillStyle = THEME.colors.primary;
      ctx.beginPath();
      ctx.roundRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8, 10);
      ctx.fill();
    }

    // Classic Comic Yellow Caption Panel (#ffd400)
    ctx.fillStyle = THEME.colors.secondary;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    // Halftone overlay on caption box
    if (THEME.halftonePattern) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 8);
      ctx.clip();
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.restore();
    }

    // 5px Ink Border
    ctx.lineWidth = 5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.stroke();

    // Jagged comic panel top transition notch
    ctx.fillStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.moveTo(boxX + 16, boxY);
    ctx.lineTo(boxX + 26, boxY - 5);
    ctx.lineTo(boxX + 36, boxY);
    ctx.closePath();
    ctx.fill();

    // "NARRATOR" Comic Badge
    const badgeW = 90;
    const badgeH = 20;
    ctx.fillStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.roundRect(boxX + 14, boxY - 10, badgeW, badgeH, 4);
    ctx.fill();

    ctx.fillStyle = THEME.colors.paper;
    ctx.font = `900 12px ${THEME.typography.displayFont}`;
    THEME.applyLetterSpacing(ctx, '1.5px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.solidCaptionBox ? 'SOLID BOX' : 'NARRATOR', boxX + 14 + badgeW / 2, boxY);

    ruleEngine.wordBoxes = [];
    let isHoveringAnyWord = false;
    const pulse = Math.sin(Date.now() * 0.007) * 1.5;

    // Readable Komika/Arial Black caption font (min 20px padding)
    const captionFontSize = isMultiLine ? 18 : 22;
    ctx.font = `900 ${captionFontSize}px ${THEME.typography.bodyFont}`;
    THEME.applyLetterSpacing(ctx, '1.2px');
    ctx.textBaseline = 'middle';

    lines.forEach((lineText, lineIdx) => {
      const centerY = isMultiLine ? (boxY + 26 + lineIdx * 32) : (boxY + boxH / 2 + 1);
      const tokens = lineText.split(/(\[[a-zA-Z0-9_]+\])/g);

      let totalWidth = 0;
      const renderedParts = [];

      for (const token of tokens) {
        if (!token) continue;
        const match = token.match(/^\[([a-zA-Z0-9_]+)\]$/);
        if (match) {
          const key = match[1];
          const val = ruleEngine.words[key] || key.toUpperCase();
          const displayWord = val;
          // Measured with padding + 8px margin
          const width = ctx.measureText(`[ ${displayWord} ]`).width + 16;
          renderedParts.push({ isWord: true, key, word: displayWord, width });
          totalWidth += width + 16; // 8px margin before and after
        } else {
          const width = ctx.measureText(token).width;
          renderedParts.push({ isWord: false, text: token, width });
          totalWidth += width;
        }
      }

      // Center line with guaranteed min 20px padding
      let startX = Math.max(boxX + 24, boxX + (boxW - totalWidth) / 2);

      for (const part of renderedParts) {
        if (part.isWord) {
          startX += 8; // 8px margin before pill
          const isLocked = ruleEngine.isWordLocked(part.key);
          const btnH = isMultiLine ? 28 : 34;
          const wBox = {
            key: part.key,
            x: startX,
            y: centerY - btnH / 2,
            width: part.width,
            height: btnH,
            isLocked
          };
          ruleEngine.wordBoxes.push(wBox);

          const isHovered = mousePos &&
            mousePos.x >= wBox.x && mousePos.x <= wBox.x + wBox.width &&
            mousePos.y >= wBox.y && mousePos.y <= wBox.y + wBox.height;

          if (isHovered) isHoveringAnyWord = true;

          // Draw using THEME component system
          THEME.drawWordPill(ctx, {
            x: wBox.x,
            y: wBox.y,
            width: wBox.width,
            height: wBox.height,
            word: part.word,
            isLocked,
            isHovered,
            pulse: isHovered ? 1.0 : (pulse > 0 ? pulse : 0)
          });

          // Visible circular countdown timer above locked word
          if (isLocked) {
            const remaining = ruleEngine.getLockRemaining(part.key);
            const progress = ruleEngine.getLockProgress(part.key);
            this.drawLockCountdown(ctx, {
              x: wBox.x,
              y: wBox.y,
              width: wBox.width,
              height: wBox.height,
              remaining,
              progress
            });
          }

          startX += part.width + 8; // 8px margin after pill
        } else {
          ctx.fillStyle = THEME.colors.textDark;
          ctx.font = `900 ${captionFontSize}px ${THEME.typography.bodyFont}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(part.text, startX, centerY);
          startX += part.width;
        }
      }
    });

    if (this.canvas) {
      this.canvas.style.cursor = isHoveringAnyWord ? 'pointer' : 'default';
    }

    // Typewriter Subtitle Box below caption using paper panel
    if (window.narratorVoice && window.narratorVoice.currentText) {
      const subY = boxY + boxH + 8;
      ctx.font = `bold ${THEME.typography.smallSize}px ${THEME.typography.bodyFont}`;
      THEME.applyLetterSpacing(ctx, '1.2px');
      const textW = ctx.measureText("NARRATOR: " + window.narratorVoice.currentText).width + 24;
      const subX = 480 - textW / 2;

      THEME.drawPanel(ctx, {
        x: subX,
        y: subY,
        width: textW,
        height: 28,
        bg: THEME.colors.paper,
        shadowOffset: 3,
        radius: 6,
        hasHalftone: true
      });

      ctx.fillStyle = THEME.colors.textDark;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("NARRATOR: " + window.narratorVoice.currentText, 480, subY + 14);
    }

    ctx.restore();
  }

  // HUD: Fixed height 48px at the bottom (y: 552 to 600)
  // 3 zones with equal padding: Left: level name, Center: retries & stars, Right: expandable controls
  renderBottomHUD(ctx, state, mousePos) {
    ctx.save();
    THEME.init(ctx);

    const hudH = 48;
    const hudY = this.height - hudH;

    // Fixed 48px HUD panel background (Paper background with 4px ink top border & shadow)
    ctx.fillStyle = THEME.colors.paper;
    ctx.fillRect(0, hudY, this.width, hudH);

    // Subtle halftone dot overlay
    if (THEME.halftonePattern) {
      ctx.save();
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(0, hudY, this.width, hudH);
      ctx.restore();
    }

    // 4px top ink border
    ctx.lineWidth = 4;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.moveTo(0, hudY);
    ctx.lineTo(this.width, hudY);
    ctx.stroke();

    const centerY = hudY + hudH / 2;

    // ZONE 1: Left (Level Name) - max width 310px with clean ellipsis
    ctx.font = `900 ${THEME.typography.smallSize}px ${THEME.typography.bodyFont}`;
    THEME.applyLetterSpacing(ctx, '1.2px');
    ctx.fillStyle = THEME.colors.textDark;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let titleText = `${state.currentLevel.title}`;
    const maxTitleW = 310;
    while (ctx.measureText(titleText).width > maxTitleW && titleText.length > 8) {
      titleText = titleText.slice(0, -4) + '...';
    }
    ctx.fillText(titleText, 24, centerY);

    // ZONE 2: Center (Retry counter + par + stars)
    const par = state.currentLevel.par || 1;
    const edits = state.levelEdits || 0;
    const retries = state.deaths || 0;

    ctx.textAlign = 'center';
    ctx.fillStyle = THEME.colors.textDark;
    ctx.font = `900 15px ${THEME.typography.bodyFont}`;
    const infoText = `RETRIES: ${retries}   •   EDITS: ${edits}/${par}   •   `;
    const infoW = ctx.measureText(infoText).width;
    const centerStartX = 480 - (infoW + 65) / 2;

    ctx.textAlign = 'left';
    ctx.fillText(infoText, centerStartX, centerY);

    // Draw 3 comic stars
    let currentStars = 1;
    if (edits <= par) currentStars = 3;
    else if (edits <= par + 2) currentStars = 2;

    const starsStartX = centerStartX + infoW + 8;
    for (let s = 0; s < 3; s++) {
      THEME.drawStar(ctx, starsStartX + s * 20, centerY, 8, s < currentStars);
    }

    // ZONE 3: Right (Controls icon that expands to text on hover)
    const isHoveringControls = mousePos &&
      mousePos.x >= 650 && mousePos.y >= hudY;

    if (isHoveringControls) {
      // Expanded full controls text
      ctx.textAlign = 'right';
      ctx.fillStyle = THEME.colors.primary;
      ctx.font = `900 13px ${THEME.typography.bodyFont}`;
      THEME.applyLetterSpacing(ctx, '1.0px');
      ctx.fillText('A/D MOVE  •  SPACE JUMP  •  R RESTART  •  M MUTE', this.width - 24, centerY);
    } else {
      // Compact comic badge
      const badgeW = 140;
      const badgeH = 28;
      const badgeX = this.width - badgeW - 20;
      const badgeY = centerY - badgeH / 2;

      THEME.drawButton(ctx, {
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        text: '⌨ CONTROLS [?]',
        bg: THEME.colors.info,
        textColor: THEME.colors.textLight,
        fontSize: 13,
        font: THEME.typography.bodyFont,
        isHovered: false
      });
    }

    ctx.restore();
  }

  // COMPONENT: Visible circular countdown meter above locked word
  drawLockCountdown(ctx, { x, y, width, height, remaining, progress }) {
    ctx.save();
    THEME.init(ctx);
    const cx = x + width / 2;
    const cy = y - 14;
    const badgeW = 90;
    const badgeH = 22;
    const rad = 11;

    // Hard drop shadow
    ctx.fillStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.roundRect(cx - badgeW / 2 + 2, cy - badgeH / 2 + 2, badgeW, badgeH, rad);
    ctx.fill();

    // Paper background
    ctx.fillStyle = THEME.colors.paper;
    ctx.beginPath();
    ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, rad);
    ctx.fill();

    // Ink border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.stroke();

    // 1) Small circular timer icon next to padlock that visibly drains
    const circleX = cx - badgeW / 2 + 15;
    const circleY = cy;
    const circleR = 6.5;

    // Background track circle
    ctx.fillStyle = '#E5E5E5';
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.stroke();

    // Draining radial sector (starts at 12 o'clock, drains clockwise)
    if (progress > 0) {
      ctx.fillStyle = THEME.colors.primary; // Hot pink #ff3860
      ctx.beginPath();
      ctx.moveTo(circleX, circleY);
      ctx.arc(circleX, circleY, circleR, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      ctx.closePath();
      ctx.fill();

      // Mini center pivot pin
      ctx.fillStyle = THEME.colors.ink;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2) Padlock icon + remaining seconds badge
    ctx.fillStyle = THEME.colors.textDark;
    ctx.font = `900 11px ${THEME.typography.bodyFont}`;
    THEME.applyLetterSpacing(ctx, '0.5px');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🔒 ${remaining.toFixed(1)}s`, cx - badgeW / 2 + 27, cy);

    ctx.restore();
  }
}

window.ComicRenderer = ComicRenderer;
