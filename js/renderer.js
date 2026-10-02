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
    this.renderBottomHUD(ctx, state);

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

      // Comic Sun at left-middle (x: 250, y: 170)
      ctx.fillStyle = '#FFDD00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(250, 170, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(250, 170);
      for (let i = 0; i < 8; i++) {
        ctx.rotate((Math.PI * 2) / 8);
        ctx.fillStyle = '#FFB703';
        ctx.beginPath();
        ctx.moveTo(52, -7);
        ctx.lineTo(72, 0);
        ctx.lineTo(52, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      this.drawCloud(ctx, (130 - this.cloudOffset * 0.4 + this.width) % this.width, 195, 1.0);
      this.drawCloud(ctx, (430 - this.cloudOffset * 0.2 + this.width) % this.width, 180, 0.85);

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

  // Two-line yellow narrator caption box with typewriter dialogue support
  renderNarratorBox(ctx, level, ruleEngine, mousePos) {
    ctx.save();
    const boxX = 40;
    const boxY = 14;
    const boxW = this.width - 80;

    // Check if 2 lines
    const lines = (level.captionTemplate || "").split('\n');
    const isMultiLine = lines.length > 1;
    const boxH = isMultiLine ? 76 : 58;

    // Solid Caption Box highlight if level has fourth wall feature
    if (level.solidCaptionBox) {
      ctx.fillStyle = '#FFDD00';
      ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
    }

    // Caption Box Drop Shadow
    ctx.fillStyle = '#000000';
    ctx.fillRect(boxX + 5, boxY + 5, boxW, boxH);

    // Classic Yellow Comic Caption Box
    ctx.fillStyle = '#FFE500';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // "NARRATOR" tiny badge
    ctx.fillStyle = '#000000';
    ctx.fillRect(boxX + 12, boxY - 9, 82, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 11px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(level.solidCaptionBox ? 'SOLID BOX' : 'NARRATOR', boxX + 53, boxY + 4);

    ruleEngine.wordBoxes = [];
    let isHoveringAnyWord = false;
    const pulse = Math.sin(Date.now() * 0.007) * 1.5;

    ctx.font = isMultiLine ? '900 18px "Bangers", "Impact", sans-serif' : '900 21px "Bangers", "Impact", sans-serif';
    try { ctx.letterSpacing = '1.5px'; } catch (e) {}
    ctx.textBaseline = 'middle';

    lines.forEach((lineText, lineIdx) => {
      const centerY = isMultiLine ? (boxY + 23 + lineIdx * 32) : (boxY + boxH / 2 + 1);
      const tokens = lineText.split(/(\[[a-zA-Z0-9_]+\])/g);

      let totalWidth = 0;
      const renderedParts = [];

      for (const token of tokens) {
        if (!token) continue;
        const match = token.match(/^\[([a-zA-Z0-9_]+)\]$/);
        if (match) {
          const key = match[1];
          const val = ruleEngine.words[key] || key.toUpperCase();
          const displayWord = `[ ${val} ]`;
          const width = ctx.measureText(displayWord).width + 14;
          renderedParts.push({ isWord: true, key, text: displayWord, width });
          totalWidth += width;
        } else {
          const width = ctx.measureText(token).width;
          renderedParts.push({ isWord: false, text: token, width });
          totalWidth += width;
        }
      }

      let startX = boxX + (boxW - totalWidth) / 2;

      for (const part of renderedParts) {
        if (part.isWord) {
          const isLocked = ruleEngine.isWordLocked(part.key);
          const btnH = isMultiLine ? 28 : 36;
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

          let drawX = wBox.x;
          let drawY = wBox.y;
          let drawW = wBox.width;
          let drawH = wBox.height;

          if (isLocked) {
            ctx.fillStyle = '#666666';
          } else if (isHovered) {
            drawX -= 2.5;
            drawY -= 2;
            drawW += 5;
            drawH += 4;
            ctx.fillStyle = '#FF1493';
          } else {
            drawX -= pulse * 0.5;
            drawY -= pulse * 0.4;
            drawW += pulse;
            drawH += pulse * 0.8;
            ctx.fillStyle = '#FF0055';
          }

          ctx.fillRect(drawX, drawY, drawW, drawH);
          ctx.lineWidth = isHovered ? 3.5 : 2.5;
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(drawX, drawY, drawW, drawH);

          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(part.text, wBox.x + wBox.width / 2, centerY);

          if (isLocked) {
            ctx.font = '900 11px sans-serif';
            ctx.fillText("🔒", wBox.x + wBox.width - 8, wBox.y + 6);
            ctx.font = isMultiLine ? '900 18px "Bangers", "Impact", sans-serif' : '900 21px "Bangers", "Impact", sans-serif';
          }

          startX += part.width;
        } else {
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';
          ctx.fillText(part.text, startX, centerY);
          startX += part.width;
        }
      }
    });

    if (this.canvas) {
      this.canvas.style.cursor = isHoveringAnyWord ? 'pointer' : 'default';
    }

    // Typewriter Subtitle Box below caption
    if (window.narratorVoice && window.narratorVoice.currentText) {
      const subY = boxY + boxH + 6;
      ctx.font = '900 13px "Bangers", "Impact", sans-serif';
      const textW = ctx.measureText("NARRATOR: " + window.narratorVoice.currentText).width + 20;
      const subX = 480 - textW / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(subX, subY, textW, 22);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFE500';
      ctx.strokeRect(subX, subY, textW, 22);

      ctx.fillStyle = '#FFE500';
      ctx.textAlign = 'center';
      ctx.fillText("NARRATOR: " + window.narratorVoice.currentText, 480, subY + 12);
    }

    ctx.restore();
  }

  // HUD: Left = issue title, Center = RETRIES & EDITS/PAR, Right = controls hint
  renderBottomHUD(ctx, state) {
    ctx.save();
    try { ctx.letterSpacing = '1.5px'; } catch (e) {}
    const hudY = this.height - 20;

    ctx.font = '900 14px "Bangers", "Impact", sans-serif';

    const controlsText = 'A/D Move | Space Jump | R Restart | M Mute';
    ctx.fillStyle = '#ADB5BD';
    ctx.textAlign = 'right';
    ctx.fillText(controlsText, this.width - 24, hudY);

    // Center: RETRIES and EDITS / PAR
    const par = state.currentLevel.par || 1;
    const edits = state.levelEdits || 0;
    const retriesText = `RETRIES: ${state.deaths}   ★   EDITS: ${edits}/${par}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(retriesText, this.width / 2, hudY);

    // Left: Title
    ctx.fillStyle = '#FFE600';
    ctx.textAlign = 'left';
    let titleText = `${state.currentLevel.title}`;
    const maxTitleW = this.width / 2 - 120;
    while (ctx.measureText(titleText).width > maxTitleW && titleText.length > 8) {
      titleText = titleText.slice(0, -4) + '...';
    }
    ctx.fillText(titleText, 24, hudY);

    ctx.restore();
  }
}

window.ComicRenderer = ComicRenderer;
