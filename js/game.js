// Main Game Controller for RETCON
// Handles States, Fixed Timestep Physics, Verb Mechanics, Narrator Personality,
// Fourth-Wall Interactions, Star Ratings, and Persistent Progress.

class RetconGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Logical dimensions
    this.canvas.width = 960;
    this.canvas.height = 600;

    this.renderer = new ComicRenderer(this.canvas);
    this.sounds = window.sounds;
    this.fx = window.fx;
    this.ruleEngine = window.ruleEngine;
    this.narrator = window.narratorVoice;

    // Game state
    this.state = 'TITLE'; // 'TITLE' | 'PLAYING' | 'PAGE_TURN' | 'LEVEL_SELECT' | 'WIN' | 'PAUSED'
    this.currentLevelIndex = 0;
    this.currentLevel = null;
    this.hero = null;
    this.deaths = 0;
    this.levelEdits = 0;
    this.savedStars = {};

    // Load saved star ratings
    this.loadStars();

    // Debug mode (via ?debug=1)
    this.isDebug = new URLSearchParams(window.location.search).get('debug') === '1';

    // Fixed timestep constants
    this.fixedDt = 1 / 60;
    this.accumulator = 0;

    // Input state
    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpHeld: false,
      jumpPressed: false
    };
    this.mousePos = { x: 0, y: 0 };

    // Page-turn transition
    this.pageTurnProgress = 0;
    this.pageTurnSpeed = 2.0;

    // Death respawn delay
    this.respawnTimer = 0;

    // Hook inputs & events
    this.setupInputs();
    this.setupWindowEvents();

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  loadStars() {
    this.savedStars = {};
    this.savedRetries = {};
    try {
      const data = localStorage.getItem('retcon_stars_v2');
      if (data) {
        const parsed = JSON.parse(data);
        this.savedStars = parsed.stars || {};
        this.savedRetries = parsed.retries || {};
      }
    } catch (e) {
      console.warn("Storage access restricted", e);
    }
  }

  saveStars(levelId, stars, retries = 0) {
    try {
      const current = this.savedStars[levelId] || 0;
      if (stars > current) {
        this.savedStars[levelId] = stars;
      }
      if (this.savedRetries[levelId] === undefined || retries < this.savedRetries[levelId]) {
        this.savedRetries[levelId] = retries;
      }
      localStorage.setItem('retcon_stars_v2', JSON.stringify({
        stars: this.savedStars,
        retries: this.savedRetries
      }));
    } catch (e) {
      console.warn("Storage save failed", e);
    }
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.sounds) this.sounds.init();

      // Debug Level Skip: N = Next, B = Previous
      if (e.code === 'KeyN') {
        this.nextLevel();
        if (this.fx) this.fx.addPopup("SKIP >", 480, 80, { scale: 0.9 });
        return;
      }

      if (e.code === 'KeyB') {
        if (this.currentLevelIndex > 0) {
          this.loadLevel(this.currentLevelIndex - 1);
          if (this.fx) this.fx.addPopup("< PREV", 480, 80, { scale: 0.9 });
        }
        return;
      }

      if (e.code === 'KeyR') {
        if (this.state === 'PLAYING') {
          this.restartLevel();
        }
        return;
      }

      if (e.code === 'KeyM') {
        if (this.sounds) {
          const isMuted = this.sounds.toggleMute();
          if (this.fx) {
            this.fx.addPopup(isMuted ? "MUTED!" : "UNMUTED!", 480, 80, { scale: 0.9 });
          }
        }
        return;
      }

      if (e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.state = 'PAUSED';
        } else if (this.state === 'PAUSED') {
          this.state = 'PLAYING';
        }
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = true;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!this.input.jumpHeld) {
          this.input.jumpPressed = true;
        }
        this.input.jumpHeld = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = false;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.input.jumpHeld = false;
      }
    });

    // Mouse Tracking & Click Handling
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;

      const x = this.mousePos.x, y = this.mousePos.y;
      if (this.state === 'TITLE') {
        const onPlay = x >= 360 && x <= 600 && y >= 370 && y <= 430;
        const onSelect = x >= 360 && x <= 600 && y >= 450 && y <= 500;
        this.canvas.style.cursor = (onPlay || onSelect) ? 'pointer' : 'default';
      } else if (this.state === 'LEVEL_SELECT') {
        let onCard = false;
        const startX = 110, startY = 140;
        for (let i = 0; i < LEVELS.length; i++) {
          const bx = startX + (i % 6) * 125;
          const by = startY + Math.floor(i / 6) * 140;
          if (x >= bx && x <= bx + 105 && y >= by && y <= by + 100) { onCard = true; break; }
        }
        const onBack = x >= 400 && x <= 560 && y >= 500 && y <= 550;
        this.canvas.style.cursor = (onCard || onBack) ? 'pointer' : 'default';
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.sounds) this.sounds.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      this.handleClick(clickX, clickY);
    });
  }

  setupWindowEvents() {
    window.addEventListener('blur', () => {
      this.input.left = false;
      this.input.right = false;
      this.input.up = false;
      this.input.down = false;
      this.input.jumpHeld = false;
      this.input.jumpPressed = false;
    });
  }

  handleClick(x, y) {
    if (this.state === 'TITLE') {
      // START READING (PLAY) button
      if (x >= 360 && x <= 600 && y >= 280 && y <= 340) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.loadLevel(0);
        this.state = 'PLAYING';
        return;
      }
      // ISSUE ARCHIVE (LEVEL SELECT) button
      if (x >= 360 && x <= 600 && y >= 365 && y <= 425) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.state = 'LEVEL_SELECT';
        return;
      }
      return;
    }

    if (this.state === 'LEVEL_SELECT') {
      // 12 Level Cards (4 columns x 3 rows)
      const startX = 82;
      const startY = 95;
      const cardW = 186;
      const cardH = 108;
      const gapX = 20;
      const gapY = 16;

      for (let i = 0; i < LEVELS.length; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const bx = startX + col * (cardW + gapX);
        const by = startY + row * (cardH + gapY);
        if (x >= bx && x <= bx + cardW && y >= by && y <= by + cardH) {
          if (this.sounds) this.sounds.playButtonThunk();
          this.loadLevel(i);
          this.state = 'PLAYING';
          return;
        }
      }
      // BACK button
      if (x >= 390 && x <= 570 && y >= 490 && y <= 545) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.state = 'TITLE';
        return;
      }
      return;
    }

    if (this.state === 'PAUSED') {
      // RESUME
      if (x >= 340 && x <= 620 && y >= 200 && y <= 255) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.state = 'PLAYING';
        return;
      }
      // LEVEL SELECT
      if (x >= 340 && x <= 620 && y >= 275 && y <= 330) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.state = 'LEVEL_SELECT';
        return;
      }
      // RESTART
      if (x >= 340 && x <= 620 && y >= 350 && y <= 405) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.restartLevel();
        this.state = 'PLAYING';
        return;
      }
      return;
    }

    if (this.state === 'WIN') {
      if (x >= 360 && x <= 600 && y >= 445 && y <= 515) {
        if (this.sounds) this.sounds.playButtonThunk();
        this.loadLevel(0);
        this.state = 'PLAYING';
        return;
      }
      return;
    }

    if (this.state === 'PLAYING') {
      for (const box of this.ruleEngine.wordBoxes) {
        if (
          x >= box.x &&
          x <= box.x + box.width &&
          y >= box.y &&
          y <= box.y + box.height
        ) {
          const success = this.ruleEngine.cycleWord(box.key, this.hero);
          if (success) {
            this.levelEdits++;
            if (this.hero) this.hero.triggerWordSwap();
            if (this.narrator) this.narrator.onWordSwap();
            this.triggerHeroReaction(box.key);
          }
          return;
        }
      }
    }
  }

  triggerHeroReaction(changedWordKey) {
    const time = this.ruleEngine.words.time;
    const bridge = this.ruleEngine.words.bridge;
    const verb = this.ruleEngine.words.verb;

    if (changedWordKey === 'verb') {
      if (verb === 'FLOATED') this.hero.say("Low gravity! I can leap high!");
      else if (verb === 'STOMPED') this.hero.say("Heavy boots! I can smash cracked floors!");
      else if (verb === 'SPRINTED') this.hero.say("Super speed! Watch the turns!");
      else this.hero.say("Steady footing.");
    } else if (changedWordKey === 'time') {
      if (time === 'DAY') this.hero.say("Daylight dissolves shadow beasts!");
      else if (time === 'SUNSET') this.hero.say("The setting sun casts a solid shadow ramp!");
      else if (time === 'NIGHT') this.hero.say("Nightfall! The shadows awaken!");
    } else if (changedWordKey === 'bridge') {
      if (bridge === 'STONE') this.hero.say("Sturdy stone!");
      else if (bridge === 'ICE') this.hero.say("Icy bridge... watch out for heat!");
      else if (bridge === 'BROKEN') this.hero.say("Bridge vanished!");
    } else if (changedWordKey === 'narrator') {
      if (this.ruleEngine.words.narrator === 'HERO') {
        this.hero.say("The Narrator is helping us! The path is open!");
        delete this.ruleEngine.lockedWords['verb'];
        this.bossProjectiles = [];
        if (this.sounds) this.sounds.playWin();
      } else {
        this.hero.say("The villainous Narrator is attacking!");
      }
    }
  }

  loadLevel(index) {
    this.currentLevelIndex = index;
    const levelData = LEVELS[index];
    this.currentLevel = levelData;
    this.levelEdits = 0;

    // Reset particles
    if (this.fx) this.fx.clear();

    this.ruleEngine.setWords(levelData.words, levelData.wordOptions);
    if (levelData.onInit) {
      levelData.onInit(this.ruleEngine);
    }

    this.hero = new Hero(levelData.heroStart.x, levelData.heroStart.y);
    if (levelData.heroHint) {
      this.hero.say(levelData.heroHint, 3.5);
    }

    this.respawnTimer = 0;
    if (levelData.twist) {
      levelData.twist.activated = false;
    }

    // Narrator voice reaction
    if (this.narrator) {
      this.narrator.onLevelStart(index);
    }
  }

  restartLevel() {
    this.deaths++;
    if (this.fx) this.fx.clear();
    this.loadLevel(this.currentLevelIndex);
    if (this.fx) {
      this.fx.addPopup("RETCON!", 480, 300, { color: '#FFE500', scale: 1.2 });
    }
    if (this.narrator) {
      this.narrator.onHeroDeath();
    }
  }

  nextLevel() {
    if (this.hero) this.hero.win();
    if (this.sounds) this.sounds.playWin();

    // Calculate stars
    const par = this.currentLevel.par || 1;
    let stars = 1;
    if (this.levelEdits <= par) stars = 3;
    else if (this.levelEdits <= par + 2) stars = 2;
    this.saveStars(this.currentLevel.id, stars, this.deaths);

    if (this.narrator) {
      this.narrator.onLevelComplete();
    }

    if (this.fx) {
      const starText = stars === 3 ? "★★★ 3 STARS!" : (stars === 2 ? "★★☆ 2 STARS!" : "★☆☆ 1 STAR!");
      this.fx.addPopup(starText, 480, 260, { color: '#FFE500', scale: 1.3 });
    }

    if (this.currentLevelIndex + 1 < LEVELS.length) {
      this.state = 'PAGE_TURN';
      this.pageTurnProgress = 0;
    } else {
      this.state = 'WIN';
    }
  }

  gameLoop(currentTime) {
    try {
      let frameTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      if (frameTime > 0.1) frameTime = 0.1;

      this.accumulator += frameTime;
      while (this.accumulator >= this.fixedDt) {
        this.update(this.fixedDt);
        this.accumulator -= this.fixedDt;
        this.input.jumpPressed = false;
      }

      this.render(this.fixedDt);
    } catch (err) {
      console.error("Game loop caught error:", err);
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    if (this.fx) this.fx.update(dt);
    if (this.ruleEngine) this.ruleEngine.update(dt);

    if (this.state === 'PLAYING') {
      if (!this.hero || !this.currentLevel) return;

      // Update narrator personality & typewriter
      if (this.narrator) {
        this.narrator.update(dt, Math.abs(this.hero.vx) > 10);
      }

      // Check mid-level narrator twist trigger
      if (this.currentLevel.twist && !this.currentLevel.twist.activated) {
        if (this.hero.x >= this.currentLevel.twist.triggerX) {
          this.currentLevel.twist.activated = true;
          this.currentLevel.twist.action(this.ruleEngine, this.hero);
        }
      }

      // Collect solids, slopes, pushables, climbables, lethals dynamically based on rules
      const activeSolids = [...this.currentLevel.solids];
      const activeSlopes = [];
      const activePushables = [];
      const activeClimbables = [];
      const activeLethals = [];

      // Fourth-Wall Feature: Solid Narrator Caption Box Platform
      if (this.currentLevel.solidCaptionBox) {
        activeSolids.push({
          x: 40,
          y: 64,
          width: 880,
          height: 76,
          isCaptionBox: true
        });
      }

      for (const ent of this.currentLevel.entities) {
        const entState = this.ruleEngine.evaluateEntity(ent);

        if (entState.solid) {
          if (entState.isSlope) {
            activeSlopes.push({
              x: ent.x,
              y: ent.y,
              width: ent.width,
              height: ent.height
            });
          } else if (entState.isPushable) {
            // Apply floor gravity to pushable speech bubble block
            ent.vy = (ent.vy || 0) + 1200 * dt;
            ent.y += ent.vy * dt;
            // Floor clamp at ground y: 480 - height
            if (ent.y >= 480 - ent.height) {
              ent.y = 480 - ent.height;
              ent.vy = 0;
            }
            activePushables.push(ent);
            activeSolids.push({
              x: ent.x,
              y: ent.y,
              width: ent.width,
              height: ent.height,
              originalEntity: ent
            });
          } else {
            activeSolids.push({
              x: ent.x,
              y: ent.y,
              width: ent.width,
              height: ent.height,
              isCracked: entState.isCracked,
              isSwitch: entState.isSwitch,
              originalEntity: ent
            });
          }
        }
        if (entState.climbable) {
          activeClimbables.push({
            x: ent.x,
            y: ent.y,
            width: ent.width,
            height: ent.height
          });
        }
        if (entState.lethal) {
          activeLethals.push({
            x: ent.x,
            y: ent.y,
            width: ent.width,
            height: ent.height,
            deathMessage: ent.deathMessage
          });
        }
      }

      // Update hero with active verb modifiers and pushables
      const activeVerb = this.ruleEngine.words.verb || 'WALKED';
      this.hero.update(dt, this.input, activeSolids, activeClimbables, activeLethals, activeSlopes, activeVerb, activePushables);

      // Level 12 Final Boss Logic
      if (this.currentLevel.id === 12) {
        const isVillain = this.ruleEngine.words.narrator === 'VILLAIN';
        if (isVillain) {
          this.bossAttackTimer = (this.bossAttackTimer || 0) + dt;
          if (this.bossAttackTimer >= 2.2) {
            this.bossAttackTimer = 0;
            this.bossProjectiles = this.bossProjectiles || [];
            this.bossProjectiles.push({
              x: 600,
              y: 440,
              vx: -260,
              width: 28,
              height: 28
            });
            if (this.sounds) this.sounds.playTwist();
            if (this.fx) this.fx.addPopup("INK BOLT!", 600, 420, { color: '#FF0055', scale: 1.0 });
          }
        } else {
          this.bossProjectiles = [];
        }

        // Update boss projectiles
        if (this.bossProjectiles && this.bossProjectiles.length > 0) {
          for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
            const p = this.bossProjectiles[i];
            p.x += p.vx * dt;
            if (this.fx && Math.random() < 0.4) {
              this.fx.emit(p.x + 14, p.y + 14, 1, 'spark', '#FF0077');
            }
            if (!this.hero.isDead && this.hero.checkOverlap(
              { x: this.hero.x, y: this.hero.y, width: this.hero.width, height: this.hero.height },
              p
            )) {
              this.hero.die("Struck by Narrator's evil ink!");
            }
            if (p.x < -40) {
              this.bossProjectiles.splice(i, 1);
            }
          }
        }
      }

      // Handle hero death respawn delay
      if (this.hero.isDead) {
        this.respawnTimer += dt;
        if (this.respawnTimer > 0.65) {
          this.deaths++;
          this.loadLevel(this.currentLevelIndex);
        }
      }

      // Check Fourth-Wall Panel Border Exit
      if (this.currentLevel.panelBorderExit && !this.hero.isDead && this.hero.x >= 920) {
        this.nextLevel();
        return;
      }

      // Check Standard Level Exit Door
      const exitBox = this.currentLevel.exit;
      const canExit = (this.currentLevel.id !== 12) || (this.ruleEngine.words.narrator === 'HERO');
      if (
        canExit &&
        !this.hero.isDead &&
        exitBox &&
        this.hero.checkOverlap(
          { x: this.hero.x, y: this.hero.y, width: this.hero.width, height: this.hero.height },
          exitBox
        )
      ) {
        this.nextLevel();
      }

    } else if (this.state === 'PAGE_TURN') {
      this.pageTurnProgress += dt * this.pageTurnSpeed;
      if (this.pageTurnProgress >= 1.0) {
        this.loadLevel(this.currentLevelIndex + 1);
        this.state = 'PLAYING';
      }
    }
  }

  render(dt) {
    const ctx = this.ctx;

    if (this.state === 'TITLE') {
      this.renderTitleScreen(ctx);
    } else if (this.state === 'LEVEL_SELECT') {
      this.renderLevelSelectScreen(ctx);
    } else if (this.state === 'WIN') {
      this.renderWinScreen(ctx);
    } else if (this.state === 'PLAYING' || this.state === 'PAGE_TURN' || this.state === 'PAUSED') {
      this.renderer.render(
        dt,
        { currentLevel: this.currentLevel, deaths: this.deaths, levelEdits: this.levelEdits },
        this.hero,
        this.ruleEngine,
        this.fx,
        this.mousePos
      );

      // Render boss projectiles
      if (this.bossProjectiles && this.bossProjectiles.length > 0) {
        for (const p of this.bossProjectiles) {
          ctx.save();
          ctx.fillStyle = '#7209B7';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x + 14, p.y + 14, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#FFE500';
          ctx.fillRect(p.x + 9, p.y + 9, 10, 10);
          ctx.restore();
        }
      }

      if (this.state === 'PAGE_TURN') {
        this.renderPageTurnEffect(ctx);
      }

      if (this.state === 'PAUSED') {
        this.renderPauseMenu(ctx);
      }
    }

    if (this.isDebug) {
      ctx.save();
      ctx.fillStyle = '#FFE500';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(835, 10, 115, 24);
      ctx.strokeRect(835, 10, 115, 24);
      ctx.fillStyle = '#000000';
      ctx.font = '900 12px "Bangers", "Impact", sans-serif';
      try { ctx.letterSpacing = '1px'; } catch (e) {}
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DEBUG (N / B)', 892, 22);
      ctx.restore();
    }
  }

  renderTitleScreen(ctx) {
    THEME.init(ctx);

    // Warm cream paper background (#fdf6e3)
    ctx.fillStyle = THEME.colors.paper;
    ctx.fillRect(0, 0, 960, 600);

    // Modern angled comic action lines (NOT a dated full sunburst)
    THEME.drawActionLines(ctx, 960, 600);

    // Halftone dot texture overlay at 9% opacity
    if (THEME.halftonePattern) {
      ctx.save();
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    // 5px Ink Border around entire screen
    ctx.lineWidth = 5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeRect(3, 3, 954, 594);

    // Top Comic Issue Banner
    ctx.fillStyle = THEME.colors.ink;
    ctx.fillRect(40, 22, 880, 36);
    ctx.fillStyle = THEME.colors.paper;
    ctx.font = `900 15px ${THEME.typography.bodyFont}`;
    THEME.applyLetterSpacing(ctx, '1.5px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMIC JAM EDITION #1  •  THEMES: COMIC + TWIST + LIGHT', 480, 40);

    // Big "RETCON" Title using component system styling
    ctx.save();
    const titleY = 145;
    ctx.font = `900 88px ${THEME.typography.displayFont}`;
    THEME.applyLetterSpacing(ctx, '4px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 6px Hard Offset Shadow
    ctx.fillStyle = THEME.colors.ink;
    ctx.fillText('RETCON', 480 + 6, titleY + 6);

    // 6px Ink Stroke
    ctx.lineWidth = 8;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeText('RETCON', 480, titleY);

    // Text Fill in Primary Hot Red/Pink (#ff3860)
    ctx.fillStyle = THEME.colors.primary;
    ctx.fillText('RETCON', 480, titleY);
    ctx.restore();

    // Subtitle Tagline in Comic Speech Bubble (with pointer tail)
    THEME.drawSpeechBubble(ctx, {
      x: 240,
      y: 195,
      width: 480,
      height: 48,
      text: "REWRITE THE STORY. ESCAPE THE PANEL!",
      tailX: 480,
      tailY: 180,
      fontSize: 17
    });

    // PLAY Button (Success Teal #2ec4b6)
    const hoverPlay = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 280 && this.mousePos.y <= 340;

    THEME.drawButton(ctx, {
      x: 360,
      y: 280,
      width: 240,
      height: 60,
      text: "▶ START READING",
      bg: THEME.colors.success,
      textColor: THEME.colors.textDark,
      fontSize: 28,
      isHovered: hoverPlay
    });

    // LEVEL SELECT Button (Info Blue #3a86ff)
    const hoverLevels = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 365 && this.mousePos.y <= 425;

    THEME.drawButton(ctx, {
      x: 360,
      y: 365,
      width: 240,
      height: 56,
      text: "ISSUE ARCHIVE",
      bg: THEME.colors.info,
      textColor: THEME.colors.textLight,
      fontSize: 24,
      isHovered: hoverLevels
    });

    // Team Credit inside Torn-Paper Banner Shape at bottom
    THEME.drawTornPaperBanner(ctx, {
      x: 140,
      y: 470,
      width: 680,
      height: 46,
      text: "TEAM APEX: SAI RAM • SRI VIGNESH ARYA • JASWANTH CHARRY"
    });
  }

  renderLevelSelectScreen(ctx) {
    THEME.init(ctx);

    // Deep navy ink background (#1a1a2e)
    ctx.fillStyle = THEME.colors.ink;
    ctx.fillRect(0, 0, 960, 600);

    // Halftone dot overlay
    if (THEME.halftonePattern) {
      ctx.save();
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    // 5px Ink Border with warm paper accent
    ctx.lineWidth = 5;
    ctx.strokeStyle = THEME.colors.paper;
    ctx.strokeRect(3, 3, 954, 594);

    // Section Header Title (32px, Comic Yellow #ffd400)
    ctx.save();
    ctx.font = `900 ${THEME.typography.headerSize}px ${THEME.typography.displayFont}`;
    THEME.applyLetterSpacing(ctx, '2px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeText('SELECT AN ISSUE', 480, 56);

    ctx.fillStyle = THEME.colors.secondary;
    ctx.fillText('SELECT AN ISSUE', 480, 56);
    ctx.restore();

    // 12 Issue Covers Grid (4 columns x 3 rows)
    const startX = 82;
    const startY = 95;
    const cardW = 186;
    const cardH = 108;
    const gapX = 20;
    const gapY = 16;

    const THEME_TAGS = [
      'BROKEN BRIDGE',
      'NIGHT vs DAY',
      'ICE vs SUNSET',
      'SHADOW RAMP',
      'FORTRESS GUARD',
      'HEAVY STOMP',
      'SPEECH BUBBLE',
      'RAIN & VINES',
      'HIGH VANTAGE',
      'PANEL BREACH',
      'NARRATOR LOCK',
      'THE GRAND FINALE'
    ];

    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const bx = startX + col * (cardW + gapX);
      const by = startY + row * (cardH + gapY);
      const lvl = LEVELS[i];
      const starCount = this.savedStars[lvl.id] || 0;
      const bestRetries = this.savedRetries[lvl.id];

      const isHovered = this.mousePos &&
        this.mousePos.x >= bx && this.mousePos.x <= bx + cardW &&
        this.mousePos.y >= by && this.mousePos.y <= by + cardH;

      const liftY = isHovered ? -3 : 0;
      const shadowDist = isHovered ? 7 : 4;

      // Hard offset shadow
      ctx.fillStyle = THEME.colors.ink;
      ctx.beginPath();
      ctx.roundRect(bx + shadowDist, by + liftY + shadowDist, cardW, cardH, 8);
      ctx.fill();

      // Card paper background
      ctx.fillStyle = THEME.colors.paper;
      ctx.beginPath();
      ctx.roundRect(bx, by + liftY, cardW, cardH, 8);
      ctx.fill();

      // Halftone overlay on card
      if (THEME.halftonePattern) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by + liftY, cardW, cardH, 8);
        ctx.clip();
        ctx.fillStyle = THEME.halftonePattern;
        ctx.fillRect(bx, by + liftY, cardW, cardH);
        ctx.restore();
      }

      // 4px ink border
      ctx.lineWidth = 4;
      ctx.strokeStyle = THEME.colors.ink;
      ctx.beginPath();
      ctx.roundRect(bx, by + liftY, cardW, cardH, 8);
      ctx.stroke();

      // Top-Left Badge: ISSUE #X (Primary Red #ff3860)
      const badgeW = 76;
      const badgeH = 22;
      ctx.fillStyle = THEME.colors.primary;
      ctx.beginPath();
      ctx.roundRect(bx + 10, by + liftY + 10, badgeW, badgeH, 4);
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = THEME.colors.ink;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 13px ${THEME.typography.displayFont}`;
      THEME.applyLetterSpacing(ctx, '1px');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ISSUE #${lvl.id}`, bx + 10 + badgeW / 2, by + liftY + 10 + badgeH / 2);

      // 1-line preview of theme
      ctx.fillStyle = THEME.colors.textDark;
      ctx.font = `900 12px ${THEME.typography.bodyFont}`;
      THEME.applyLetterSpacing(ctx, '1.1px');
      ctx.textAlign = 'left';
      ctx.fillText(THEME_TAGS[i] || 'PUZZLE', bx + 12, by + liftY + 54);

      // Stars earned (0 to 3) drawn as comic star icons
      const starStartX = bx + 14;
      const starY = by + liftY + 84;
      for (let s = 0; s < 3; s++) {
        THEME.drawStar(ctx, starStartX + s * 22, starY, 9, s < starCount);
      }

      // Best retries / par label
      ctx.fillStyle = THEME.colors.textDark;
      ctx.font = `bold 10px ${THEME.typography.bodyFont}`;
      ctx.textAlign = 'right';
      const labelText = bestRetries !== undefined ? `BEST: ${bestRetries}` : `PAR: ${lvl.par || 1}`;
      ctx.fillText(labelText, bx + cardW - 12, starY);
    }

    // BACK Button (Primary Accent #ff3860)
    const hoverBack = this.mousePos &&
      this.mousePos.x >= 390 && this.mousePos.x <= 570 &&
      this.mousePos.y >= 490 && this.mousePos.y <= 545;

    THEME.drawButton(ctx, {
      x: 390,
      y: 490,
      width: 180,
      height: 48,
      text: "BACK",
      bg: THEME.colors.primary,
      textColor: THEME.colors.textLight,
      fontSize: 24,
      isHovered: hoverBack
    });
  }

  renderPauseMenu(ctx) {
    THEME.init(ctx);

    // Dark semi-transparent overlay
    ctx.fillStyle = 'rgba(26, 26, 46, 0.78)';
    ctx.fillRect(0, 0, 960, 600);

    // Center Dialog Panel using component system
    const panelX = 330;
    const panelY = 120;
    const panelW = 300;
    const panelH = 350;

    THEME.drawPanel(ctx, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      bg: THEME.colors.paper,
      shadowOffset: 6,
      radius: 12
    });

    // PAUSED Title (32px Header)
    ctx.font = `900 ${THEME.typography.headerSize}px ${THEME.typography.displayFont}`;
    THEME.applyLetterSpacing(ctx, '2px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 4;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeText('PAUSED', 480, 165);

    ctx.fillStyle = THEME.colors.primary;
    ctx.fillText('PAUSED', 480, 165);

    // Button 1: RESUME (Success Teal)
    const hoverResume = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 205 && this.mousePos.y <= 260;

    THEME.drawButton(ctx, {
      x: 360,
      y: 205,
      width: 240,
      height: 52,
      text: "RESUME",
      bg: THEME.colors.success,
      textColor: THEME.colors.textDark,
      fontSize: 24,
      isHovered: hoverResume
    });

    // Button 2: LEVEL SELECT (Info Blue)
    const hoverSelect = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 275 && this.mousePos.y <= 330;

    THEME.drawButton(ctx, {
      x: 360,
      y: 275,
      width: 240,
      height: 52,
      text: "LEVEL SELECT",
      bg: THEME.colors.info,
      textColor: THEME.colors.textLight,
      fontSize: 22,
      isHovered: hoverSelect
    });

    // Button 3: RESTART LEVEL (Secondary Yellow)
    const hoverRestart = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 345 && this.mousePos.y <= 400;

    THEME.drawButton(ctx, {
      x: 360,
      y: 345,
      width: 240,
      height: 52,
      text: "RESTART (R)",
      bg: THEME.colors.secondary,
      textColor: THEME.colors.textDark,
      fontSize: 22,
      isHovered: hoverRestart
    });
  }

  // Page-flip animation between levels: dynamic comic paper diagonal wipe
  renderPageTurnEffect(ctx) {
    const p = this.pageTurnProgress;
    const wipeX = 960 * (1 - p);

    ctx.save();
    // Turning paper sheet
    ctx.fillStyle = THEME.colors.paper;
    ctx.fillRect(wipeX, 0, 960 - wipeX, 600);

    // Subtle halftone on turning page
    if (THEME.halftonePattern) {
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(wipeX, 0, 960 - wipeX, 600);
    }

    // 5px Ink dividing edge line
    ctx.lineWidth = 6;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.beginPath();
    ctx.moveTo(wipeX, 0);
    ctx.lineTo(wipeX, 600);
    ctx.stroke();

    // Soft hard-edge paper drop shadow
    ctx.fillStyle = 'rgba(26, 26, 46, 0.4)';
    ctx.fillRect(wipeX - 12, 0, 12, 600);

    ctx.restore();
  }

  renderWinScreen(ctx) {
    THEME.init(ctx);

    // Comic Yellow Background (#ffd400)
    ctx.fillStyle = THEME.colors.secondary;
    ctx.fillRect(0, 0, 960, 600);

    // Angled action lines
    THEME.drawActionLines(ctx, 960, 600);

    // Halftone dot overlay
    if (THEME.halftonePattern) {
      ctx.save();
      ctx.fillStyle = THEME.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }

    // 5px Ink border
    ctx.lineWidth = 5;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeRect(3, 3, 954, 594);

    // THE END! Title (64px Display Font)
    ctx.save();
    ctx.font = `900 ${THEME.typography.titleSize}px ${THEME.typography.displayFont}`;
    THEME.applyLetterSpacing(ctx, '3px');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = THEME.colors.ink;
    ctx.strokeText('THE END!', 480, 85);

    ctx.fillStyle = THEME.colors.primary;
    ctx.fillText('THE END!', 480, 85);
    ctx.restore();

    // Victory Speech Bubble
    THEME.drawSpeechBubble(ctx, {
      x: 180,
      y: 135,
      width: 600,
      height: 48,
      text: "YOU OUTSMARTED THE NARRATOR & SAVED THE COMIC!",
      tailX: 480,
      tailY: 120,
      fontSize: 17
    });

    // Credits & Stars Summary Panel
    THEME.drawPanel(ctx, {
      x: 180,
      y: 215,
      width: 600,
      height: 195,
      bg: THEME.colors.paper,
      shadowOffset: 5,
      radius: 10
    });

    // Total Stars & Retries
    let totalStars = 0;
    for (const id in this.savedStars) {
      totalStars += this.savedStars[id];
    }

    ctx.fillStyle = THEME.colors.primary;
    ctx.font = `900 24px ${THEME.typography.bodyFont}`;
    THEME.applyLetterSpacing(ctx, '1.5px');
    ctx.textAlign = 'center';
    ctx.fillText(`TOTAL STARS: ${totalStars} / 36   ★   RETRIES: ${this.deaths}`, 480, 255);

    // Team APEX Credits
    ctx.fillStyle = THEME.colors.textDark;
    ctx.font = `900 18px ${THEME.typography.bodyFont}`;
    ctx.fillText('DEVELOPED FOR GAME JAM BY TEAM APEX', 480, 298);

    ctx.font = `bold 16px ${THEME.typography.bodyFont}`;
    ctx.fillText('Sai Ram  •  Sri Vignesh Arya  •  Jaswanth Charry', 480, 335);

    ctx.font = `14px ${THEME.typography.bodyFont}`;
    ctx.fillText('Zero Bundler / Zero CDN / Pure HTML5 Canvas 2D + Web Audio', 480, 372);

    // PLAY AGAIN Button (Success Teal)
    const hoverPlayAgain = this.mousePos &&
      this.mousePos.x >= 360 && this.mousePos.x <= 600 &&
      this.mousePos.y >= 445 && this.mousePos.y <= 510;

    THEME.drawButton(ctx, {
      x: 360,
      y: 445,
      width: 240,
      height: 58,
      text: "PLAY AGAIN",
      bg: THEME.colors.success,
      textColor: THEME.colors.textDark,
      fontSize: 28,
      isHovered: hoverPlayAgain
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new RetconGame();
});
