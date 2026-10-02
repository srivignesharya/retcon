// Tag and Rule Engine for RETCON
// Evaluates entity properties dynamically based on the current active narrator words.

class RuleEngine {
  constructor() {
    this.words = {}; // e.g. { time: 'DAY', bridge: 'BROKEN' }
    this.wordDefinitions = {
      time: ['NIGHT', 'DAY', 'SUNSET'],
      bridge: ['BROKEN', 'STONE', 'ICE'],
      guard: ['ASLEEP', 'ANGRY', 'FRIENDLY'],
      weather: ['DRY', 'RAIN'],
      plant: ['SEED', 'VINE'],
      verb: ['WALKED', 'FLOATED', 'STOMPED', 'SPRINTED'],
      narrator: ['HERO', 'VILLAIN']
    };
    this.wordBoxes = []; // Clickable bounds [{ key, word, x, y, width, height, isLocked }]
    this.lockedWords = {}; // key -> remaining seconds
    this.lockMaxDuration = {}; // key -> max duration seconds
  }

  setWords(initialWords, wordOptions = null) {
    this.words = { ...initialWords };
    this.wordBoxes = [];
    this.lockedWords = {};
    this.lockMaxDuration = {};
    this.currentLevelWordOptions = wordOptions || {};
  }

  lockWord(key, duration) {
    this.lockedWords[key] = duration;
    this.lockMaxDuration[key] = duration;

    // Narrator caption feedback on lock
    if (window.narratorVoice) {
      window.narratorVoice.speak("Not so fast...");
    }

    // Trigger one-time HUD tooltip
    if (window.game && typeof window.game.triggerLockTooltip === 'function') {
      window.game.triggerLockTooltip();
    }
  }

  isWordLocked(key) {
    return (this.lockedWords[key] || 0) > 0;
  }

  getLockRemaining(key) {
    return Math.max(0, this.lockedWords[key] || 0);
  }

  getLockProgress(key) {
    const max = this.lockMaxDuration[key] || 5.0;
    const cur = this.getLockRemaining(key);
    return cur > 0 ? (cur / max) : 0;
  }

  update(dt) {
    for (const key in this.lockedWords) {
      if (this.lockedWords[key] > 0) {
        this.lockedWords[key] -= dt;
        if (this.lockedWords[key] <= 0) {
          delete this.lockedWords[key];
          delete this.lockMaxDuration[key];

          // Feedback when word unlocks
          if (window.sounds) {
            if (typeof window.sounds.playUnlockChime === 'function') {
              window.sounds.playUnlockChime();
            } else if (typeof window.sounds.playStar === 'function') {
              window.sounds.playStar(2);
            }
          }

          if (window.narratorVoice) {
            window.narratorVoice.speak("Fine. Go ahead.");
          }

          if (window.fx) {
            window.fx.triggerShake(5);
            window.fx.addPopup("UNLOCKED!", 480, 80, {
              color: (window.THEME ? window.THEME.colors.success : '#2ec4b6'),
              scale: 1.25
            });
          }
        }
      }
    }
  }

