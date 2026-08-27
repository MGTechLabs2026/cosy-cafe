// data/scenes.ts — scene definitions for M3 content pass
// All scenes keyed by ID matching save.flags.seen_scenes entries

import type { SceneDef, SceneBeat, SceneLine, SceneChoice } from '../ui/scene.js';
import type { SaveData } from '../save/validate.js';
import type { HeartLedger } from '../sim/hearts.js';
import { FAVORITES } from '../sim/customers.js';

// Helper to create a line
function line(character: SceneLine['character'], key: string): SceneLine {
  return { character, key };
}

// Helper to create a choice
function choice(promptKey: string, opt1: [string, string], opt2: [string, string], heartPoints = 0): SceneBeat['choice'] {
  return {
    promptKey,
    options: [
      { labelKey: opt1[0], flavorKey: opt1[1], heartPoints },
      { labelKey: opt2[0], flavorKey: opt2[1], heartPoints },
    ],
  } as SceneBeat['choice'];
}

// ============================================================
// FENWICK ARC — "The Route" (6 scenes)
// Heart gates: intro @ 0–1, middles @ 2–3, resolution @ 4, epilogue @ 5
// ============================================================

export const FENWICK_SCENES: SceneDef[] = [
  // Scene 1: Intro — The mountain pass is closing
  {
    id: 'fenwick_scene1',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene1.line1'),
          line('fenwick', 'fenwick.scene1.line2'),
          line('fenwick', 'fenwick.scene1.line3'),
          line('fenwick', 'fenwick.scene1.line4'),
        ],
        choice: choice(
          'fenwick.scene1.choicePrompt',
          ['fenwick.scene1.choice1Label', 'fenwick.scene1.choice1Flavor'],
          ['fenwick.scene1.choice2Label', 'fenwick.scene1.choice2Flavor'],
        ),
      },
    ],
  },
  // Scene 2: Middle 1 — First frost, transfer papers
  {
    id: 'fenwick_scene2',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene2.line1'),
          line('fenwick', 'fenwick.scene2.line2'),
          line('fenwick', 'fenwick.scene2.line3'),
          line('fenwick', 'fenwick.scene2.line4'),
        ],
        choice: choice(
          'fenwick.scene2.choicePrompt',
          ['fenwick.scene2.choice1Label', 'fenwick.scene2.choice1Flavor'],
          ['fenwick.scene2.choice2Label', 'fenwick.scene2.choice2Flavor'],
        ),
      },
    ],
  },
  // Scene 3: Middle 2 — The traveler's letter
  {
    id: 'fenwick_scene3',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene3.line1'),
          line('fenwick', 'fenwick.scene3.line2'),
          line('fenwick', 'fenwick.scene3.line3'),
          line('fenwick', 'fenwick.scene3.line4'),
          line('fenwick', 'fenwick.scene3.line5'),
        ],
      },
    ],
  },
  // Scene 4: Middle 3 — Walking the loop, the chimney smoke
  {
    id: 'fenwick_scene4',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene4.line1'),
          line('fenwick', 'fenwick.scene4.line2'),
          line('fenwick', 'fenwick.scene4.line3'),
          line('fenwick', 'fenwick.scene4.line4'),
        ],
        choice: choice(
          'fenwick.scene4.choicePrompt',
          ['fenwick.scene4.choice1Label', 'fenwick.scene4.choice1Flavor'],
          ['fenwick.scene4.choice2Label', 'fenwick.scene4.choice2Flavor'],
        ),
      },
    ],
  },
  // Scene 5: Resolution — Tears up papers, negotiates letter-carrier route
  {
    id: 'fenwick_scene5',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene5.line1'),
          line('fenwick', 'fenwick.scene5.line2'),
          line('fenwick', 'fenwick.scene5.line3'),
          line('fenwick', 'fenwick.scene5.line4'),
          line('fenwick', 'fenwick.scene5.line5'),
          line('fenwick', 'fenwick.scene5.line6'),
        ],
      },
    ],
    onComplete: (save: SaveData, hearts: HeartLedger) => {
      // Grant ember chili stock (adds ingredient to inventory + shelf if space)
      // This is handled by the controller when the scene completes
      save.flags.fenwick_arc_complete = true;
    },
  },
  // Scene 6: Epilogue — Gifts ember chili crate + thermos
  {
    id: 'fenwick_scene6',
    beats: [
      {
        lines: [
          line('fenwick', 'fenwick.scene6.line1'),
          line('fenwick', 'fenwick.scene6.line2'),
          line('fenwick', 'fenwick.scene6.line3'),
          line('fenwick', 'fenwick.scene6.line4'),
          line('fenwick', 'fenwick.scene6.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, hearts: HeartLedger) => {
      save.flags.fenwick_epilogue_done = true;
    },
  },
];

// ============================================================
// WREN ARC — "The Usual" (6 scenes)
// Heart gates: intro @ 0–1, middles @ 2–3, resolution @ 4, epilogue @ 5
// ============================================================

export const WREN_SCENES: SceneDef[] = [
  // Scene 1: Intro — The mystery of the usual
  {
    id: 'wren_scene1',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene1.line1'),
          line('wren', 'wren.scene1.line2'),
          line('wren', 'wren.scene1.line3'),
          line('wren', 'wren.scene1.line4'),
          line('wren', 'wren.scene1.line5'),
          line('wren', 'wren.scene1.line6'),
        ],
      },
    ],
  },
  // Scene 2: Middle 1 — First clues (milk, honey)
  {
    id: 'wren_scene2',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene2.line1'),
          line('wren', 'wren.scene2.line2'),
          line('wren', 'wren.scene2.line3'),
          line('wren', 'wren.scene2.line4'),
          line('wren', 'wren.scene2.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      // Update journal hint card - first clue revealed
      save.flags.wren_clues_gathered = Math.min((save.flags.wren_clues_gathered ?? 0) + 1, 3);
    },
  },
  // Scene 3: Middle 2 — More clues (moonleaf, hot)
  {
    id: 'wren_scene3',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene3.line1'),
          line('wren', 'wren.scene3.line2'),
          line('wren', 'wren.scene3.line3'),
          line('wren', 'wren.scene3.line4'),
          line('wren', 'wren.scene3.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      // Update journal hint card - more clues
      save.flags.wren_clues_gathered = Math.min((save.flags.wren_clues_gathered ?? 0) + 1, 3);
    },
  },
  // Scene 4: Middle 3 — Final clue (5 minutes simmering) + choice to brew
  {
    id: 'wren_scene4',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene4.line1'),
          line('wren', 'wren.scene4.line2'),
          line('wren', 'wren.scene4.line3'),
          line('wren', 'wren.scene4.line4'),
          line('wren', 'wren.scene4.line5'),
        ],
        choice: choice(
          'wren.scene4.choicePrompt',
          ['wren.scene4.choice1Label', 'wren.scene4.choice1Flavor'],
          ['wren.scene4.choice2Label', 'wren.scene4.choice2Flavor'],
        ),
      },
    ],
  },
  // Scene 5: Resolution — Brew it correctly
  {
    id: 'wren_scene5',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene5.line1'),
          line('wren', 'wren.scene5.line2'),
          line('wren', 'wren.scene5.line3'),
          line('wren', 'wren.scene5.line4'),
          line('wren', 'wren.scene5.line5'),
          line('wren', 'wren.scene5.line6'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      save.flags.wren_usual_revealed = true;
      save.flags.wren_arc_complete = true;
      // Unlock R008 (Honey Milk variant) as discovered recipe
      if (!save.flags.discovered_recipes.includes('R008')) {
        save.flags.discovered_recipes.push('R008');
      }
    },
  },
  // Scene 6: Epilogue — Music box detail on title screen
  {
    id: 'wren_scene6',
    beats: [
      {
        lines: [
          line('wren', 'wren.scene6.line1'),
          line('wren', 'wren.scene6.line2'),
          line('wren', 'wren.scene6.line3'),
          line('wren', 'wren.scene6.line4'),
          line('wren', 'wren.scene6.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      save.flags.wren_epilogue_done = true;
      save.flags.title_music_box_unlocked = true;
    },
  },
];

// ============================================================
// SELA INTRO (1 scene only — arc is post-MVP)
// ============================================================

export const SELA_INTRO: SceneDef[] = [
  {
    id: 'sela_intro',
    beats: [
      {
        lines: [
          line('sela', 'sela.intro.line1'),
          line('sela', 'sela.intro.line2'),
          line('sela', 'sela.intro.line3'),
          line('sela', 'sela.intro.line4'),
          line('sela', 'sela.intro.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      save.flags.sela_intro_done = true;
    },
  },
];

// ============================================================
// BRAM INTRO (1 scene only — arc is post-MVP)
// ============================================================

export const BRAM_INTRO: SceneDef[] = [
  {
    id: 'bram_intro',
    beats: [
      {
        lines: [
          line('bram', 'bram.intro.line1'),
          line('bram', 'bram.intro.line2'),
          line('bram', 'bram.intro.line3'),
          line('bram', 'bram.intro.line4'),
          line('bram', 'bram.intro.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      save.flags.bram_intro_done = true;
    },
  },
];

// ============================================================
// NIA INTRO (1 scene only — arc is post-MVP)
// ============================================================

export const NIA_INTRO: SceneDef[] = [
  {
    id: 'nia_intro',
    beats: [
      {
        lines: [
          line('nia', 'nia.intro.line1'),
          line('nia', 'nia.intro.line2'),
          line('nia', 'nia.intro.line3'),
          line('nia', 'nia.intro.line4'),
          line('nia', 'nia.intro.line5'),
        ],
      },
    ],
    onComplete: (save: SaveData, _hearts: HeartLedger) => {
      save.flags.nia_intro_done = true;
    },
  },
];

// ============================================================
// All scenes combined for easy iteration
// ============================================================

export const ALL_SCENES: SceneDef[] = [
  ...FENWICK_SCENES,
  ...WREN_SCENES,
  ...SELA_INTRO,
  ...BRAM_INTRO,
  ...NIA_INTRO,
];

// ============================================================
// Scene trigger logic — determines which scene should play
// based on hearts, day, and flags
// ============================================================

export interface SceneTrigger {
  character: 'fenwick' | 'wren' | 'sela' | 'bram' | 'nia';
  sceneId: string;
  /** Minimum hearts required (displayed hearts = floor(points)) */
  minHearts: number;
  /** Minimum day required */
  minDay: number;
  /** Required scenes that must have been seen (all must be in seen_scenes) */
  requiredScenes?: string[];
  /** Forbidden scenes that must NOT have been seen (none in seen_scenes) */
  forbiddenScenes?: string[];
  /** Required flags (all must be true) - for intro scenes */
  requiredFlags?: string[];
  /** Forbidden flags (none must be true) - for intro scenes */
  forbiddenFlags?: string[];
}

export const SCENE_TRIGGERS: SceneTrigger[] = [
  // Fenwick arc
  { character: 'fenwick', sceneId: 'fenwick_scene1', minHearts: 0, minDay: 2, forbiddenScenes: ['fenwick_scene1'] },
  { character: 'fenwick', sceneId: 'fenwick_scene2', minHearts: 1, minDay: 3, requiredScenes: ['fenwick_scene1'], forbiddenScenes: ['fenwick_scene2'] },
  { character: 'fenwick', sceneId: 'fenwick_scene3', minHearts: 2, minDay: 4, requiredScenes: ['fenwick_scene2'], forbiddenScenes: ['fenwick_scene3'] },
  { character: 'fenwick', sceneId: 'fenwick_scene4', minHearts: 3, minDay: 6, requiredScenes: ['fenwick_scene3'], forbiddenScenes: ['fenwick_scene4'] },
  { character: 'fenwick', sceneId: 'fenwick_scene5', minHearts: 4, minDay: 8, requiredScenes: ['fenwick_scene4'], forbiddenScenes: ['fenwick_scene5'] },
  { character: 'fenwick', sceneId: 'fenwick_scene6', minHearts: 5, minDay: 9, requiredScenes: ['fenwick_scene5'], forbiddenScenes: ['fenwick_scene6'] },

  // Wren arc
  { character: 'wren', sceneId: 'wren_scene1', minHearts: 0, minDay: 2, forbiddenScenes: ['wren_scene1'] },
  { character: 'wren', sceneId: 'wren_scene2', minHearts: 1, minDay: 3, requiredScenes: ['wren_scene1'], forbiddenScenes: ['wren_scene2'] },
  { character: 'wren', sceneId: 'wren_scene3', minHearts: 2, minDay: 5, requiredScenes: ['wren_scene2'], forbiddenScenes: ['wren_scene3'] },
  { character: 'wren', sceneId: 'wren_scene4', minHearts: 3, minDay: 7, requiredScenes: ['wren_scene3'], forbiddenScenes: ['wren_scene4'] },
  { character: 'wren', sceneId: 'wren_scene5', minHearts: 4, minDay: 9, requiredScenes: ['wren_scene4'], forbiddenScenes: ['wren_scene5'] },
  { character: 'wren', sceneId: 'wren_scene6', minHearts: 5, minDay: 10, requiredScenes: ['wren_scene5'], forbiddenScenes: ['wren_scene6'] },

  // Intro scenes (fire on first visit with heart >= 1)
  { character: 'sela', sceneId: 'sela_intro', minHearts: 1, minDay: 2, forbiddenFlags: ['sela_intro_done'] },
  { character: 'bram', sceneId: 'bram_intro', minHearts: 1, minDay: 2, forbiddenFlags: ['bram_intro_done'] },
  { character: 'nia', sceneId: 'nia_intro', minHearts: 1, minDay: 3, forbiddenFlags: ['nia_intro_done'] },
];

/** Check if a scene should trigger for a character visit */
export function getTriggeredScene(
  character: 'fenwick' | 'wren' | 'sela' | 'bram' | 'nia',
  save: SaveData,
  hearts: HeartLedger,
  currentDay: number,
): SceneDef | null {
  const triggers = SCENE_TRIGGERS.filter((t) => t.character === character);

  for (const trigger of triggers) {
    // Check if already seen
    if (save.flags.seen_scenes.includes(trigger.sceneId)) continue;

    // Check min hearts
    const displayed = Math.floor((hearts.points[character] ?? 0) + 1e-9);
    if (displayed < trigger.minHearts) continue;

    // Check min day
    if (currentDay < trigger.minDay) continue;

    // Check required scenes
    if (trigger.requiredScenes) {
      const allRequired = trigger.requiredScenes.every((sceneId) => save.flags.seen_scenes.includes(sceneId));
      if (!allRequired) continue;
    }

    // Check forbidden scenes
    if (trigger.forbiddenScenes) {
      const anyForbidden = trigger.forbiddenScenes.some((sceneId) => save.flags.seen_scenes.includes(sceneId));
      if (anyForbidden) continue;
    }

    // Check required flags (for intro scenes)
    if (trigger.requiredFlags) {
      const allRequired = trigger.requiredFlags.every((flag) => save.flags[flag as keyof typeof save.flags] === true);
      if (!allRequired) continue;
    }

    // Check forbidden flags (for intro scenes)
    if (trigger.forbiddenFlags) {
      const anyForbidden = trigger.forbiddenFlags.some((flag) => save.flags[flag as keyof typeof save.flags] === true);
      if (anyForbidden) continue;
    }

    // Find and return the scene
    const scene = ALL_SCENES.find((s) => s.id === trigger.sceneId);
    return scene ?? null;
  }

  return null;
}

/** Get the Wren hint card state for the journal (0-4 clues revealed) */
export function getWrenHintState(save: SaveData): number {
  if (save.flags.wren_usual_revealed) return 5; // Fully revealed
  let state = 0;
  if (save.flags.seen_scenes.includes('wren_scene2')) state = 1;
  if (save.flags.seen_scenes.includes('wren_scene3')) state = 2;
  if (save.flags.seen_scenes.includes('wren_scene4')) state = 3;
  if (save.flags.seen_scenes.includes('wren_scene5')) state = 4;
  return state;
}

/** Get the hint text for Wren's recipe based on progress */
export function getWrenHintText(save: SaveData): string {
  const state = getWrenHintState(save);
  switch (state) {
    case 0:
      return '??? — A drink Marigold invented fifty years ago. Lost when her recipe book burned.';
    case 1:
      return 'Clue 1: Starts with milk. \"Milk holds the warmth. Water runs through you.\" Sweet — honey from the river bend hives.';
    case 2:
      return 'Clue 1: Milk. Honey. Clue 2: A pinch of moonleaf, gathered moonlit nights. Served hot — always hot. \"Warmth is intention.\"';
    case 3:
      return 'Clue 1: Milk. Honey. Clue 2: Moonleaf. Hot. Clue 3: Five minutes simmering. One hundred fifty heartbeats. The broth remembers the hands that stirred it.';
    case 4:
      return 'All clues gathered. Milk + honey + pinch of moonleaf, simmered 5 minutes hot. Brew it for Wren?';
    case 5:
      return 'REVEALED: Honey Milk with a whisper of moonleaf, simmered five minutes. \"Ah. There she is.\"';
    default:
      return '???';
  }
}

/** Check if player has all Wren clues and can attempt resolution brew */
export function canAttemptWrenResolution(save: SaveData): boolean {
  // Player can attempt after scene4 (all clues gathered) before resolution (scene5)
  return getWrenHintState(save) >= 3 && save.flags.wren_usual_revealed === false;
}

/** Validate a brew attempt for Wren's usual (R008) */
export function validateWrenUsualBrew(input: { base: string; ingredients: string[]; finish: string }): boolean {
  // R008: Honey Milk variant with moonleaf — milk base, honey + moonleaf, hot
  return (
    input.base === 'milk' &&
    input.ingredients.length === 2 &&
    input.ingredients.includes('honey') &&
    input.ingredients.includes('moonleaf') &&
    input.finish === 'hot'
  );
}