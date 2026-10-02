// Hero Controller for RETCON: "Ed the Editor"
// Procedural comic superhero with animated parts: Head, Torso, Arms, Legs, Cape,
// Pencil Emblem, Domino Mask, Halftone Shade, Hard Ellipse Shadow.
// Animation States: IDLE (breathing/blink), RUN (limb swing/bob/lean/dust/ticks),
// SKID, JUMP, FALL, LAND (squash), SCARED (wide eyes/sweat drop), WORD SWAP (!), WIN, DEATH (spin/X eyes).

class Hero {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 42;
    this.vx = 0;
    this.vy = 0;

    // Movement constants (responsive, acceleration & friction)
    this.maxSpeed = 300;
    this.accel = 2400;
    this.friction = 2000;
    this.jumpForce = -560;
    this.baseGravity = 1350;
    this.fallGravityMultiplier = 1.6;
    this.maxFallSpeed = 750;

    // State flags
    this.isGrounded = false;
    this.wasGrounded = false;
    this.isOnSlope = false;
    this.isDead = false;
    this.isWinning = false;
    this.facing = 1; // 1 = right, -1 = left

    // Polish: Coyote time & jump buffer
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.maxCoyoteTime = 0.10;
    this.maxJumpBuffer = 0.12;

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.landSquashTimer = 0;

    // Animation variables
    this.animTime = 0;
    this.runCycle = 0;
    this.stepTrigger = false;
    this.isSkidding = false;
    this.isScared = false;
    this.wordSwapTimer = 0;
    this.capeAngle = 0;
    this.deathSpinAngle = 0;
    this.nearestBeastDist = 9999;

