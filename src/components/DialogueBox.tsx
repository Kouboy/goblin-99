import React, { useEffect, useRef } from 'react';
import { DialogueItem } from '../game/types';

interface DialogueBoxProps {
  item: DialogueItem;
  remainingCount: number;
  onContinue: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  item,
  remainingCount,
  onContinue,
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    btnRef.current?.focus();
  }, [item.id]);

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-xl px-3 sm:bottom-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Observation de ${item.speaker}`}
    >
      <div className="paper-surface rounded-2xl border-2 border-[#1E1B18]/75 p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E1B18]/15 pb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-[#1E1B18] sm:text-lg">
              {item.speaker}
            </h3>
            {item.deltaText && (
              <span className="font-mono-num text-xs font-semibold text-[#8C2D19]">
                · {item.deltaText}
              </span>
            )}
          </div>
          {item.badge && (
            <span className="stamp-seal shrink-0 px-2 py-0.5 font-mono-num text-[10px] font-bold">
              {item.badge}
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#1E1B18] sm:text-[15px]">
          {item.text}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-[#6B5E52]">
            {remainingCount > 1
              ? `Note suivante (${remainingCount - 1} en attente)`
              : 'Archivé au journal après lecture'}
          </span>
          <button
            ref={btnRef}
            type="button"
            onClick={onContinue}
            className="min-h-[44px] rounded-lg bg-[#1E1B18] px-4 py-2 text-xs font-semibold text-[#F4EFE6] transition-colors hover:bg-[#38312B] focus-visible:ring-2 focus-visible:ring-[#B8332F] focus-visible:outline-none"
          >
            Continuer (Espace / Entrée)
          </button>
        </div>
      </div>
    </div>
  );
};
