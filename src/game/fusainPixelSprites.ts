/**
 * Hand-authored 24x24 (and 24x28) pixel-art sprites & tiles for "Fusain Abyssal".
 * Strictly non-retro charcoal, graphite, dust-grey, and rare chalk-white palette.
 */

export type CharcoalPixelPalette = Record<string, string>;

export const FUSAIN_PALETTE: CharcoalPixelPalette = {
  '.': 'transparent',
  K: '#050505', // Noir absolu (vide / encre profonde)
  C: '#131211', // Noir de fusain granuleux
  G: '#282623', // Gris graphite sombre
  M: '#423F3A', // Gris moyen estompé
  D: '#6B665E', // Gris poussière
  L: '#A8A298', // Craie frottée
  W: '#FAF8F5', // Blanc de craie pur (événement focal)
  E: '#46513C', // Vert terreux très sourd (peau gobeline)
  F: '#637056', // Vert terreux clair
  A: '#C7934F', // Ambre / ivoire discret (lanterne & auberge)
  I: '#EFE1BE', // Ivoire chaud (flamme & fenêtre)
  R: '#9E3D35', // Rouge oxyde discret
};

// 24x24 Goblin — Idle (facing right: big ears, hunched back, satchel, prominent nose, 1px chalk eye)
const GOBLIN_IDLE_ROWS = [
  '........................',
  '........................',
  '........................',
  '..KKK.............KKK...',
  '.KEEFKK.........KKEEFK..',
  '..KKEEFKK.....KKEEFKK...',
  '...KKKEEFKKKKKKEEFKK....',
  '.....KKEEEEEEEEEEKK.....',
  '....KKEEEEEEWEEEEKKK....',
  '....KKEEEEEEEEEEEEFFK...',
  '....KKKEEEEEEEEEKKK.....',
  '.....KKGGGGGGGKK........',
  '...KKDMMGGGGGGGKK.......',
  '..KDDLMGGGGGGGCCKK......',
  '..KDMGGGGGGGGCCCK.......',
  '..KDDMGGGGGGGCCKK.......',
  '...KKGGGGGGGGCKK........',
  '.....KKGGGGGGKK.........',
  '......KKCKKCKK..........',
  '......KKCKKCKK..........',
  '.....KKCCKKCCKK.........',
  '.....KKKKKKKKKK.........',
  '........................',
  '........................',
];

// 24x24 Goblin — Step A (ears bob, satchel swings back, front leg forward)
const GOBLIN_WALK_A_ROWS = [
  '........................',
  '........................',
  '.KKK.............KKK....',
  'KEEFKK.........KKEEFK...',
  '.KKEEFKK.....KKEEFKK....',
  '..KKKEEFKKKKKKEEFKK.....',
  '....KKEEEEEEEEEEKK......',
  '...KKEEEEEEWEEEEKKK.....',
  '...KKEEEEEEEEEEEEFFK....',
  '...KKKEEEEEEEEEKKK......',
  '....KKGGGGGGGKK.........',
  '..KKDMMGGGGGGGKK........',
  '.KDDLMGGGGGGGCCKK.......',
  '.KDMGGGGGGGGCCCK........',
  '..KDDMGGGGGGGCCKK.......',
  '...KKGGGGGGGGCKK........',
  '....KKGGGGGGKK..........',
  '.....KKCK.KCKK..........',
  '....KKCK...KCCKK........',
  '....KKCK....KKCCK.......',
  '...KKCCK.....KKKK.......',
  '...KKKK.................',
  '........................',
  '........................',
];

// 24x24 Goblin — Step B (ears tilt down, back leg planted, satchel forward)
const GOBLIN_WALK_B_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '..KKK.............KKK...',
  '.KEEFKK.........KKEEFK..',
  '..KKEEFKK.....KKEEFKK...',
  '...KKKEEFKKKKKKEEFKK....',
  '....KKEEEEEEEEEEKK......',
  '...KKEEEEEEWEEEEKKK.....',
  '...KKEEEEEEEEEEEEFFK....',
  '....KKGGGGGGGKK.........',
  '....KDDMMGGGGGKK........',
  '...KDDLMGGGGGGCCKK......',
  '...KDMGGGGGGGGCCK.......',
  '...KDDMGGGGGGGCCKK......',
  '....KKGGGGGGGGCKK.......',
  '.....KKGGGGGGKK.........',
  '......KKCKKCKK..........',
  '.....KKCCK.KKCK.........',
  '.....KKKK...KKCCK.......',
  '.............KKKK.......',
  '........................',
  '........................',
];

