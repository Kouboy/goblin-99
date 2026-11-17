import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Compass, Flame } from 'lucide-react';

interface TitleScreenProps {
  memorialCount: number;
  onStart: (seed?: string) => void;
  onOpenMemorial: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  memorialCount,
  onStart,
  onOpenMemorial,
}) => {
  const [seedInput, setSeedInput] = useState('');
  const containerRef = useRef<HTMLElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    startBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root) return;
      const active = document.activeElement as HTMLElement | null;
      const isTextInput = active instanceof HTMLInputElement && active.type === 'text';

      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'),
      );
      if (focusables.length === 0) return;

      const idx = active ? focusables.indexOf(active) : -1;

      if (e.key === 'ArrowDown' || (!isTextInput && e.key === 'ArrowRight')) {
        e.preventDefault();
        const nextIdx = idx < 0 ? 1 % focusables.length : (idx + 1) % focusables.length;
        focusables[nextIdx].focus();
      } else if (e.key === 'ArrowUp' || (!isTextInput && e.key === 'ArrowLeft')) {
        e.preventDefault();
        const prevIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
        focusables[prevIdx].focus();
      } else if (!isTextInput && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        if (active && active instanceof HTMLButtonElement) {
          active.click();
        } else {
          onStart(seedInput.trim() || undefined);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart, seedInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(seedInput.trim() || undefined);
  };

  return (
    <main
      ref={containerRef}
      className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:px-8"
    >
      <div className="grid items-stretch gap-8 lg:grid-cols-12">
        {/* Primary Dark Lantern Narrative Hero */}
        <section className="flex flex-col justify-between rounded-2xl border border-[#2A303A] bg-[#181B20] p-6 sm:p-10 lg:col-span-7">
          <div className="space-y-5">
            <p className="font-mono-num text-xs text-[#E59A38]">
              Prototype de validation v2 · Étages 0 à -99
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-[#F1EDE4] sm:text-5xl text-balance">
              Goblin Survivor -99
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#D6D3D1]">
              Vous n’êtes pas le héros de cette histoire. Glissez-vous dans le sillage des aventuriers, gérez votre huile, votre eau et vos vivres entre chaque auberge, et sachez faire demi-tour avant que la lanterne ne s’éteigne.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="seed-input"
                className="mb-1.5 block text-xs font-medium text-[#A8A29E]"
              >
                Graine d’expédition (optionnelle, pour rejouer un donjon identique)
              </label>
              <input
                id="seed-input"
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Ex : GS-42RAT (laisser vide = aléatoire)"
                className="font-mono-num min-h-[44px] w-full rounded-lg border border-[#323946] bg-[#121417] px-3.5 py-2 text-sm text-[#F1EDE4] placeholder:text-[#78716C] focus:border-[#E59A38] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                ref={startBtnRef}
                type="submit"
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#E59A38] px-5 py-3 text-sm font-semibold text-[#121417] transition-colors hover:bg-[#F5AD4C] focus:ring-2 focus:ring-[#F1EDE4] focus:outline-none"
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>Lancer une expédition</span>
              </button>

              <button
                type="button"
                onClick={onOpenMemorial}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#323946] bg-[#21252C] px-5 py-3 text-sm font-medium text-[#F1EDE4] transition-colors hover:bg-[#2A303A] focus:ring-2 focus:ring-[#E59A38] focus:outline-none"
              >
                <BookOpen className="h-4 w-4 text-[#A8A29E]" aria-hidden="true" />
                <span>Mémorial ({memorialCount})</span>
              </button>
            </div>
          </form>
        </section>

        {/* Secondary Administrative Paper Ledger Card */}
        <section className="paper-surface flex flex-col justify-between rounded-2xl border border-[#C9BFA9] p-6 sm:p-8 lg:col-span-5">
          <div className="space-y-5">
            <div className="flex items-start justify-between border-b border-[#1E1B18]/15 pb-3">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">Notice réglementaire</p>
                <h2 className="font-display text-xl font-bold text-[#1E1B18]">
                  Règles de survie
                </h2>
              </div>
              <span className="stamp-seal px-2 py-0.5 font-mono-num text-[11px] font-bold">
                V2 TEST
              </span>
            </div>

            <ul className="space-y-3 text-sm leading-relaxed text-[#3E3730]">
              <li>
                <strong>Déplacement :</strong> approchez un PNJ ou un comptoir pour interagir ; marchez sur un coffre ou un puits et appuyez sur Espace / Entrée pour l’examiner.
              </li>
              <li>
                <strong>Refuges explorables :</strong> une auberge sûre apparaît tous les 4 étages (-4, -8, -12...).
              </li>
              <li>
                <strong>Zéro duel héroïque :</strong> fuyez, posez un piège pliant ou sacrifiez un allié recruté si un héros vous traque.
              </li>
              <li>
                <strong>Mémoire des lieux :</strong> les étages conservent votre carte et vos repères pour faciliter le retour.
              </li>
            </ul>
          </div>

          <div className="mt-6 border-t border-[#1E1B18]/15 pt-4 text-xs text-[#6B5E52]">
            <div className="flex items-center gap-2 font-medium text-[#1E1B18]">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>100% Clavier & Tactile</span>
            </div>
            <p className="mt-1">
              Au clavier : Flèches / WASD pour marcher et pousser, Espace / Entrée pour inspecter un objet sous vos pieds, utiliser les escaliers ou ouvrir les actions. Raccourcis : I, Tab, R, C, Q · Swipe sur mobile.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
