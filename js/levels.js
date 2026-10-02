// Level Data Definitions for RETCON
// All 12 levels feature two-line narrative captions, hero verb mechanics,
// fourth-wall elements (pushable speech bubbles, solid caption boxes, panel border breaks),
// and strict mathematical solvability.

const LEVELS = [
  // ISSUE #1: TUTORIAL
  {
    id: 1,
    title: "ISSUE #1: THE BROKEN CROSSING",
    captionTemplate: "The bridge was [bridge].\nEd [verb] to the door.",
    words: { bridge: "BROKEN", verb: "WALKED" },
    wordOptions: { bridge: ["BROKEN", "STONE"], verb: ["WALKED", "SPRINTED"] },
    par: 1,
    heroStart: { x: 80, y: 380 },
    exit: { x: 840, y: 370, width: 46, height: 65 },
    heroHint: "Click [BROKEN] to mend the bridge!",
    solids: [
      { x: 0, y: 440, width: 280, height: 160, color: '#332B3A' },
      { x: 620, y: 440, width: 340, height: 160, color: '#332B3A' },
      { x: -20, y: 0, width: 20, height: 600, color: '#000' }
    ],
    entities: [
      {
        id: 'bridge_1',
        type: 'bridge',
        x: 280,
        y: 440,
        width: 340,
        height: 28,
        color: '#7A7A7A'
      }
    ]
  },

  // ISSUE #2: LIGHT & SHADOW (REQUIRES FLOATED OR STOMPED)
  {
    id: 2,
    title: "ISSUE #2: CREATURES OF THE DARK",
    captionTemplate: "The sky was [time] and a high obstacle blocked the exit.\nEd [verb] to the door.",
    words: { time: "NIGHT", verb: "WALKED" },
    wordOptions: { time: ["NIGHT", "DAY"], verb: ["WALKED", "FLOATED", "STOMPED"] },
    par: 2,
    heroStart: { x: 80, y: 380 },
    exit: { x: 860, y: 375, width: 46, height: 65 },
    heroHint: "Switch to FLOATED to leap the high obstacle, or STOMPED to break the floor!",
    solids: [
      { x: 0, y: 440, width: 340, height: 160, color: '#332B3A' },
      { x: 440, y: 260, width: 80, height: 180, color: '#1B1724' }, // 180px tall barrier
      { x: 520, y: 440, width: 440, height: 160, color: '#332B3A' },
      { x: 340, y: 520, width: 220, height: 80, color: '#14111D' }, // Lower tunnel
      { x: 560, y: 480, width: 60, height: 120, color: '#252033' }, // Step up
      { x: -20, y: 0, width: 20, height: 600, color: '#000' }
    ],
    entities: [
      {
        id: 'beast_1',
        type: 'beast',
        x: 445,
        y: 170,
        width: 70,
        height: 90,
        deathMessage: "GRAAH!"
      },
      {
        id: 'cracked_lvl2',
        type: 'cracked_floor',
        x: 340,
        y: 440,
        width: 100,
        height: 24,
        broken: false
      }
    ]
  },

  // ISSUE #3: ICE & DAYLIGHT (VERB & WORLD INTERACTION)
  {
    id: 3,
    title: "ISSUE #3: THE THAWING PASSAGE",
    captionTemplate: "The hour was [time] and the bridge was crafted from [bridge].\nEd [verb] to the door.",
    words: { time: "DAY", bridge: "ICE", verb: "WALKED" },
    wordOptions: { time: ["DAY", "SUNSET", "NIGHT"], bridge: ["ICE", "STONE"], verb: ["WALKED", "STOMPED"] },
    par: 2,
    heroStart: { x: 70, y: 380 },
    exit: { x: 860, y: 370, width: 46, height: 65 },
    heroHint: "Daylight melts ice! Freeze it or build with stone!",
    solids: [
      { x: 0, y: 440, width: 240, height: 160, color: '#332B3A' },
      { x: 680, y: 440, width: 280, height: 160, color: '#332B3A' }
    ],
    entities: [
      {
        id: 'bridge_ice',
        type: 'bridge',
        x: 240,
        y: 440,
        width: 440,
        height: 28
      }
    ]
  },

  // ISSUE #4: SUNSET SHADOW RAMP (SOLID CAPTION BOX #1)
  {
    id: 4,
    title: "ISSUE #4: REACHING THE HIGH GROUND",
    captionTemplate: "The sun was [time] before the towering wall.\nEd [verb] to the door.",
    words: { time: "DAY", verb: "WALKED" },
    wordOptions: { time: ["DAY", "SUNSET", "NIGHT"], verb: ["WALKED", "FLOATED", "SPRINTED"] },
    par: 1,
    solidCaptionBox: true, // Specific Level 4 solid caption box!
    heroStart: { x: 80, y: 460 },
    exit: { x: 860, y: 215, width: 46, height: 65 },
    heroHint: "At SUNSET the shadow forms a ramp, or FLOATED can reach the solid caption box!",
    solids: [
      { x: 0, y: 520, width: 960, height: 80, color: '#332B3A' },
      { x: 560, y: 280, width: 400, height: 240, color: '#1B1724' },
      { x: -20, y: 0, width: 20, height: 600, color: '#000' }
    ],
    entities: [
      {
        id: 'shadow_ramp_1',
        type: 'shadow_ramp',
        x: 160,
        y: 280,
        width: 400,
        height: 240
      }
    ]
  },

  // ISSUE #5: THE CASTLE GATEKEEPER
  {
    id: 5,
    title: "ISSUE #5: THE CASTLE GATEKEEPER",
    captionTemplate: "The royal sentinel was [guard] at the fortress exit.\nEd [verb] to the door.",
    words: { guard: "ANGRY", verb: "WALKED" },
    wordOptions: { guard: ["ANGRY", "ASLEEP", "FRIENDLY"], verb: ["WALKED", "FLOATED"] },
    par: 1,
    heroStart: { x: 80, y: 420 },
    exit: { x: 850, y: 415, width: 46, height: 65 },
    heroHint: "That guard looks furious! Can I calm or pacify him?",
    solids: [
      { x: 0, y: 480, width: 960, height: 120, color: '#332B3A' }
    ],
    entities: [
      {
        id: 'guard_1',
        type: 'guard',
        x: 640,
        y: 390,
        width: 50,
        height: 90,
        deathMessage: "The angry guard captured you!"
      }
    ]
  },

  // ISSUE #6: THE HEAVY STOMP (VERB INTERACTION)
  {
    id: 6,
    title: "ISSUE #6: THE HEAVY STOMP",
    captionTemplate: "The stone dungeon floor was cracked.\nEd [verb] to the door.",
    words: { verb: "WALKED" },
    wordOptions: { verb: ["WALKED", "STOMPED", "FLOATED"] },
    par: 1,
    heroStart: { x: 80, y: 260 },
    exit: { x: 860, y: 475, width: 46, height: 65 },
    heroHint: "STOMPED makes Ed heavy enough to smash through cracked floors!",
    solids: [
      { x: 0, y: 320, width: 340, height: 24, color: '#332B3A' },
      { x: 620, y: 320, width: 340, height: 24, color: '#332B3A' },
      { x: 0, y: 540, width: 960, height: 60, color: '#1E1B29' }
    ],
    entities: [
      {
        id: 'cracked_1',
        type: 'cracked_floor',
        x: 340,
        y: 320,
        width: 280,
        height: 24,
        broken: false
      }
    ]
  },

  // ISSUE #7: THE FOURTH WALL - PUSHABLE SPEECH BUBBLE (SOLID CAPTION BOX #2)
  {
    id: 7,
    title: "ISSUE #7: HEFTING THE WORDS",
    captionTemplate: "A heavy comic block weighed in the center.\nEd [verb] to the door.",
    words: { verb: "WALKED" },
    wordOptions: { verb: ["WALKED", "SPRINTED", "FLOATED", "STOMPED"] },
    par: 1,
    solidCaptionBox: true, // Specific Level 7 solid caption box!
    heroStart: { x: 80, y: 420 },
    exit: { x: 860, y: 275, width: 46, height: 65 },
    heroHint: "Push the physical SPEECH BUBBLE block to make a stepping stone!",
    solids: [
      { x: 0, y: 480, width: 960, height: 120, color: '#332B3A' },
      { x: 740, y: 340, width: 220, height: 140, color: '#1B1724' }
    ],
    entities: [
      {
        id: 'bubble_block_1',
        type: 'speech_bubble_block',
        x: 440,
        y: 430,
        width: 70,
        height: 50,
        text: '"HEFT!"'
      }
    ]
  },

  // ISSUE #8: SEEDS OF SALVATION
  {
    id: 8,
    title: "ISSUE #8: SEEDS OF SALVATION",
    captionTemplate: "The weather was [weather] and the plant was a [plant].\nEd [verb] to the door.",
    words: { weather: "DRY", plant: "SEED", verb: "WALKED" },
    wordOptions: { weather: ["DRY", "RAIN"], plant: ["SEED", "VINE"], verb: ["WALKED", "FLOATED"] },
    par: 2,
    heroStart: { x: 80, y: 480 },
    exit: { x: 830, y: 155, width: 46, height: 65 },
    heroHint: "Rain grows seeds into climbable vines!",
    solids: [
      { x: 0, y: 540, width: 960, height: 60, color: '#332B3A' },
      { x: 620, y: 220, width: 340, height: 320, color: '#332B3A' }
    ],
    entities: [
      {
        id: 'vine_1',
        type: 'vine',
        x: 540,
        y: 200,
        width: 44,
        height: 340
      }
    ]
  },

  // ISSUE #9: WALKING ON WORDS
  {
    id: 9,
    title: "ISSUE #9: WALKING ON WORDS",
    captionTemplate: "A high observation bridge hovered above.\nEd [verb] to the door.",
    words: { verb: "WALKED" },
    wordOptions: { verb: ["WALKED", "FLOATED"] },
    par: 1,
    heroStart: { x: 80, y: 460 },
    exit: { x: 850, y: 195, width: 46, height: 65 },
    heroHint: "FLOATED gives you the lunar jump to reach high observation decks!",
    solids: [
      { x: 0, y: 520, width: 960, height: 80, color: '#332B3A' },
      { x: 260, y: 340, width: 180, height: 24, color: '#5A6E85' },
      { x: 560, y: 260, width: 400, height: 260, color: '#332B3A' }
    ],
    entities: []
  },

  // ISSUE #10: BEYOND THE BORDER (SOLID CAPTION BOX #3)
  {
    id: 10,
    title: "ISSUE #10: BREAKING THE FOURTH WALL",
    captionTemplate: "The right border of the comic was [border].\nEd [verb] to the door.",
    words: { border: "SOLID", verb: "WALKED" },
    wordOptions: { border: ["SOLID", "OPEN"], verb: ["WALKED", "FLOATED", "SPRINTED"] },
    par: 1,
    solidCaptionBox: true, // Specific Level 10 solid caption box!
    panelBorderExit: true, // Hero exits by walking right through the panel border!
    heroStart: { x: 80, y: 420 },
    exit: { x: 920, y: 415, width: 40, height: 65 },
    heroHint: "Open the comic border or leap onto the solid caption box!",
    solids: [
      { x: 0, y: 480, width: 960, height: 120, color: '#332B3A' }
    ],
    entities: []
  },

  // ISSUE #11: EDITING PERMISSION DENIED (NARRATOR 5-SECOND LOCK)
  {
    id: 11,
    title: "ISSUE #11: EDITING PERMISSION DENIED",
    captionTemplate: "The sky was [time] and the bridge was [bridge].\nEd [verb] to the door.",
    words: { time: "NIGHT", bridge: "BROKEN", verb: "WALKED" },
    wordOptions: { time: ["NIGHT", "DAY"], bridge: ["BROKEN", "STONE"], verb: ["WALKED", "FLOATED"] },
    par: 2,
    heroStart: { x: 70, y: 420 },
    exit: { x: 860, y: 415, width: 46, height: 65 },
    heroHint: "The bridge is locked! Switch to DAY and FLOATED to cross the beast's chasm first!",
    solids: [
      // Left starting platform: x: 0 to 250
      { x: 0, y: 480, width: 250, height: 120, color: '#332B3A' },
      // Middle staging island: x: 380 to 570 (safe haven while lock drains)
      { x: 380, y: 480, width: 190, height: 120, color: '#332B3A' },
      // Right exit platform: x: 740 to 960
      { x: 740, y: 480, width: 220, height: 120, color: '#332B3A' }
    ],
    entities: [
      // Section 1: Gap from 250 to 380 (width 130).
      // Shadow beast blocks the dark gap.
      // Solvable while locked: Player switches time to DAY (dissolves beast) and verb to FLOATED to leap across to the middle platform!
      {
        id: 'beast_11',
        type: 'beast',
        x: 280,
        y: 395,
        width: 60,
        height: 85,
        deathMessage: "GRAAH! The shadow beast strikes in darkness!"
      },
      // Section 2: Gap from 570 to 740 (width 170).
      // Bridge is locked for 5.0 seconds. Once unlocked, player changes BROKEN to STONE to reach the exit!
      {
        id: 'bridge_11',
        type: 'bridge',
        x: 570,
        y: 480,
        width: 170,
        height: 28
      }
    ],
    onInit: (engine) => {
      engine.lockWord('bridge', 5.0);
    }
  },

  // ISSUE #12: THE GRAND FINALE (TWIST & CLIMAX)
  {
    id: 12,
    title: "FINALE: RETCON - THE LAST PAGE",
    captionTemplate: "The narrator was [narrator].\nEd [verb] to the door.",
    words: { narrator: "VILLAIN", verb: "WALKED" },
    wordOptions: { narrator: ["VILLAIN", "HERO"], verb: ["WALKED", "SPRINTED", "FLOATED"] },
    par: 1,
    heroStart: { x: 80, y: 420 },
    exit: { x: 860, y: 415, width: 50, height: 65 },
    heroHint: "The Narrator locked your verbs! Rewrite HIM from VILLAIN to HERO!",
    solids: [
      { x: 0, y: 480, width: 960, height: 120, color: '#332B3A' }
    ],
    entities: [
      {
        id: 'narrator_boss',
        type: 'narrator_boss',
        x: 620,
        y: 350,
        width: 80,
        height: 130,
        deathMessage: "The villainous Narrator erased you!"
      }
    ],
    onInit: (engine) => {
      // Narrator locks verbs at start!
      engine.lockWord('verb', 999);
    }
  }
];

window.LEVELS = LEVELS;
