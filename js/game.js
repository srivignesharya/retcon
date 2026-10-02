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
      if (x >= 360 && x <= 600 && y >= 370 && y <= 430) {
        if (this.sounds) this.sounds.playWordClick();
        this.loadLevel(0);
        this.state = 'PLAYING';
      } else if (x >= 360 && x <= 600 && y >= 450 && y <= 500) {
        if (this.sounds) this.sounds.playWordClick();
        this.state = 'LEVEL_SELECT';
      }
      return;
    }

    if (this.state === 'LEVEL_SELECT') {
      const startX = 110;
      const startY = 140;
      for (let i = 0; i < LEVELS.length; i++) {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const bx = startX + col * 125;
        const by = startY + row * 140;
        if (x >= bx && x <= bx + 105 && y >= by && y <= by + 100) {
          if (this.sounds) this.sounds.playWordClick();
          this.loadLevel(i);
          this.state = 'PLAYING';
          return;
        }
      }
      if (x >= 400 && x <= 560 && y >= 500 && y <= 550) {
        this.state = 'TITLE';
      }
      return;
    }

    if (this.state === 'PAUSED') {
      if (x >= 380 && x <= 580 && y >= 250 && y <= 300) {
        this.state = 'PLAYING';
      } else if (x >= 380 && x <= 580 && y >= 320 && y <= 370) {
        this.state = 'LEVEL_SELECT';
      }
      return;
    }

    if (this.state === 'WIN') {
      if (x >= 360 && x <= 600 && y >= 470 && y <= 530) {
        this.loadLevel(0);
        this.state = 'PLAYING';
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
    ctx.fillStyle = '#FFE500';
    ctx.fillRect(0, 0, 960, 600);

    ctx.save();
    ctx.translate(480, 240);
    for (let i = 0; i < 16; i++) {
      ctx.rotate((Math.PI * 2) / 16);
      ctx.fillStyle = i % 2 === 0 ? '#FFDD00' : '#FFC300';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(600, -50);
      ctx.lineTo(600, 50);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if (this.renderer.halftonePattern) {
      ctx.fillStyle = this.renderer.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
    }

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(5, 5, 950, 590);

    ctx.fillStyle = '#000000';
    ctx.fillRect(40, 25, 880, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMIC JAM EDITION #1  ★  THEMES: COMIC + TWIST + LIGHT', 480, 52);

    ctx.save();
    const titleY = 192;
    ctx.font = '900 126px "Bangers", "Impact", "Arial Black", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#000000';
    ctx.fillText('RETCON', 480 + 9, titleY + 9);

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.strokeText('RETCON', 480, titleY);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('RETCON', 480, titleY);
    ctx.restore();

    ctx.fillStyle = '#FF0055';
    ctx.fillRect(240, 240, 480, 44);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(240, 240, 480, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DON’T FIGHT THE ENEMIES. REWRITE THE STORY.', 480, 270);

    // Play Button
    ctx.fillStyle = '#000';
    ctx.fillRect(364, 374, 240, 60);
    ctx.fillStyle = '#00E676';
    ctx.fillRect(360, 370, 240, 60);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(360, 370, 240, 60);
    ctx.fillStyle = '#000';
    ctx.font = '900 34px "Bangers", "Impact", sans-serif';
    ctx.fillText('▶ PLAY', 480, 412);

    // Level Select Button
    ctx.fillStyle = '#000';
    ctx.fillRect(364, 454, 240, 50);
    ctx.fillStyle = '#38B6FF';
    ctx.fillRect(360, 450, 240, 50);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(360, 450, 240, 50);
    ctx.fillStyle = '#000';
    ctx.font = '900 24px "Bangers", "Impact", sans-serif';
    ctx.fillText('LEVEL SELECT', 480, 484);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Created by Team APEX: Sai Ram, Sri Vignesh Arya, Jaswanth Charry', 480, 550);
  }

  renderLevelSelectScreen(ctx) {
    ctx.fillStyle = '#1D3557';
    ctx.fillRect(0, 0, 960, 600);

    if (this.renderer.halftonePattern) {
      ctx.fillStyle = this.renderer.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
    }

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(4, 4, 952, 592);

    ctx.fillStyle = '#FFE500';
    ctx.font = '900 38px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000';
    ctx.strokeText('SELECT ISSUE & STARS', 480, 70);
    ctx.fillText('SELECT ISSUE & STARS', 480, 70);

    // 12 Level Cards (2 rows of 6)
    const startX = 110;
    const startY = 135;
    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const bx = startX + col * 125;
      const by = startY + row * 145;
      const lvl = LEVELS[i];
      const starCount = this.savedStars[lvl.id] || 0;

      ctx.fillStyle = '#000';
      ctx.fillRect(bx + 4, by + 4, 105, 105);

      ctx.fillStyle = '#F1FAEE';
      ctx.fillRect(bx, by, 105, 105);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#000';
      ctx.strokeRect(bx, by, 105, 105);

      ctx.fillStyle = '#E63946';
      ctx.font = '900 28px "Bangers", sans-serif';
      ctx.fillText(`#${lvl.id}`, bx + 52, by + 34);

      ctx.fillStyle = '#1D3557';
      ctx.font = 'bold 11px sans-serif';
      const shortTitle = lvl.title.split(':')[1] || lvl.title;
      ctx.fillText(shortTitle.trim().slice(0, 13), bx + 52, by + 60);

      // Star rating display
      ctx.fillStyle = '#FFB703';
      ctx.font = '900 16px sans-serif';
      let starStr = starCount === 3 ? "★★★" : (starCount === 2 ? "★★☆" : (starCount === 1 ? "★☆☆" : "☆☆☆"));
      ctx.fillText(starStr, bx + 52, by + 82);

      const bestRetries = this.savedRetries[lvl.id];
      ctx.fillStyle = '#457B9D';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(bestRetries !== undefined ? `BEST: ${bestRetries} TRIES` : `PAR: ${lvl.par || 1}`, bx + 52, by + 97);
    }

    // Back Button
    ctx.fillStyle = '#E63946';
    ctx.fillRect(400, 500, 160, 48);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(400, 500, 160, 48);
    ctx.fillStyle = '#FFF';
    ctx.font = '900 24px "Bangers", sans-serif';
    ctx.fillText('BACK', 480, 532);
  }

  renderPauseMenu(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, 960, 600);

    ctx.fillStyle = '#FFE500';
    ctx.font = '900 64px "Bangers", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000';
    ctx.strokeText('PAUSED', 480, 180);
    ctx.fillText('PAUSED', 480, 180);

    ctx.fillStyle = '#00E676';
    ctx.fillRect(380, 250, 200, 50);
    ctx.strokeRect(380, 250, 200, 50);
    ctx.fillStyle = '#000';
    ctx.font = '900 26px "Bangers", sans-serif';
    ctx.fillText('RESUME', 480, 285);

    ctx.fillStyle = '#38B6FF';
    ctx.fillRect(380, 320, 200, 50);
    ctx.strokeRect(380, 320, 200, 50);
    ctx.fillStyle = '#000';
    ctx.fillText('LEVEL SELECT', 480, 355);
  }

  renderPageTurnEffect(ctx) {
    const turnX = 960 * (1 - this.pageTurnProgress);
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(turnX, 0, 960, 600);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(turnX + 10, 0, 20, 600);
    ctx.restore();
  }

  renderWinScreen(ctx) {
    ctx.fillStyle = '#FFDD00';
    ctx.fillRect(0, 0, 960, 600);

    if (this.renderer.halftonePattern) {
      ctx.fillStyle = this.renderer.halftonePattern;
      ctx.fillRect(0, 0, 960, 600);
    }

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(5, 5, 950, 590);

    ctx.font = '900 76px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000';
    ctx.strokeText('THE END!', 480, 110);
    ctx.fillStyle = '#FF0055';
    ctx.fillText('THE END!', 480, 110);

    ctx.font = '900 30px "Bangers", sans-serif';
    ctx.strokeText('YOU OUTSMARTED THE NARRATOR & SAVED THE COMIC!', 480, 175);
    ctx.fillStyle = '#000';
    ctx.fillText('YOU OUTSMARTED THE NARRATOR & SAVED THE COMIC!', 480, 175);

    // Stars Summary
    let totalStars = 0;
    for (const id in this.savedStars) {
      totalStars += this.savedStars[id];
    }
    ctx.fillStyle = '#1D3557';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`TOTAL STARS: ${totalStars} / 36   ★   RETRIES: ${this.deaths}`, 480, 230);

    // Credits Panel
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(180, 270, 600, 150);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(180, 270, 600, 150);

    ctx.fillStyle = '#E63946';
    ctx.font = '900 24px "Bangers", sans-serif';
    ctx.fillText('DEVELOPED FOR GAME JAM BY TEAM APEX', 480, 310);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Sai Ram  •  Sri Vignesh Arya  •  Jaswanth Charry', 480, 350);
    ctx.font = '15px sans-serif';
    ctx.fillText('Tech: HTML5 Canvas 2D + Web Audio API (Zero Bundler/CDN)', 480, 385);

    // Play Again button
    ctx.fillStyle = '#00E676';
    ctx.fillRect(360, 465, 240, 58);
    ctx.strokeRect(360, 465, 240, 58);
    ctx.fillStyle = '#000';
    ctx.font = '900 32px "Bangers", sans-serif';
    ctx.fillText('PLAY AGAIN', 480, 506);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new RetconGame();
});