  // Cycle a word to its next option
  cycleWord(key, heroPos = null) {
    if (this.isWordLocked(key)) {
      if (window.sounds) {
        if (typeof window.sounds.playPadlockClick === 'function') {
          window.sounds.playPadlockClick();
        } else {
          window.sounds.playDeath();
        }
      }
      const rem = this.getLockRemaining(key).toFixed(1);
      if (window.fx) {
        window.fx.triggerShake(4);
        window.fx.addPopup(`LOCKED! (${rem}s)`, 480, 70, { color: '#ff3860', scale: 1.15 });
      }
      return false;
    }

    const options = (this.currentLevelWordOptions && this.currentLevelWordOptions[key])
      || this.wordDefinitions[key];
    if (!options) return false;

    const currentIndex = options.indexOf(this.words[key]);
    const nextIndex = (currentIndex + 1) % options.length;
    const oldWord = this.words[key];
    const newWord = options[nextIndex];
    this.words[key] = newWord;

    // Trigger juicy comic feedback
    if (key === 'verb') {
      if (newWord === 'FLOATED') {
        if (window.sounds) window.sounds.playJump();
        if (window.fx) {
          window.fx.triggerShake(5);
          window.fx.addPopup("WHOOSH!", 480, 80, { color: (window.THEME ? window.THEME.colors.info : '#3a86ff'), scale: 1.2 });
        }
      } else if (newWord === 'STOMPED') {
        if (window.sounds) window.sounds.playThud();
        if (window.fx) {
          window.fx.triggerShake(9);
          window.fx.addPopup("THUD!", 480, 80, { color: (window.THEME ? window.THEME.colors.primary : '#ff3860'), scale: 1.3 });
        }
      } else if (newWord === 'SPRINTED') {
        if (window.sounds) window.sounds.playRetcon();
        if (window.fx) {
          window.fx.triggerShake(6);
          window.fx.addPopup("ZOOM!", 480, 80, { color: (window.THEME ? window.THEME.colors.secondary : '#ffd400'), scale: 1.2 });
        }
      } else {
        if (window.sounds) window.sounds.playWordClick();
        if (window.fx) {
          window.fx.addPopup("STRIDE!", 480, 80, { color: (window.THEME ? window.THEME.colors.success : '#2ec4b6'), scale: 1.1 });
        }
      }
    } else {
      if (window.sounds) {
        window.sounds.playRetcon();
      }
      if (window.fx) {
        window.fx.triggerShake(7);
        const onomats = ['RETCON!', 'POW!', 'ZAP!', 'WHOOSH!', 'BAM!', 'TWIST!'];
        const chosen = onomats[Math.floor(Math.random() * onomats.length)];
        window.fx.addPopup(chosen, 480 + (Math.random() - 0.5) * 80, 90, {
          color: (window.THEME ? window.THEME.colors.secondary : '#ffd400'),
          scale: 1.1
        });
      }
    }

    if (heroPos && window.fx) {
      window.fx.emit(heroPos.x, heroPos.y, 10, 'spark', '#FFE600');
    }

    return true;
  }

  // Force set word (used by Narrator twist)
  forceSetWord(key, value) {
    this.words[key] = value;
    if (window.sounds) window.sounds.playTwist();
    if (window.fx) {
      window.fx.triggerShake(12);
      window.fx.addPopup("TWIST!", 480, 80, { color: '#FF0055', scale: 1.3 });
    }
  }

