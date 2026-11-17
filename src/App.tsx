import { useCallback, useEffect, useState } from 'react';
import {
  Backpack,
  BookOpen,
  Check,
  Copy,
  Droplets,
  Flame,
  Heart,
  Map as MapIcon,
  RotateCcw,
  Utensils,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ContextModal } from './components/ContextModal';
import { DialogueBox } from './components/DialogueBox';
import { DungeonCanvas } from './components/DungeonCanvas';
import { EndScreen } from './components/EndScreen';
import { HudPanel } from './components/HudPanel';
import { MemorialView } from './components/MemorialView';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { soundFx } from './game/audio';
import { CONFIG } from './game/config';
import {
  createNewGame,
  dismissDialogue,
  getContextAction,
  getSurvivalSuggestion,
  movePlayer,
  performCamping,
  performInnService,
  placeMarkerOnCurrentTile,
  resolveFeatureAction,
  resolveNpcInteraction,
  useBagItem,
  waitAndScan,
} from './game/engine';
import { clearMemorial, loadMemorial } from './game/epitaph';
import { GameState, MemorialEntry } from './game/types';

export default function App() {
  const [memorial, setMemorial] = useState<MemorialEntry[]>(() => loadMemorial());
  const [gameState, setGameState] = useState<GameState>(() => {
    const initial = createNewGame();
    return { ...initial, screen: 'title' };
  });
  const [soundOn, setSoundOn] = useState(true);
  const [seedCopied, setSeedCopied] = useState(false);

  const startRun = useCallback((seed?: string) => {
    const fresh = createNewGame(seed);
    setGameState(fresh);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    soundFx.enabled = next;
    setSoundOn(next);
  };

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(gameState.seed);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  useEffect(() => {
    if (gameState.screen === 'dead' || gameState.screen === 'victory') {
      setMemorial(loadMemorial());
    }
  }, [gameState.screen]);

  const handleMove = useCallback((dx: number, dy: number) => {
    setGameState((prev) => movePlayer(prev, dx, dy));
  }, []);

  const handleDismissDialogue = useCallback(() => {
    setGameState((prev) => dismissDialogue(prev));
  }, []);

  const hasActiveDialogue =
    gameState.screen === 'playing' &&
    gameState.modal.type === 'none' &&
    gameState.dialogueQueue.length > 0;

  const contextAction =
    gameState.screen === 'playing' &&
    gameState.modal.type === 'none' &&
    !hasActiveDialogue
      ? getContextAction(gameState, setGameState)
      : null;

  // Unified Keyboard Handler (DialogueBox, Gameplay Movement, Map Tab, Marker R, etc.)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState.screen !== 'playing') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // ContextModal handles its own keyboard navigation via capture listener
      if (gameState.modal.type !== 'none') return;

      // Active DialogueBox intercepts Space / Enter / Escape to advance into log
      if (gameState.dialogueQueue.length > 0) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          handleDismissDialogue();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        handleMove(0, -1);
      } else if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        handleMove(0, 1);
      } else if (e.key === 'ArrowLeft' || key === 'a') {
        e.preventDefault();
        handleMove(-1, 0);
      } else if (e.key === 'ArrowRight' || key === 'd') {
        e.preventDefault();
        handleMove(1, 0);
      } else if (key === 'e' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const act = getContextAction(gameState, setGameState);
        act?.execute();
      } else if (key === 'i') {
        e.preventDefault();
        setGameState((prev) => ({ ...prev, modal: { type: 'bag' } }));
      } else if (e.key === 'Tab' || key === 'm') {
        e.preventDefault();
        setGameState((prev) => ({ ...prev, modal: { type: 'map_overview' } }));
      } else if (key === 'c') {
        e.preventDefault();
        setGameState((prev) => {
          const floor = prev.floors[prev.depth];
          if (!floor || floor.isInn) return prev;
          return { ...prev, modal: { type: 'camp_confirm' } };
        });
      } else if (key === 'r') {
        e.preventDefault();
        setGameState((prev) => {
          const floor = prev.floors[prev.depth];
          if (!floor || floor.isInn) return prev;
          const hasMarker = prev.bag.some((i) => i.kind === 'marker' && i.quantity > 0);
          if (!hasMarker) {
            return { ...prev, modal: { type: 'bag' } };
          }
          return { ...prev, modal: { type: 'marker_place' } };
        });
      } else if (key === 'q') {
        e.preventDefault();
        const sug = getSurvivalSuggestion(gameState);
        if (sug) {
          setGameState((prev) => useBagItem(prev, sug.itemId, 'use'));
        } else {
          setGameState((prev) => ({ ...prev, modal: { type: 'bag' } }));
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleMove, handleDismissDialogue]);

  if (gameState.screen === 'title') {
    return (
      <TitleScreen
        memorialCount={memorial.length}
        onStart={startRun}
        onOpenMemorial={() =>
          setGameState((prev) => ({ ...prev, screen: 'memorial' }))
        }
      />
    );
  }

  if (gameState.screen === 'memorial') {
    return (
      <MemorialView
        entries={memorial}
        onBack={() =>
          setGameState((prev) => ({ ...prev, screen: 'title' }))
        }
        onReplaySeed={(seed) => startRun(seed)}
        onClear={() => {
          clearMemorial();
          setMemorial([]);
        }}
      />
    );
  }

  if (
    (gameState.screen === 'dead' || gameState.screen === 'victory') &&
    gameState.lastEpitaph
  ) {
    return (
      <EndScreen
        entry={gameState.lastEpitaph}
        onReplaySameSeed={() => startRun(gameState.seed)}
        onNewRun={() => startRun()}
        onOpenMemorial={() =>
          setGameState((prev) => ({ ...prev, screen: 'memorial' }))
        }
      />
    );
  }

  const latestLog = gameState.logs[0];
  const floor = gameState.floors[gameState.depth];
  const { oil, water, food, hp, gold } = gameState.resources;

  return (
    <div className="min-h-screen bg-[#161412] text-[#F1EDE4]">
      {/* 3-Zone Top Navigation Bar */}
      <header className="border-b border-[#302A24] bg-[#1C1916]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() =>
              setGameState((prev) => ({ ...prev, screen: 'title' }))
            }
            className="font-display text-base font-bold tracking-tight text-[#F1EDE4] whitespace-nowrap shrink-0 hover:text-[#E59A38] sm:text-lg"
          >
            Goblin Survivor -99
          </button>

          <nav className="hidden items-center gap-6 text-xs font-medium text-[#B8AEA2] md:flex">
            <button
              type="button"
              onClick={handleCopySeed}
              className="font-mono-num flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-[#F1EDE4]"
            >
              <span>Graine : {gameState.seed}</span>
              {seedCopied ? (
                <Check className="h-3.5 w-3.5 text-[#86EFAC]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                setGameState((prev) => ({ ...prev, screen: 'memorial' }))
              }
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-[#F1EDE4]"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mémorial</span>
            </button>
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-[#F1EDE4]"
            >
              {soundOn ? (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{soundOn ? 'Son actif' : 'Son coupé'}</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => startRun()}
              className="flex min-h-[38px] items-center gap-1.5 rounded-sm border border-[#473E35] bg-[#26211C] px-3 py-1.5 text-xs font-medium text-[#F3ECE0] whitespace-nowrap shrink-0 hover:bg-[#332C25]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nouvelle partie</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Critical Strip (< 15% height, visible only on < lg) */}
      <div className="border-b border-[#302A24] bg-[#1E1A16] px-3 py-2 lg:hidden">
        <div className="mx-auto flex max-w-[476px] items-center justify-between gap-2 text-xs">
          <div className="font-mono-num flex items-center gap-2">
            <span className="font-bold text-[#E59A38]">Ét. {gameState.depth}</span>
            <span
              className={`flex items-center gap-1 ${
                hp <= CONFIG.CRITICAL_THRESHOLDS.hp ? 'text-[#FCA5A5] font-bold' : ''
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-[#C83E3B]" aria-hidden="true" />
              {hp.toFixed(1).replace(/\.0$/, '')}
            </span>
            <span
              className={`flex items-center gap-1 ${
                oil <= CONFIG.CRITICAL_THRESHOLDS.oil ? 'text-[#FDE68A] font-bold' : ''
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-[#E59A38]" aria-hidden="true" />
              {Math.ceil(oil)}
            </span>
            <span
              className={`flex items-center gap-1 ${
                water <= CONFIG.CRITICAL_THRESHOLDS.water ? 'text-[#FCA5A5] font-bold' : ''
              }`}
            >
              <Droplets className="h-3.5 w-3.5 text-[#3B82A6]" aria-hidden="true" />
              {water.toFixed(1)}
            </span>
            <span
              className={`flex items-center gap-1 ${
                food <= CONFIG.CRITICAL_THRESHOLDS.food ? 'text-[#FCA5A5] font-bold' : ''
              }`}
            >
              <Utensils className="h-3.5 w-3.5 text-[#4D8B55]" aria-hidden="true" />
              {food.toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setGameState((prev) => ({ ...prev, modal: { type: 'map_overview' } }))
              }
              aria-label="Carte mémorisée"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-[#323946] bg-[#21252C] px-2 py-1 text-xs"
            >
              <MapIcon className="h-3.5 w-3.5 text-[#A8A29E]" />
            </button>
            <button
              type="button"
              onClick={() => setGameState((prev) => ({ ...prev, modal: { type: 'bag' } }))}
              className="font-mono-num flex min-h-[36px] items-center gap-1 rounded-md border border-[#323946] bg-[#21252C] px-2 py-1 text-xs font-medium"
            >
              <Backpack className="h-3.5 w-3.5 text-[#E59A38]" aria-hidden="true" />
              <span>
                {gameState.bag.length}/{CONFIG.PORTAGE} · {gold}g
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Arena */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Canvas + Unified Controls */}
          <div className="flex flex-col items-center gap-3 lg:col-span-7">
            <div className="flex w-full max-w-[476px] items-center justify-between text-xs text-[#B8AEA2] lg:hidden">
              <span className="truncate font-medium text-[#E6E0D4]">
                {floor?.biomeLabel} ({floor?.width}×{floor?.height})
              </span>
              {floor?.hero?.status && floor.hero.status !== 'absent' && (
                <span className="font-semibold text-[#FCA5A5]">
                  {floor.hero.status === 'announced'
                    ? `Torche (${floor.hero.countdown} t)`
                    : `${floor.hero.name} proche !`}
                </span>
              )}
            </div>

            <DungeonCanvas state={gameState} onMove={handleMove} />

            {/* 1-line Mobile Feedback Bar */}
            {latestLog && (
              <div className="w-full max-w-[476px] rounded-sm border border-[#302A24] bg-[#1E1A16] px-3 py-2 text-xs text-[#D6D3D1] lg:hidden">
                <span className="font-mono-num mr-1.5 text-[#8C8276]">T{latestLog.turn}</span>
                {latestLog.text}
              </div>
            )}

            <TouchControls onMove={handleMove} contextAction={contextAction} />

            <p className="hidden text-center text-xs text-[#9C9286] lg:block">
              Flèches / WASD (déplacement & bump) + Espace / Entrée (escalier ou menu : fouiller, camper, sac, carte) · Raccourcis : I · Tab · R · C · Q
            </p>
          </div>

          {/* Right Column: Ledger HUD & Event Log */}
          <div className="lg:col-span-5">
            <HudPanel
              state={gameState}
              onOpenBag={() =>
                setGameState((prev) => ({ ...prev, modal: { type: 'bag' } }))
              }
              onOpenCamp={() =>
                setGameState((prev) => ({ ...prev, modal: { type: 'camp_confirm' } }))
              }
              onOpenMap={() =>
                setGameState((prev) => ({ ...prev, modal: { type: 'map_overview' } }))
              }
              onOpenMarker={() =>
                setGameState((prev) => ({ ...prev, modal: { type: 'marker_place' } }))
              }
              onQuickConsume={(itemId) =>
                setGameState((prev) => useBagItem(prev, itemId, 'use'))
              }
            />
          </div>
        </div>
      </main>

      {/* Immediate Narrative Dialogue Box (before archiving into log) */}
      {hasActiveDialogue && (
        <DialogueBox
          item={gameState.dialogueQueue[0]}
          remainingCount={gameState.dialogueQueue.length}
          onContinue={handleDismissDialogue}
        />
      )}

      {/* Contextual Administrative Drawer / Modal */}
      <ContextModal
        state={gameState}
        onClose={() =>
          setGameState((prev) => ({ ...prev, modal: { type: 'none' } }))
        }
        onInnService={(action) =>
          setGameState((prev) => performInnService(prev, action))
        }
        onNpcChoice={(npcId, choice) =>
          setGameState((prev) => resolveNpcInteraction(prev, npcId, choice))
        }
        onFeatureChoice={(x, y, action) =>
          setGameState((prev) => resolveFeatureAction(prev, x, y, action))
        }
        onBagAction={(itemId, action) =>
          setGameState((prev) => useBagItem(prev, itemId, action))
        }
        onConfirmCamp={() => setGameState((prev) => performCamping(prev))}
        onPlaceMarker={(text) =>
          setGameState((prev) => placeMarkerOnCurrentTile(prev, text))
        }
        onActionMenuChoice={(choice) => {
          if (choice === 'scan') {
            setGameState((prev) => waitAndScan({ ...prev, modal: { type: 'none' } }));
          } else if (choice === 'camp') {
            setGameState((prev) => ({ ...prev, modal: { type: 'camp_confirm' } }));
          } else if (choice === 'bag') {
            setGameState((prev) => ({ ...prev, modal: { type: 'bag' } }));
          } else if (choice === 'map') {
            setGameState((prev) => ({ ...prev, modal: { type: 'map_overview' } }));
          }
        }}
      />
    </div>
  );
}