    // Speech bubble
    this.speechText = "";
    this.speechTimer = 0;
  }

  say(text, duration = 2.5) {
    this.speechText = text;
    this.speechTimer = duration;
  }

  triggerWordSwap() {
    this.wordSwapTimer = 0.35;
  }

  respawn() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.isDead = false;
    this.isWinning = false;
    this.isOnSlope = false;
    this.scaleX = 1;
    this.scaleY = 1;
    this.landSquashTimer = 0;
    this.deathSpinAngle = 0;
    this.wordSwapTimer = 0;
    this.speechText = "";
  }

  update(dt, input, solids, climbables, lethals, slopes = [], verb = 'WALKED', pushables = []) {
    this.animTime += dt;

    // Apply Hero Verb Modifiers live
    this.currentVerb = verb;
    if (verb === 'FLOATED') {
      this.maxSpeed = 260;
      this.accel = 1100;
      this.friction = 1200;
      this.jumpForce = -640; // High jump height
      this.baseGravity = 1350 * 0.4; // Low gravity (x0.4 = 540 px/s^2)
      this.fallGravityMultiplier = 1.0;
      this.maxFallSpeed = 220; // Slow fall speed
      this.isHeavy = false;
    } else if (verb === 'STOMPED') {
      this.maxSpeed = 220;
      this.accel = 2200;
      this.friction = 2600;
      this.jumpForce = -420; // Low jump
      this.baseGravity = 1350 * 1.8; // Heavy gravity (x1.8 = 2430 px/s^2)
      this.fallGravityMultiplier = 1.8;
      this.maxFallSpeed = 900;
      this.isHeavy = true;
    } else if (verb === 'SPRINTED') {
      this.maxSpeed = 510; // Fast max speed (x1.7)
      this.accel = 3000;
      this.friction = 600; // Low friction / very slippery turn
      this.jumpForce = -560;
      this.baseGravity = 1350;
      this.fallGravityMultiplier = 1.6;
      this.maxFallSpeed = 750;
      this.isHeavy = false;
    } else {
      // WALKED (Normal baseline)
      this.maxSpeed = 300;
      this.accel = 2400;
      this.friction = 2000;
      this.jumpForce = -560;
      this.baseGravity = 1350;
      this.fallGravityMultiplier = 1.6;
      this.maxFallSpeed = 750;
      this.isHeavy = false;
    }

    if (this.isDead) {
      this.deathSpinAngle += dt * 14;
      this.vy += this.baseGravity * dt;
      this.y += this.vy * dt;
      return;
    }

    // Word Swap reaction timer
    if (this.wordSwapTimer > 0) {
      this.wordSwapTimer -= dt;
    }

    // Speech bubble timer
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) {
        this.speechText = "";
      }
    }

    // Squash & stretch recovery back to (1, 1)
    if (this.landSquashTimer > 0) {
      this.landSquashTimer -= dt;
    } else {
      this.scaleX += (1.0 - this.scaleX) * 16 * dt;
      this.scaleY += (1.0 - this.scaleY) * 16 * dt;
    }

    // Coyote & Jump buffer timers
    if (this.isGrounded) {
      this.coyoteTimer = this.maxCoyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = this.maxJumpBuffer;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Check distance to nearest active beast / lethal (for SCARED expression)
    this.nearestBeastDist = 9999;
    const heroMidX = this.x + this.width / 2;
    const heroMidY = this.y + this.height / 2;
    for (const lethal of lethals) {
      const lx = lethal.x + lethal.width / 2;
      const ly = lethal.y + lethal.height / 2;
      const d = Math.hypot(heroMidX - lx, heroMidY - ly);
      if (d < this.nearestBeastDist) {
        this.nearestBeastDist = d;
      }
    }
    this.isScared = (this.nearestBeastDist <= 200);

    // Horizontal Movement (Acceleration & Friction)
    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;

    // Skid detection: moving fast and pressing opposite
    this.isSkidding = false;
    if (this.isGrounded && Math.abs(this.vx) > 90 && moveDir !== 0 && Math.sign(moveDir) !== Math.sign(this.vx)) {
      this.isSkidding = true;
      if (Math.random() < 0.3 && window.fx) {
        window.fx.emit(this.x + this.width / 2, this.y + this.height, 2, 'dust', '#DDD');
      }
    }

    if (moveDir !== 0) {
      this.facing = moveDir;
      if (moveDir > 0) {
        if (this.vx < this.maxSpeed) {
          this.vx = Math.min(this.maxSpeed, this.vx + this.accel * dt);
        }
      } else {
        if (this.vx > -this.maxSpeed) {
          this.vx = Math.max(-this.maxSpeed, this.vx - this.accel * dt);
        }
      }

      // Run cycle animation timer
      if (this.isGrounded) {
        const prevCycle = this.runCycle;
        this.runCycle += Math.abs(this.vx) * dt * 0.042;

        // Step sound & dust puff on cycle boundaries
        if (Math.floor(prevCycle / Math.PI) !== Math.floor(this.runCycle / Math.PI)) {
          if (window.sounds) window.sounds.playFootstep();
          if (window.fx) {
            window.fx.emit(this.x + this.width / 2, this.y + this.height, 2, 'dust', '#D0D0D0');
          }
        }
      }
    } else {
      // Friction decelerating to 0
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - this.friction * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + this.friction * dt);
      }
      this.runCycle = 0;
    }

    // Climbing check
    let isClimbing = false;
    const heroBox = { x: this.x, y: this.y, width: this.width, height: this.height };
    for (const vine of climbables) {
      if (this.checkOverlap(heroBox, vine)) {
        if (input.up || input.down) {
          isClimbing = true;
          this.vy = (input.up ? -200 : 0) + (input.down ? 200 : 0);
          this.vx = moveDir * 140;
          this.isGrounded = true;
          break;
        }
      }
    }

    // Jumping
    if (!isClimbing && this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.isOnSlope = false;

      // Small subtle squash and stretch on jump (stretching up)
      this.scaleX = 0.88;
      this.scaleY = 1.15;

      if (window.sounds) window.sounds.playJump();
      if (window.fx) {
        window.fx.emit(this.x + this.width / 2, this.y + this.height, 6, 'dust', '#DDD');
      }
    }

    // Variable jump height: release early cuts upwards boost
    if (!input.jumpHeld && this.vy < -120) {
      this.vy *= 0.55;
    }

    // Gravity: higher gravity when falling (1.6x base gravity)
    if (!isClimbing) {
      const currentGravity = (this.vy > 0) 
        ? (this.baseGravity * this.fallGravityMultiplier) 
        : this.baseGravity;
      this.vy += currentGravity * dt;
      if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
    }

    // Cape animation angle
    const targetCapeAngle = -this.vx * 0.0024 + (this.vy < 0 ? -0.35 : 0.25) + Math.sin(this.animTime * 4) * 0.08;
    this.capeAngle += (targetCapeAngle - this.capeAngle) * 12 * dt;

    // Move X
    this.x += this.vx * dt;

    // Resolve pushable speech bubble blocks
    for (const pushable of pushables) {
      if (this.checkOverlap({ x: this.x, y: this.y, width: this.width, height: this.height }, pushable)) {
        if (this.vx > 0) {
          pushable.x += this.vx * dt;
          this.x = pushable.x - this.width;
        } else if (this.vx < 0) {
          pushable.x += this.vx * dt;
          this.x = pushable.x + pushable.width;
        }
      }
    }

    // Resolve X Collisions with solids
    for (const solid of solids) {
      if (this.checkOverlap({ x: this.x, y: this.y, width: this.width, height: this.height }, solid)) {
        if (this.vx > 0) {
          this.x = solid.x - this.width;
        } else if (this.vx < 0) {
          this.x = solid.x + solid.width;
        }
        this.vx = 0;
      }
    }

    // Move Y
    this.y += this.vy * dt;
    this.wasGrounded = this.isGrounded;
    this.isGrounded = false;
    this.isOnSlope = false;

    // Resolve Slope Collisions
    const midX = this.x + this.width / 2;
    for (const slope of slopes) {
      if (midX >= slope.x && midX <= slope.x + slope.width) {
        const t = (midX - slope.x) / slope.width;
        const surfaceY = (slope.y + slope.height) - t * slope.height;
        const heroBottom = this.y + this.height;

        if (heroBottom >= surfaceY - 14 && heroBottom <= surfaceY + 28 && this.vy >= -40) {
          this.y = surfaceY - this.height;
          this.vy = 0;
          this.isGrounded = true;
          this.isOnSlope = true;

          if (!this.wasGrounded) {
            this.triggerLandSquash(verb);
          }
        }
      }
    }

    // Resolve Y Collisions with regular solids
    for (const solid of solids) {
      if (this.checkOverlap({ x: this.x, y: this.y, width: this.width, height: this.height }, solid)) {
        if (this.vy > 0) {
          // Landing
          this.y = solid.y - this.height;
          this.vy = 0;
          this.isGrounded = true;

          if (!this.wasGrounded && !this.isOnSlope) {
            this.triggerLandSquash(verb);
          }

          // If hero is heavy (STOMPED), break cracked floors!
          if (this.isHeavy && solid.isCracked && solid.originalEntity && !solid.originalEntity.broken) {
            solid.originalEntity.broken = true;
            if (window.sounds) window.sounds.playThud();
            if (window.fx) {
              window.fx.triggerShake(12);
              window.fx.addPopup("CRACK!", solid.x + solid.width / 2, solid.y, { color: '#E76F51', scale: 1.2 });
              window.fx.emit(solid.x + solid.width / 2, solid.y + 10, 16, 'dust', '#8D7B68');
            }
          }

          // If hero stands on heavy switch
          if (solid.isSwitch && solid.originalEntity) {
            if (this.isHeavy && !solid.originalEntity.pressed) {
              solid.originalEntity.pressed = true;
              if (window.sounds) window.sounds.playThud();
              if (window.fx) {
                window.fx.addPopup("CLICK!", solid.x + solid.width / 2, solid.y - 15, { color: '#2EC4B6', scale: 1.1 });
              }
            }
          }
        } else if (this.vy < 0) {
          // Ceiling bonk
          this.y = solid.y + solid.height;
          this.vy = 0;
        }
      }
    }

    // Bottom pit check
    if (this.y > 620) {
      this.die("Fell off the panel!");
      return;
    }

    // Lethal collisions check
    for (const lethal of lethals) {
      if (this.checkOverlap({ x: this.x, y: this.y, width: this.width, height: this.height }, lethal)) {
        this.die(lethal.deathMessage || "Defeated!");
        return;
      }
    }
  }

  triggerLandSquash(verb = 'WALKED') {
    this.landSquashTimer = 0.10;
    this.scaleX = 1.20;
    this.scaleY = 0.80;

    if (verb === 'FLOATED') {
      // FLOATED: Hero bounces slightly on land with soft dust puff
      this.vy = -160;
      this.isGrounded = false;
      this.scaleX = 0.90;
      this.scaleY = 1.15;
      if (window.sounds) window.sounds.playJump();
      if (window.fx) {
        window.fx.emit(this.x + this.width / 2, this.y + this.height, 8, 'dust', '#C8E6C9');
      }
      return;
    }

    if (verb === 'STOMPED') {
      // STOMPED: Heavy landing thud and dust explosion
      if (window.sounds) window.sounds.playThud();
      if (window.fx) {
        window.fx.triggerShake(6);
        window.fx.emit(this.x + this.width / 2, this.y + this.height, 12, 'dust', '#8D7B68');
      }
      return;
    }

    // Normal landing
    if (window.sounds) window.sounds.playLand();
    if (window.fx) {
      for (let i = -1; i <= 1; i += 2) {
        window.fx.emit(this.x + this.width / 2 + i * 8, this.y + this.height, 4, 'dust', '#BBB');
      }
    }
  }

  die(message = "AAAH!") {
    if (this.isDead) return;
    this.isDead = true;
    this.vy = -340;
    this.vx = -this.facing * 120;
    if (window.sounds) window.sounds.playDeath();
    if (window.fx) {
      window.fx.triggerShake(10);
      window.fx.addPopup(message, this.x + this.width / 2, this.y - 10, { color: '#FF3333', scale: 1.2 });
      window.fx.emit(this.x + this.width / 2, this.y + this.height / 2, 16, 'square', '#FF4444');
    }
  }

  win() {
    this.isWinning = true;
    this.vy = -420;
    if (window.fx) {
      window.fx.addPopup("PAGE CLEAR!", this.x + this.width / 2, this.y - 30, { color: '#00F0FF', scale: 1.2 });
    }
  }

  checkOverlap(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  // Procedural Rendering of "Ed the Editor"
  render(ctx) {
    ctx.save();
    const centerX = this.x + this.width / 2;
    const bottomY = this.y + this.height;

    // 1. Hard Ellipse Shadow under the feet on the ground (always grounded visual anchor)
    if (!this.isDead) {
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      const shadowW = Math.max(8, 16 * (1 - Math.min(1, Math.max(0, (bottomY - 440) / 200))));
      ctx.ellipse(centerX, bottomY + 2, shadowW, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Anchor at feet
    ctx.translate(centerX, bottomY);

    if (this.isDead) {
      ctx.rotate(this.deathSpinAngle);
    } else {
      ctx.scale(this.scaleX * this.facing, this.scaleY);
    }

    // Animation pose calculation
    let bodyBob = 0;
    let forwardLean = 0;
    let leftLegAngle = 0;
    let rightLegAngle = 0;
    let leftArmAngle = 0;
    let rightArmAngle = 0;
    let isBlinking = (Math.floor(this.animTime * 0.35) % 3 === 0) && ((this.animTime % 1) < 0.15);

    if (!this.isDead) {
      if (this.isWinning) {
        // Happy jump victory pose
        leftArmAngle = -2.2;
        rightArmAngle = 2.2;
        leftLegAngle = -0.4;
        rightLegAngle = 0.4;
      } else if (!this.isGrounded) {
        if (this.vy < 0) {
          // JUMP (rising): arms up, legs tucked
          leftArmAngle = -1.8;
          rightArmAngle = -1.8;
          leftLegAngle = 0.5;
          rightLegAngle = 0.5;
        } else {
          // FALL: arms spread out, cape flaring
          leftArmAngle = -1.1;
          rightArmAngle = 1.1;
          leftLegAngle = -0.2;
          rightLegAngle = 0.2;
        }
      } else if (this.isSkidding) {
        // SKID pose: brace back
        forwardLean = -0.25;
        leftLegAngle = 0.6;
        rightLegAngle = 0.6;
        leftArmAngle = -1.2;
        rightArmAngle = 0.8;
      } else if (Math.abs(this.vx) > 15) {
        // RUN: limbs swing in opposition, body bobs, forward lean
        const runCycle = this.runCycle;
        leftLegAngle = Math.sin(runCycle) * 0.65;
        rightLegAngle = -Math.sin(runCycle) * 0.65;
        leftArmAngle = -Math.sin(runCycle) * 0.7;
        rightArmAngle = Math.sin(runCycle) * 0.7;
        bodyBob = Math.abs(Math.cos(runCycle)) * 2.8;
        forwardLean = (Math.abs(this.vx) / this.maxSpeed) * 0.14; // up to ~8 degrees
      } else {
        // IDLE: gentle breathing
        bodyBob = Math.sin(this.animTime * 3) * 0.8;
      }
    }

    ctx.rotate(forwardLean);

    // 2. FLOWING RED CAPE (Back layer)
    ctx.save();
    ctx.translate(0, -28 - bodyBob);
    ctx.rotate(this.capeAngle);
    ctx.fillStyle = '#E63946';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    const capeSpeedStretch = Math.min(22, Math.abs(this.vx) * 0.06);
    ctx.lineTo(-20 - capeSpeedStretch, 16);
    ctx.lineTo(-14 - capeSpeedStretch, 26);
    ctx.lineTo(-2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cape inner fold line
    ctx.strokeStyle = '#9D0208';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14 - capeSpeedStretch * 0.7, 18);
    ctx.stroke();
    ctx.restore();

    // 3. LEGS & YELLOW BOOTS
    // Left Leg
    this.drawLeg(ctx, -6, -16 - bodyBob, leftLegAngle);
    // Right Leg
    this.drawLeg(ctx, 6, -16 - bodyBob, rightLegAngle);

    // 4. TORSO (Blue suit with pencil emblem)
    ctx.save();
    ctx.translate(0, -22 - bodyBob);

    // Torso Blue Body
    ctx.fillStyle = '#0077B6';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 20, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Small halftone shade on right side of torso
    ctx.fillStyle = '#023E8A';
    ctx.fillRect(4, -7, 5, 14);

    // PENCIL EMBLEM on Chest!
    // Pink Eraser
    ctx.fillStyle = '#FF758F';
    ctx.fillRect(-2, -6, 4, 3);
    // Yellow Pencil Body
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(-2, -3, 4, 7);
    // Dark Tip
    ctx.fillStyle = '#212529';
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(2, 4);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 5. BIG HEAD (~40% of body height, ~17px diameter)
    ctx.save();
    ctx.translate(0, -34 - bodyBob);

    // Cute Round Head
    ctx.fillStyle = '#FFD166';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle halftone shading on bottom-right of head
    ctx.fillStyle = '#F4A261';
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, Math.PI * 0.15, Math.PI * 0.65);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // HERO DOMINO MASK
    ctx.fillStyle = '#03045E';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-8, -4, 16, 8, 3);
    ctx.fill();
    ctx.stroke();

    // EYES
    if (this.isDead) {
      // X EYES on Death
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      this.drawXEye(ctx, -3, 0);
      this.drawXEye(ctx, 3, 0);
    } else if (isBlinking) {
      // Blink: closed eye arc
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-3, 0, 2.5, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, 0, 2.5, 0, Math.PI);
      ctx.stroke();
    } else if (this.isScared) {
      // SCARED: Big Wide Circular Eyes + Blue Sweat Drop
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3, 0, 3.5, 0, Math.PI * 2);
      ctx.arc(3, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Tiny jittering pupils
      ctx.fillStyle = '#000000';
      const jitter = (Math.random() - 0.5) * 0.8;
      ctx.beginPath();
      ctx.arc(-3 + jitter, 0 + jitter, 1.2, 0, Math.PI * 2);
      ctx.arc(3 + jitter, 0 + jitter, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Comic Sweat Drop popping off head
      ctx.fillStyle = '#38B6FF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(8, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Normal Expressive Superhero Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-3, 0, 2.8, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(3, 0, 2.8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils looking in facing direction
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-2.5, 0, 1.4, 0, Math.PI * 2);
      ctx.arc(3.5, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Eye glint
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-3, -1.5, 1, 1);
      ctx.fillRect(3, -1.5, 1, 1);
    }

    ctx.restore();

    // 6. ARMS & YELLOW GLOVES (Front layer)
    // Left Arm
    this.drawArm(ctx, -9, -26 - bodyBob, leftArmAngle);
    // Right Arm
    this.drawArm(ctx, 9, -26 - bodyBob, rightArmAngle);

    // 7. WORD SWAP POPUP: Pop "!" badge above head for 0.3s
    if (this.wordSwapTimer > 0) {
      this.drawWordSwapAlert(ctx, 0, -48 - bodyBob);
    }

    ctx.restore();

    // Speech Bubble if any
    if (this.speechText) {
      this.renderSpeechBubble(ctx, centerX, this.y - 12);
    }
  }

  drawLeg(ctx, hipX, hipY, angle) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(angle);

    // Blue Thigh
    ctx.fillStyle = '#0077B6';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-3.5, 0, 7, 8);
    ctx.fill();
    ctx.stroke();

    // Yellow Boot (Feet reach exactly bottom 0)
    ctx.fillStyle = '#FFD100';
    ctx.beginPath();
    ctx.rect(-4, 7, 8, 9);
    ctx.fill();
    ctx.stroke();

    // Boot toe
    ctx.fillStyle = '#FFB703';
    ctx.fillRect(0, 12, 4, 4);

    ctx.restore();
  }

  drawArm(ctx, shoulderX, shoulderY, angle) {
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(angle);

    // Blue Upper Arm
    ctx.fillStyle = '#0077B6';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-3, 0, 6, 7);
    ctx.fill();
    ctx.stroke();

    // Yellow Glove
    ctx.fillStyle = '#FFD100';
    ctx.beginPath();
    ctx.arc(0, 9, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawXEye(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.moveTo(x + 2, y - 2);
    ctx.lineTo(x - 2, y + 2);
    ctx.stroke();
  }

  drawWordSwapAlert(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Comic alert starburst
    ctx.fillStyle = '#FFE600';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Exclamation mark
    ctx.fillStyle = '#000000';
    ctx.font = '900 13px "Bangers", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 1);
    ctx.restore();
  }

  renderSpeechBubble(ctx, x, y) {
    ctx.save();
    ctx.font = 'bold 15px "Bangers", "Impact", sans-serif';
    try { ctx.letterSpacing = '1px'; } catch (e) {}
    const textMetrics = ctx.measureText(this.speechText);
    const bubbleW = textMetrics.width + 24;
    const bubbleH = 32;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - bubbleH;

    // Bubble Tail
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 5, bubbleY + bubbleH);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x + 5, bubbleY + bubbleH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bubble Body (Rounded pill)
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8);
    ctx.fill();
    ctx.stroke();

    // Bubble Text
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.speechText, x, bubbleY + bubbleH / 2);
    ctx.restore();
  }
}

window.Hero = Hero;