// 24x24 Goblin — Scared (Hero close: ears droop sideways, hunched lower, wide eye)
const GOBLIN_SCARED_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '.KKKK.............KKKK..',
  'KEEEFKK..KKKKK..KKEEEFK.',
  '.KKKEEFKKEEEEEKKKEEFKK..',
  '...KKKEEEEEWWEKEEEKK....',
  '....KKEEEEEEEEEEEFFK....',
  '....KKKGGGGGGGKKK.......',
  '..KKDMMGGGGGGGGKK.......',
  '.KDDLMGGGGGGGGCCKK......',
  '.KDMGGGGGGGGGCCCK.......',
  '..KDDMGGGGGGGCCKK.......',
  '...KKGGGGGGGGCKK........',
  '....KKGGGGGGKK..........',
  '.....KKCKKCKK...........',
  '.....KKCKKCKK...........',
  '....KKCCKKCCKK..........',
  '....KKKKKKKKKK..........',
  '........................',
  '........................',
];

// 9x11 Lantern (with spring physics position, 2 flame flicker frames)
const LANTERN_A_ROWS = [
  '...LLL...',
  '..K...K..',
  '.KLLLLLK.',
  '.KCAIIAK.',
  '.KAIWIAK.',
  '.KCAIIAK.',
  '.KGGGGGK.',
  '..KKKKK..',
  '.........',
];

const LANTERN_B_ROWS = [
  '...LLL...',
  '..K...K..',
  '.KLLLLLK.',
  '.KCAWAAK.',
  '.KAIIWAK.',
  '.KCAIIAK.',
  '.KGGGGGK.',
  '..KKKKK..',
  '.........',
];

// 24x24 Rat Percepteur — Idle (pointed snout left, round ears, coat, slate ledger, curled tail)
const RAT_IDLE_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........KKK..KKK........',
  '.......KDDK..KDDK.......',
  '.......KDLKKKKLDK.......',
  '.....KKKDDDDDDDDKK......',
  '...KKDDDWDDDDDDDDK......',
  '.KKDDDDDDDDDDDDDDK......',
  '..KKKKDDDDDDDDDDKK......',
  '.....KKGGGGGGGGKK.......',
  '....KLLGGGGGGGGGGK......',
  '...KLWWLGGGGGGGGGK......',
  '...KLWWLGGGGGGGGCK......',
  '...KLLLLGGGGGGGCK..KK...',
  '....KKKKGGGGGGCK..KDDK..',
  '.......KGGGGGCK...KDK...',
  '.......KCCKKCCK..KDK....',
  '......KKCK..KCKKKDK.....',
  '......KKKK..KKKKKK......',
  '........................',
  '........................',
  '........................',
];

