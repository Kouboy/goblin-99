import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import { ContextAction } from '../game/types';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  contextAction: ContextAction | null;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  contextAction,
}) => {
  return (
    <div className="archival-ledger flex w-full max-w-[476px] items-center justify-between gap-4 rounded-sm px-4 py-3">
      {/* Generous Cardinal D-Pad (>=48px touch targets) */}
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Pavé directionnel">
        <div />
        <button
          type="button"
          onClick={() => onMove(0, -1)}
          aria-label="Haut"
          className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#231F1B] bg-[#EFE7D8] text-[#1E1B18] active:scale-95 active:bg-[#1E1B18] active:text-[#F3ECE0] focus-visible:outline-2 focus-visible:outline-[#B8332F]"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
        <div />

        <button
          type="button"
          onClick={() => onMove(-1, 0)}
          aria-label="Gauche"
          className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#231F1B] bg-[#EFE7D8] text-[#1E1B18] active:scale-95 active:bg-[#1E1B18] active:text-[#F3ECE0] focus-visible:outline-2 focus-visible:outline-[#B8332F]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(0, 1)}
          aria-label="Bas"
          className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#231F1B] bg-[#EFE7D8] text-[#1E1B18] active:scale-95 active:bg-[#1E1B18] active:text-[#F3ECE0] focus-visible:outline-2 focus-visible:outline-[#B8332F]"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1, 0)}
          aria-label="Droite"
          className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#231F1B] bg-[#EFE7D8] text-[#1E1B18] active:scale-95 active:bg-[#1E1B18] active:text-[#F3ECE0] focus-visible:outline-2 focus-visible:outline-[#B8332F]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {/* Single Unified Contextual Action Button (GDD mobile requirement: max 1) */}
      <div className="flex flex-1 flex-col items-end justify-center gap-1.5">
        <button
          type="button"
          disabled={!contextAction}
          onClick={() => contextAction?.execute()}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#B8332F] ${
            contextAction?.urgent
              ? 'border border-[#231F1B] bg-[#B8332F] text-[#F3ECE0] hover:bg-[#9E2A26]'
              : contextAction
              ? 'border border-[#231F1B] bg-[#1E1B18] text-[#F3ECE0] hover:bg-[#38312B]'
              : 'border border-[#231F1B]/25 bg-[#E7DEC9] text-[#6B5E52]'
          }`}
        >
          <Hand className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {contextAction ? contextAction.label : 'Poussez vers un service'}
          </span>
        </button>
        <p className="text-[11px] text-[#574D43]">
          {contextAction
            ? `Raccourci : ${contextAction.shortHint} · Swipe actif`
            : 'Bump sur un comptoir, coffre ou PNJ'}
        </p>
      </div>
    </div>
  );
};
