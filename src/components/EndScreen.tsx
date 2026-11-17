import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Copy, RotateCcw } from 'lucide-react';
import { MemorialEntry } from '../game/types';

interface EndScreenProps {
  entry: MemorialEntry;
  onReplaySameSeed: () => void;
  onNewRun: () => void;
  onOpenMemorial: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({
  entry,
  onReplaySameSeed,
  onNewRun,
  onOpenMemorial,
}) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primaryBtnRef.current?.focus();
  }, [entry.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root) return;
      const buttons = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      );
      if (buttons.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const idx = active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = idx < 0 ? 0 : (idx + 1) % buttons.length;
        buttons[nextIdx].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = idx <= 0 ? buttons.length - 1 : idx - 1;
        buttons[prevIdx].focus();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (idx >= 0) {
          buttons[idx].click();
        } else {
          onNewRun();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNewRun]);

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(entry.seed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const isVictory = entry.outcome === 'survived_99';

  return (
    <main
      ref={containerRef}
      className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-10"
    >
      <article className="paper-surface w-full rounded-2xl border border-[#C9BFA9] p-6 shadow-2xl sm:p-9">
        <div className="flex items-start justify-between gap-4 border-b border-[#1E1B18]/20 pb-4">
          <div>
            <p className="font-mono-num text-xs text-[#6B5E52]">
              {isVictory ? 'Certificat de survie' : 'Avis de classement définitif'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#1E1B18] sm:text-3xl text-balance">
              {entry.title}
            </h1>
          </div>
          <span className="stamp-seal shrink-0 px-2.5 py-1 font-mono-num text-xs font-bold">
            {isVictory ? 'HOMOLOGUÉ' : 'CLASSÉ'}
          </span>
        </div>

        <p className="mt-6 font-display text-lg leading-relaxed text-[#1E1B18]">
          {entry.epitaph}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-[#1E1B18]/15 py-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[#6B5E52]">Profondeur max</dt>
            <dd className="font-mono-num mt-0.5 text-base font-bold text-[#1E1B18]">
              {entry.maxDepth}
            </dd>
          </div>
          <div>
            <dt className="text-[#6B5E52]">Tours vécus</dt>
            <dd className="font-mono-num mt-0.5 text-base font-bold text-[#1E1B18]">
              {entry.turns}
            </dd>
          </div>
          <div>
            <dt className="text-[#6B5E52]">Dernier refuge</dt>
            <dd className="mt-0.5 truncate font-semibold text-[#1E1B18]">
              {entry.lastInnName}
            </dd>
          </div>
          <div>
            <dt className="text-[#6B5E52]">Graine</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <span className="font-mono-num font-bold text-[#1E1B18]">{entry.seed}</span>
              <button
                type="button"
                onClick={handleCopySeed}
                aria-label="Copier la graine"
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#1E1B18]/20 text-[#1E1B18] hover:bg-[#1E1B18]/10 focus:ring-2 focus:ring-[#B8332F] focus:outline-none"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={onNewRun}
            className="min-h-[48px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-3 text-sm font-semibold text-[#F4EFE6] transition-colors hover:bg-[#38312B] focus:ring-2 focus:ring-[#B8332F] focus:outline-none"
          >
            Nouvelle expédition
          </button>
          <button
            type="button"
            onClick={onReplaySameSeed}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#1E1B18]/30 px-4 py-3 text-sm font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 focus:ring-2 focus:ring-[#B8332F] focus:outline-none"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Rejouer cette graine</span>
          </button>
          <button
            type="button"
            onClick={onOpenMemorial}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#1E1B18]/30 px-4 py-3 text-sm font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 focus:ring-2 focus:ring-[#B8332F] focus:outline-none"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Mémorial</span>
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[#6B5E52]">
          Navigation : Flèches · Valider : Espace / Entrée
        </p>
      </article>
    </main>
  );
};