// 24x24 Rat Percepteur — Startled (hops 2px up, raises ledger paw)
const RAT_STARTLED_ROWS = [
  '........................',
  '........................',
  '........KKK..KKK........',
  '.......KDDK..KDDK.......',
  '.......KDLKKKKLDK.......',
  '.....KKKDDDDDDDDKK......',
  '...KKDDDWDDDDDDDDK......',
  '.KKDDDDDDDDDDDDDDK......',
  '..KKKKDDDDDDDDDDKK......',
  '.KLLKKKKGGGGGGGKK.......',
  'KLWWLGGGGGGGGGGGGK......',
  'KLWWLGGGGGGGGGGGGK......',
  'KLLLLGGGGGGGGGGGCK......',
  '.KKKKGGGGGGGGGGCK..KK...',
  '.....KKGGGGGGGCK..KDDK..',
  '......KGGGGGCKK...KDK...',
  '......KCCKKCCK...KDK....',
  '.....KKCK..KCKKKKDK.....',
  '.....KKKK..KKKKKKK......',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 24x24 Chest — Locked
const CHEST_LOCKED_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '....KKKKKKKKKKKKKKKK....',
  '...KLLLLLLLLLLLLLLLLK...',
  '...KLDDDDDDDDDDDDDDLK...',
  '...KLDDGDDDDDDDDGDDLK...',
  '...KLLLLLLWWWWLLLLLLK...',
  '...KCCCCCCWWWWCCCCCCK...',
  '...KGGGGGGWKKWGGGGGGK...',
  '...KGMGGGGLLLLGGGGMGK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KGMGGGGGGGGGGGGMGK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KCCCCCCCCCCCCCCCCK...',
  '....KKKKKKKKKKKKKKKK....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 24x24 Chest — Resisted (chalk scratch sparks on rim)
const CHEST_RESIST_ROWS = [
  '........................',
  '........................',
  '........................',
  '..W..................W..',
  '...W................W...',
  '........................',
  '....KKKKKKKKKKKKKKKK....',
  '...KLLLLLLLLLLLLLLLLK...',
  '...KLDDDDDDDDDDDDDDLK...',
  '...KLDDGDDDDDDDDGDDLK...',
  '...KLLLLLLWWWWLLLLLLK...',
  '...KCCCCCCRRRRCCCCCCK...',
  '...KGGGGGGWKKWGGGGGGK...',
  '...KGMGGGGLLLLGGGGMGK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KGMGGGGGGGGGGGGMGK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KCCCCCCCCCCCCCCCCK...',
  '....KKKKKKKKKKKKKKKK....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 24x24 Chest — Open (hinged lid lifted, pure dark interior, chalk gleam)
const CHEST_OPEN_ROWS = [
  '........................',
  '........................',
  '....KKKKKKKKKKKKKKKK....',
  '...KLLLLLLLLLLLLLLLLK...',
  '...KLDDDDDDDDDDDDDDLK...',
  '...KLDDGDDDDDDDDGDDLK...',
  '...KLLLLLLLLLLLLLLLLK...',
  '...KKKKKKKKKKKKKKKKKK...',
  '...KLKKKKKKKKKKKKKKLK...',
  '...KLKKWWKKKKKKKKKKLK...',
  '...KLKKKKKKKKKKKKKKLK...',
  '...KLLLLLLDDDDLLLLLLK...',
  '...KCCCCCCLLLLCCCCCCK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KGMGGGGGGGGGGGGMGK...',
  '...KGGGGGGGGGGGGGGGGK...',
  '...KCCCCCCCCCCCCCCCCK...',
  '....KKKKKKKKKKKKKKKK....',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 24x28 Hero — Blindingly bright pure-chalk & ivory silhouette (stark luminous intrusion!)
const HERO_ROWS = [
  '..........WWWW..........',
  '.........WWWWWW.........',
  '.........WWKKWW.........',
  '..WW.....WWWWWW.........',
  '..WW.....WWIIWW.........',
  '..WW.....WWWWWW.........',
  '..WW....WWWWWWWW........',
  '..WW..WWWWWWWWWWWW......',
  '..WW.WWWWWWWWWWWWWW.....',
  '..WW.WWIIIIIIIIIIWW.....',
  '..WW.WWWWWWLLWWWWWW.....',
  '..WW.WWWWWWWWWWWWWW.....',
  '..WW.WWLLWWWWWWLLWW.....',
  '.WWWWWWWWWWWWWWWWWWW....',
  '..WW.WWWWWWWWWWWWWW.....',
  '..LL.WWIIWWWWWWIIWW.....',
  '..LL.WWWWWWWWWWWWWW.....',
  '.....WWLLWWWWWWLLWW.....',
  '.....WWWWWWWWWWWWWW.....',
  '.....WWWWWW..WWWWWW.....',
  '.....WWIIWW..WWIIWW.....',
  '.....WWWWWW..WWWWWW.....',
  '.....WWLLWW..WWLLWW.....',
  '.....WWWWWW..WWWWWW.....',
  '....WWWWWWW..WWWWWWW....',
  '....WWWWWWW..WWWWWWW....',
  '........................',
  '........................',
];

const HERO_STRIDE_ROWS = [
  '..........WWWW..........',
  '.........WWWWWW.........',
  '.........WWKKWW.........',
  '..WW.....WWWWWW.........',
  '..WW.....WWIIWW.........',
  '..WW.....WWWWWW.........',
  '..WW....WWWWWWWW........',
  '..WW..WWWWWWWWWWWW......',
  '..WW.WWWWWWWWWWWWWW.....',
  '..WW.WWIIIIIIIIIIWW.....',
  '..WW.WWWWWWLLWWWWWW.....',
  '..WW.WWWWWWWWWWWWWW.....',
  '..WW.WWLLWWWWWWLLWW.....',
  '.WWWWWWWWWWWWWWWWWWW....',
  '..WW.WWWWWWWWWWWWWW.....',
  '..LL.WWIIWWWWWWIIWW.....',
  '..LL.WWWWWWWWWWWWWW.....',
  '.....WWLLWWWWWWLLWW.....',
  '.....WWWWWWWWWWWWWW.....',
  '.....WWWWWW..WWWWWW.....',
  '....WWWWWW....WWWWWW....',
  '....WWIIWW....WWIIWW....',
  '...WWWWWW......WWWWWW...',
  '...WWLLWW......WWLLWW...',
  '..WWWWWWW......WWWWWWW..',
  '..WWWWWWW......WWWWWWW..',
  '........................',
  '........................',
];

// 24x24 Goblin — Blink / idle ear twitch
const GOBLIN_BLINK_ROWS = [
  '........................',
  '........................',
  '........................',
  '..KKK.............KKK...',
  '.KEEFKK.........KKEEFK..',
  '..KKEEFKK.....KKEEFKK...',
  '...KKKEEFKKKKKKEEFKK....',
  '.....KKEEEEEEEEEEKK.....',
  '....KKEEEEEKEEEEEKKK....',
  '....KKEEEEEEEEEEEEFFK...',
  '....KKKEEEEEEEEEKKK.....',
  '.....KKGGGGGGGKK........',
  '...KKDMMGGGGGGGKK.......',
  '..KDDLMGGGGGGGCCKK......',
  '..KDMGGGGGGGGCCCK.......',
  '..KDDMGGGGGGGCCKK.......',
  '...KKGGGGGGGGCKK........',
  '.....KKGGGGGGKK.........',
  '......KKCKKCKK..........',
  '......KKCKKCKK..........',
  '.....KKCCKKCCKK.........',
  '.....KKKKKKKKKK.........',
  '........................',
  '........................',
];

// 24x24 Rat Percepteur — Scribbling in ledger
const RAT_SCRIBBLE_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........KKK..KKK........',
  '.......KDDK..KDDK.......',
  '.......KDLKKKKLDK.......',
  '.....KKKDDDDDDDDKK......',
  '...KKDDDWDDDDDDDDK......',
  '.KKDDDDDDDDDDDDDDK......',
  '..KKKKDDDDDDDDDDKK......',
  '.....KKGGGGGGGGKK.......',
  '...KKLLGGGGGGGGGGK......',
  '..KLWWWLGGGGGGGGGK......',
  '..KLWIWLGGGGGGGGCK......',
  '..KLLLLLGGGGGGGCK...KK..',
  '...KKKKKGGGGGGCK...KDDK.',
  '.......KGGGGGCK....KDK..',
  '.......KCCKKCCK...KDK...',
  '......KKCK..KCKKKKDK....',
  '......KKKK..KKKKKKK.....',
  '........................',
  '........................',
  '........................',
];

// 12x12 Hanging Inn Oil Lamp (amber + ivory glow)
const INN_LAMP_A_ROWS = [
  '.....KK.....',
  '.....LL.....',
  '....KLLK....',
  '...KAAAAK...',
  '..KAIIWIAK..',
  '..KAIIIAAK..',
  '...KAAAAK...',
  '....KKKK....',
  '............',
  '............',
  '............',
  '............',
];

const INN_LAMP_B_ROWS = [
  '.....KK.....',
  '.....LL.....',
  '....KLLK....',
  '...KAAAAK...',
  '..KAAIWIAK..',
  '..KAIIIAAK..',
  '...KAAAAK...',
  '....KKKK....',
  '............',
  '............',
  '............',
  '............',
];

// 24x24 Fragile Suspended Pit Bridge (top 6 rows & bottom 6 rows transparent!)
const BRIDGE_ROWS = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  'LLLLLLLLLLLLLLLLLLLLLLLL',
  'KKGDKKGGDKGDDKKGGDKKGGDK',
  'KKMDKKMMDKMDDKKMMDKKMMDK',
  'KKGDKKGGDKGDDKKGGDKKGGDK',
  'KKMDKKMMDKMDDKKMMDKKMMDK',
  'KKGDKKGGDKGDDKKGGDKKGGDK',
  'KKMDKKMMDKMDDKKMMDKKMMDK',
  'KKGDKKGGDKGDDKKGGDKKGGDK',
  'KKMDKKMMDKMDDKKMMDKKMMDK',
  'KKGDKKGGDKGDDKKGGDKKGGDK',
  'KKCCKKCCCKCCCKKCCCKKCCCK',
  'LLLLLLLLLLLLLLLLLLLLLLLL',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 24x24 Inn Barred Window on dark charcoal stone
const INN_WINDOW_ROWS = [
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCKCCCCCCCCCCCCCCCCKCCC',
  'CCCKCCCCCCCCCCCCCCCCKCCC',
  'CCCCCGGGGGGGGGGGGGGCCCCC',
  'CCCCGKKKKKKKKKKKKKKGCCCC',
  'CCCCGKAAIAKKAAIAAAKGCCCC',
  'CCCCGKAIIWKKWWIIIAKGCCCC',
  'CCCCGKAAIAKKAAIAAAKGCCCC',
  'CCCCGKKKKKKKKKKKKKKGCCCC',
  'CCCCGKAAIAKKAAIAAAKGCCCC',
  'CCCCGKAIIWKKWWIIIAKGCCCC',
  'CCCCGKAAIAKKAAIAAAKGCCCC',
  'CCCCGKKKKKKKKKKKKKKGCCCC',
  'CCCCGKKKKKKKKKKKKKKGCCCC',
  'CCCCCLLLLLLLLLLLLLLCCCCC',
  'CCCCCGGGGGGGGGGGGGGCCCCC',
  'CCCKCCCCCCCCCCCCCCCCKCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCKCCCCCCCCGCCCCCCCKCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCC',
];

function compileSprite(rows: string[], width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  for (let y = 0; y < Math.min(height, rows.length); y++) {
    const row = rows[y];
    for (let x = 0; x < Math.min(width, row.length); x++) {
      const ch = row[x];
      const col = FUSAIN_PALETTE[ch];
      if (!col || col === 'transparent') continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export interface FusainPixelAtlas {
  goblinIdle: HTMLCanvasElement;
  goblinBlink: HTMLCanvasElement;
  goblinWalkA: HTMLCanvasElement;
  goblinWalkB: HTMLCanvasElement;
  goblinScared: HTMLCanvasElement;
  lanternA: HTMLCanvasElement;
  lanternB: HTMLCanvasElement;
  innLampA: HTMLCanvasElement;
  innLampB: HTMLCanvasElement;
  ratIdle: HTMLCanvasElement;
  ratScribble: HTMLCanvasElement;
  ratStartled: HTMLCanvasElement;
  chestLocked: HTMLCanvasElement;
  chestResist: HTMLCanvasElement;
  chestOpen: HTMLCanvasElement;
  hero: HTMLCanvasElement;
  heroStride: HTMLCanvasElement;
  bridge: HTMLCanvasElement;
  innWindow: HTMLCanvasElement;
}

export function buildFusainPixelAtlas(): FusainPixelAtlas {
  return {
    goblinIdle: compileSprite(GOBLIN_IDLE_ROWS, 24, 24),
    goblinBlink: compileSprite(GOBLIN_BLINK_ROWS, 24, 24),
    goblinWalkA: compileSprite(GOBLIN_WALK_A_ROWS, 24, 24),
    goblinWalkB: compileSprite(GOBLIN_WALK_B_ROWS, 24, 24),
    goblinScared: compileSprite(GOBLIN_SCARED_ROWS, 24, 24),
    lanternA: compileSprite(LANTERN_A_ROWS, 9, 9),
    lanternB: compileSprite(LANTERN_B_ROWS, 9, 9),
    innLampA: compileSprite(INN_LAMP_A_ROWS, 12, 12),
    innLampB: compileSprite(INN_LAMP_B_ROWS, 12, 12),
    ratIdle: compileSprite(RAT_IDLE_ROWS, 24, 24),
    ratScribble: compileSprite(RAT_SCRIBBLE_ROWS, 24, 24),
    ratStartled: compileSprite(RAT_STARTLED_ROWS, 24, 24),
    chestLocked: compileSprite(CHEST_LOCKED_ROWS, 24, 24),
    chestResist: compileSprite(CHEST_RESIST_ROWS, 24, 24),
    chestOpen: compileSprite(CHEST_OPEN_ROWS, 24, 24),
    hero: compileSprite(HERO_ROWS, 24, 28),
    heroStride: compileSprite(HERO_STRIDE_ROWS, 24, 28),
    bridge: compileSprite(BRIDGE_ROWS, 24, 24),
    innWindow: compileSprite(INN_WINDOW_ROWS, 24, 24),
  };
}
