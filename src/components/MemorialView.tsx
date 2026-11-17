import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, RotateCcw, Trash2 } from 'lucide-react';
import { MemorialEntry } from '../game/types';

interface MemorialViewProps {
  entries: MemorialEntry[];
  onBack: () => void;
  onReplaySeed: (seed: string) => void;
  onClear: () => void;
}

export const MemorialView: React.FC<MemorialViewProps> = ({
  entries,
  onBack,
  onReplaySeed,
  onClear,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const backBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    backBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
        return;
      }

      const root = containerRef.current;
      if (!root) return;
      const buttons = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      );
      if (buttons.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const idx = active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = idx < 0 ? 0 : (idx + 1) % buttons.length;
        buttons[nextIdx].focus();
        buttons[nextIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = idx <= 0 ? buttons.length - 1 : idx - 1;
        buttons[prevIdx].focus();
        buttons[prevIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (idx >= 0) {
          buttons[idx].click();
        } else {
          onBack();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack]);

  const deepest =
    entries.length > 0 ? Math.min(...entries.map((e) => e.maxDepth)) : 0;
  const avgTurns =
    entries.length > 0
      ? Math.round(entries.reduce((acc, e) => acc + e.turns, 0) / entries.length)
      : 0;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goblin_survivor_memorial.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const focusClass = 'focus:ring-2 focus:ring-[#B8332F] focus:outline-none';

  return (
    <main ref={containerRef} className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
      <div className="paper-surface rounded-2xl border border-[#C9BFA9] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E1B18]/15 pb-4">
          <div className="flex items-center gap-3">
            <button
              ref={backBtnRef}
              type="button"
              onClick={onBack}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#1E1B18]/25 px-3 py-2 text-sm font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 ${focusClass}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Retour (Échap)</span>
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1E1B18]">
                Mémorial local des expéditions
              </h1>
              <p className="font-mono-num text-xs text-[#6B5E52]">
                {entries.length} dossier{entries.length > 1 ? 's' : ''} · Record : étage {deepest} · Moyenne : {avgTurns} tours
              </p>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className={`flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#1E1B18]/25 px-3 py-1.5 text-xs font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 ${focusClass}`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exporter JSON</span>
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className={`flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#B8332F]/40 px-3 py-1.5 text-xs font-medium text-[#B8332F] hover:bg-[#B8332F]/10 ${focusClass}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Vider</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setConfirmClear(false);
                  }}
                  className={`min-h-[40px] rounded-lg bg-[#B8332F] px-3 py-1.5 text-xs font-semibold text-[#F4EFE6] ${focusClass}`}
                >
                  Confirmer suppression
                </button>
              )}
            </div>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#6B5E52]">
            Aucun gobelin n’a encore laissé de trace dans ce registre. Lancez une expédition pour inaugurer le mémorial.
          </div>
        ) : (
          <ul className="divide-y divide-[#1E1B18]/15">
            {entries.map((entry) => (
              <li key={entry.id} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-[#1E1B18]">
                    {entry.title}
                  </h2>
                  <div className="font-mono-num flex items-center gap-3 text-xs text-[#6B5E52]">
                    <span>Étage {entry.maxDepth}</span>
                    <span>·</span>
                    <span>{entry.turns} tours</span>
                    <span>·</span>
                    <span>Graine {entry.seed}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#3E3730]">
                  {entry.epitaph}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-[#6B5E52]">
                  <span>{new Date(entry.dateIso).toLocaleDateString('fr-FR')}</span>
                  <button
                    type="button"
                    onClick={() => onReplaySeed(entry.seed)}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded px-2 font-semibold text-[#1E1B18] underline-offset-2 hover:underline ${focusClass}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Rejouer cette graine</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};
