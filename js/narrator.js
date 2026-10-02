// Narrator Personality Engine for RETCON
// Features: Typewriter letter-by-letter typing with blip sfx,
// 50+ categorized contextual dialogue lines, progressive annoyance, and idle hints.

class NarratorVoice {
  constructor() {
    this.currentText = "";
    this.targetText = "";
    this.charIndex = 0;
    this.typeSpeed = 0.024; // Seconds per character
    this.typeTimer = 0;
    this.idleTimer = 0;
    this.idleHintGiven = false;
    this.levelDeathCount = 0;
    this.totalRetries = 0;
    this.levelStartTime = 0;
    this.lastCategory = "";

    // 50+ Contextual lines (all under 70 characters)
    this.lines = {
      level_start: [
        "Let's see if you can fix this mess...",
        "A fresh page. Try not to ruin it.",
        "Issue begins. Watch your step, hero.",
        "The scene is set. Don't disappoint me.",
        "Panel one. Hero enters from stage left.",
        "My finest prose yet. Try reading it.",
        "Every word here was carefully chosen.",
        "Another chapter in this tedious quest.",
        "Act surprised by the obstacles ahead.",
        "Here we go again. Do try to survive."
      ],
      level_start_sarcastic: [
        "Back again? Try reading the captions this time.",
        "Let's see if you can fix this mess this time.",
        "Panel one, take four. Action, I suppose.",
        "Still stuck here? Maybe try a different verb.",
        "I've rewritten this opening ten times already."
      ],
      word_swap: [
        "Oh, you changed it to DAY? How original.",
        "Hey! That was my favorite noun!",
        "You can't just cross out my writing!",
        "Who gave you an eraser?!",
        "Stop vandalizing my plot!",
        "That word took me hours to choose!",
        "Grammar rules mean nothing to you?!",
        "Fine, rewrite reality. See if I care.",
        "My publisher is going to hate this.",
        "You're altering the canon, you know.",
        "Despicable. The font didn't even match!"
      ],
      death_first: [
        "Oops.",
        "Well, that didn't go as scripted.",
        "A minor editorial miscalculation.",
        "That's going to leave an ink smudge.",
        "The ink was barely dry, hero.",
        "Careful. Erasers leave permanent marks."
      ],
      death_repeated: [
        "And again... Are you even trying?",
        "Are you trying to set a record for splats?",
        "The hero died. Again. Thrilling prose.",
        "Maybe let someone else hold the keys?",
        "I'm running out of red ink here.",
        "Is falling into pits your primary skill?",
        "That's death number three. Splendid form.",
        "Do you require a pair of reading glasses?",
        "Even the beasts look embarrassed for you.",
        "Perhaps read the words before jumping?",
        "My patience is thinner than this paper."
      ],
      victory: [
        "Fine, you won. But I'll rewrite the ending.",
        "Show-off. You skimmed right past my lore.",
        "Rushing through my masterpiece?!",
        "Barely gave the readers time to enjoy it.",
        "Finally. I was literally growing old.",
        "About time. My editor was calling.",
        "A sluggish performance, but you're through.",
        "A hasty conclusion, but permissible."
      ],
      idle_hint: [
        "Psst... words in brackets can be clicked.",
        "Staring at the screen won't bridge that gap.",
        "Try changing the hero verb, genius.",
        "The story won't advance itself, you know.",
        "Click a pink word. Go on, be bold.",
        "You do realize this isn't a picture book?",
        "Standing there won't defeat shadow beasts.",
        "Ed looks as bored as I feel right now.",
        "Need a hint? Click the bracketed words!",
        "Tick tock. Comic jams have deadlines."
      ]
    };
  }

  // Set new dialogue to type out
  speak(text) {
    if (this.targetText === text) return;
    this.targetText = text.slice(0, 68); // Enforce short concise lines
    this.currentText = "";
    this.charIndex = 0;
    this.typeTimer = 0;
  }

  sayRandom(category) {
    const pool = this.lines[category];
    if (!pool || pool.length === 0) return;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    this.lastCategory = category;
    this.speak(choice);
  }

  onLevelStart(levelIndex, retries = 0) {
    this.levelDeathCount = 0;
    this.totalRetries = retries;
    this.levelStartTime = performance.now();
    this.idleTimer = 0;
    this.idleHintGiven = false;

    if (levelIndex === 0) {
      this.speak("Welcome to RETCON. Click bracketed words to edit reality.");
    } else if (levelIndex === 11) {
      this.speak("I am the Narrator, and your story ENDS on this page!");
    } else if (retries >= 2) {
      this.sayRandom('level_start_sarcastic');
    } else {
      this.sayRandom('level_start');
    }
  }

  onWordSwap() {
    this.idleTimer = 0;
    this.sayRandom('word_swap');
  }

  onHeroDeath() {
    this.levelDeathCount++;
    this.idleTimer = 0;
    if (this.levelDeathCount === 1) {
      this.sayRandom('death_first');
    } else {
      this.sayRandom('death_repeated');
    }
  }

  onLevelComplete() {
    this.sayRandom('victory');
  }

  update(dt, isHeroMoving) {
    // Idle hint timer (10 seconds)
    if (!isHeroMoving) {
      this.idleTimer += dt;
      if (this.idleTimer >= 10.0 && !this.idleHintGiven) {
        this.idleHintGiven = true;
        this.sayRandom('idle_hint');
      }
    } else {
      this.idleTimer = 0;
    }

    // Typewriter effect
    if (this.charIndex < this.targetText.length) {
      this.typeTimer += dt;
      if (this.typeTimer >= this.typeSpeed) {
        this.typeTimer -= this.typeSpeed;
        this.charIndex++;
        this.currentText = this.targetText.slice(0, this.charIndex);
        
        // Play small blip on non-space characters
        if (this.targetText[this.charIndex - 1] !== ' ') {
          if (window.sounds) window.sounds.playTypeBlip();
        }
      }
    }
  }
}

window.narratorVoice = new NarratorVoice();