  // Evaluate tags on an entity
  // Returns state: { solid: bool, lethal: bool, climbable: bool, visible: bool, message: string, color: string }
  evaluateEntity(entity) {
    const time = this.words.time || 'DAY';
    const bridge = this.words.bridge;
    const guard = this.words.guard;
    const weather = this.words.weather;
    const plant = this.words.plant;

    const result = {
      solid: entity.defaultSolid !== undefined ? entity.defaultSolid : true,
      lethal: false,
      climbable: false,
      visible: true,
      color: entity.color || '#333',
      label: entity.label || ''
    };

    switch (entity.type) {
      case 'bridge':
        if (bridge === 'BROKEN') {
          result.solid = false;
          result.visible = false;
          result.label = 'CRUMBLED GAP';
          result.color = 'transparent';
        } else if (bridge === 'STONE') {
          result.solid = true;
          result.visible = true;
          result.label = 'STONE BRIDGE';
          result.color = '#7A7A7A';
        } else if (bridge === 'ICE') {
          if (time === 'DAY') {
            // Ice melts in DAY!
            result.solid = false;
            result.visible = true;
            result.label = 'MELTED WATER';
            result.color = '#38B6FF';
          } else {
            // Night or Sunset, ice is solid and slippery
            result.solid = true;
            result.visible = true;
            result.slippery = true;
            result.label = 'GLACIAL ICE';
            result.color = '#A0E8FF';
          }
        }
        break;

      case 'beast':
        // Shadow beasts react to LIGHT / TIME
        if (time === 'NIGHT') {
          result.solid = true;
          result.lethal = true;
          result.visible = true;
          result.label = 'SHADOW BEAST';
          result.color = '#110022';
        } else if (time === 'DAY') {
          // Dissolves in daylight
          result.solid = false;
          result.lethal = false;
          result.visible = false;
          result.dissolved = true;
        } else if (time === 'SUNSET') {
          // Sunset: sleepy / harmless silhouette
          result.solid = true;
          result.lethal = false;
          result.visible = true;
          result.label = 'SLEEPING SHADOW';
          result.color = '#523A6E';
        }
        break;

      case 'shadow_ramp':
        // Tower's long shadow at sunset becomes a walkable ramp
        if (time === 'SUNSET') {
          result.solid = true;
          result.isSlope = true;
          result.visible = true;
          result.color = '#261335';
          result.label = 'SOLID SHADOW';
        } else {
          result.solid = false;
          result.isSlope = false;
          result.visible = true;
          result.isFlatShadow = true; // In DAY or NIGHT it turns into a harmless flat ground shadow
          result.color = 'rgba(20, 10, 40, 0.25)';
          result.label = 'FLAT SHADOW';
        }
        break;

      case 'moon_platform':
        // Moonlight platform only solid at NIGHT
        if (time === 'NIGHT') {
          result.solid = true;
          result.visible = true;
          result.color = '#C9F0FF';
          result.label = 'MOONLIGHT BEAM';
        } else {
          result.solid = false;
          result.visible = false;
        }
        break;

      case 'narrator_boss':
      case 'guard':
        if (this.words.narrator) {
          if (this.words.narrator === 'HERO') {
            result.solid = false;
            result.lethal = false;
            result.visible = true;
            result.color = '#00F0FF';
            result.label = 'HEROIC NARRATOR';
          } else {
            result.solid = true;
            result.lethal = true;
            result.visible = true;
            result.color = '#7209B7';
            result.label = 'EVIL NARRATOR';
          }
          break;
        }
        if (guard === 'ASLEEP') {
          result.solid = false; // Hero can walk past
          result.lethal = false;
          result.color = '#5A6E85';
          result.label = 'ZZZ...';
        } else if (guard === 'ANGRY') {
          result.solid = true;
          result.lethal = true; // Lethal to touch
          result.color = '#E63946';
          result.label = 'HALT! ENEMY!';
        } else if (guard === 'FRIENDLY') {
          result.solid = false;
          result.lethal = false;
          result.color = '#2A9D8F';
          result.label = 'WELCOME!';
        }
        break;

      case 'vine':
        // Seed vs Vine and Rain
        if (plant === 'VINE' || (plant === 'SEED' && weather === 'RAIN')) {
          result.solid = false;
          result.climbable = true;
          result.visible = true;
          result.color = '#38B000';
          result.label = 'CLIMBABLE VINE';
        } else {
          result.solid = false;
          result.climbable = false;
          result.visible = true;
          result.color = '#8A5A36';
          result.label = 'TINY SEED';
        }
        break;

      case 'cracked_floor':
        if (entity.broken) {
          result.solid = false;
          result.visible = false;
        } else {
          result.solid = true;
          result.isCracked = true;
          result.visible = true;
          result.color = '#8D7B68';
          result.label = 'CRACKED FLOOR';
        }
        break;

      case 'heavy_switch':
        result.solid = true;
        result.isSwitch = true;
        result.visible = true;
        result.color = entity.pressed ? '#2EC4B6' : '#E71D36';
        result.label = entity.pressed ? 'ACTIVE' : 'SWITCH';
        break;

      case 'gate':
        if (entity.opened) {
          result.solid = false;
          result.visible = false;
        } else {
          result.solid = true;
          result.visible = true;
          result.color = '#1D3557';
          result.label = 'GATE';
        }
        break;

      case 'speech_bubble_block':
        result.solid = true;
        result.isPushable = true;
        result.visible = true;
        result.color = '#FFFFFF';
        result.label = entity.text || 'HEFT!';
        break;

      default:
        break;
    }

    return result;
  }
}

window.ruleEngine = new RuleEngine();
