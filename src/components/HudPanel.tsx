import React from 'react';
import {
  Backpack,
  Coins,
  Droplets,
  Flag,
  Flame,
  Footprints,
  Heart,
  Map as MapIcon,
  ShieldAlert,
  Tent,
  Utensils,
} from 'lucide-react';
import { CONFIG } from '../game/config';
import { getNearestInnInfo, getSurvivalSuggestion } from '../game/engine';
import { GameState } from '../game/types';

interface HudPanelProps {
  state: GameState;
  onOpenBag: () => void;
  onOpenCamp: () => void;
  onOpenMap: () => void;
  onOpenMarker: () => void;
  onQuickConsume: (itemId: string) => void;
}

interface MeterRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  statusText?: string;
  critical?: boolean;
  barColor: string;
}

const MeterRow: React.FC<MeterRowProps> = ({
  icon,
  label,
  value,
  max,
  statusText,
  critical,
  barColor,
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-[#1E1B18]">
          {icon}
          <span>{label}</span>
          {statusText && (
            <span
              className={`ml-1 font-semibold ${
                critical ? 'text-[#B8332F]' : 'text-[#574D43]'
              }`}
            >
              · {statusText}
            </span>
          )}
        </span>
        <span className="font-mono-num font-semibold text-[#1E1B18]">
          {value.toFixed(1).replace(/\.0$/, '')} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-[2px] border border-[#231F1B]/75 bg-[#E7DEC9]">
        <div
          className={`h-full transition-all duration-150 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const HudPanel: React.FC<HudPanelProps> = ({
  state,
  onOpenBag,
  onOpenCamp,
  onOpenMap,
  onOpenMarker,
  onQuickConsume,
}) => {
  const floor = state.floors[state.depth];
  const isInn = floor?.isInn ?? false;
  const innInfo = getNearestInnInfo(state.depth);
  const suggestion = getSurvivalSuggestion(state);

  const { oil, water, food, hp, gold } = state.resources;
  const oilCrit = oil <= CONFIG.CRITICAL_THRESHOLDS.oil;
  const waterCrit = water <= CONFIG.CRITICAL_THRESHOLDS.water;
  const foodCrit = food <= CONFIG.CRITICAL_THRESHOLDS.food;
  const hpCrit = hp <= CONFIG.CRITICAL_THRESHOLDS.hp;

  const markerCount = state.bag
    .filter((i) => i.kind === 'marker')
    .reduce((acc, i) => acc + i.quantity, 0);

  const hero = floor?.hero;
  let noiseLabel = 'Calme';
  let noiseStyle = 'text-[#574D43]';
  if (hero?.status === 'active') {
    noiseLabel =
      hero.stunTurns > 0
        ? `${hero.name} piégé (${hero.stunTurns} t)`
        : `${hero.name} en chasse !`;
    noiseStyle = 'text-[#B8332F] font-bold';
  } else if (hero?.status === 'announced') {
    noiseLabel = `Torche en approche (${hero.countdown} t)`;
    noiseStyle = 'text-[#9A5B13] font-bold';
  } else if (state.localNoise >= CONFIG.NOISE_HIGH_THRESHOLD) {
    noiseLabel = 'Bruit élevé (danger)';
    noiseStyle = 'text-[#9A5B13] font-semibold';
  } else if (state.localNoise >= CONFIG.NOISE_ALERT_THRESHOLD) {
    noiseLabel = 'Bruit suspect';
    noiseStyle = 'text-[#3E3730]';
  }

  const discoveredEntries = Object.entries(state.discoveredMushrooms);

  return (
    <aside className="archival-ledger flex flex-col gap-3.5 rounded-sm p-4 sm:p-5">
      {/* Ledger Header + Red Administrative Stamp */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-[#231F1B] pb-3">
        <div className="min-w-0">
          <p className="font-mono-num text-[11px] font-semibold text-[#574D43]">
            Registre de terrain · Tour {state.turn} · {floor ? `${floor.width}×${floor.height}` : ''}
          </p>
          <h2 className="truncate font-display text-xl font-bold text-[#1E1B18]">
            {floor?.biomeLabel ?? 'Profondeurs'}
          </h2>
          <p className="mt-0.5 text-xs text-[#574D43]">{innInfo.label}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="stamp-seal px-2 py-0.5 font-mono-num text-[11px] font-bold">
            {isInn ? 'REFUGE SÛR' : `ÉTAGE ${state.depth}`}
          </span>
          <div className="flex items-center gap-1 font-mono-num text-xs font-bold text-[#1E1B18]">
            <Coins className="h-3.5 w-3.5 text-[#9A5B13]" aria-hidden="true" />
            <span>{gold} or · {state.narrative.goblinName}</span>
          </div>
        </div>
      </div>

      {/* Survival Suggestion Banner when low */}
      {suggestion && (
        <button
          type="button"
          onClick={() => onQuickConsume(suggestion.itemId)}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-sm border border-[#B8332F] bg-[#B8332F]/10 px-3 py-2 text-left text-xs font-bold text-[#7F1D1D] transition-colors hover:bg-[#B8332F]/18 focus-visible:outline-2 focus-visible:outline-[#B8332F]"
        >
          <span>Alerte survie : {suggestion.label}</span>
          <span className="font-mono-num rounded-sm border border-[#B8332F]/50 bg-[#F3ECE0] px-1.5 py-0.5 text-[11px]">
            Q
          </span>
        </button>
      )}

      {/* Critical Resource Ink Gauges */}
      <div className="space-y-2.5">
        <MeterRow
          icon={<Flame className="h-3.5 w-3.5 text-[#C87D20]" aria-hidden="true" />}
          label="Huile"
          value={oil}
          max={CONFIG.MAX_OIL}
          statusText={oil === 0 ? 'Éteinte' : oilCrit ? 'Basse' : undefined}
          critical={oilCrit}
          barColor={oilCrit ? 'bg-[#B8332F]' : 'bg-[#C87D20]'}
        />
        <MeterRow
          icon={<Droplets className="h-3.5 w-3.5 text-[#3A6F8F]" aria-hidden="true" />}
          label="Eau"
          value={water}
          max={CONFIG.MAX_WATER}
          statusText={water === 0 ? 'À sec !' : waterCrit ? 'Critique' : undefined}
          critical={waterCrit}
          barColor={waterCrit ? 'bg-[#B8332F]' : 'bg-[#3A6F8F]'}
        />
        <MeterRow
          icon={<Utensils className="h-3.5 w-3.5 text-[#477A4D]" aria-hidden="true" />}
          label="Vivres"
          value={food}
          max={CONFIG.MAX_FOOD}
          statusText={food === 0 ? 'À sec !' : foodCrit ? 'Bas' : undefined}
          critical={foodCrit}
          barColor={foodCrit ? 'bg-[#B8332F]' : 'bg-[#477A4D]'}
        />
        <MeterRow
          icon={<Heart className="h-3.5 w-3.5 text-[#B8332F]" aria-hidden="true" />}
          label="PV"
          value={hp}
          max={CONFIG.MAX_HP}
          statusText={hpCrit ? 'Critique' : undefined}
          critical={hpCrit}
          barColor="bg-[#B8332F]"
        />
      </div>

      {/* Ruled Ledger Annotations: Threat, Ally, Mushrooms */}
      <div className="space-y-1.5 border-t border-[#231F1B]/25 pt-3 text-xs">
        {!isInn && (
          <div className="flex items-center justify-between gap-2 border-b border-[#231F1B]/10 pb-1">
            <span className="flex items-center gap-1.5 font-medium text-[#574D43]">
              {hero?.status && hero.status !== 'absent' ? (
                <ShieldAlert className="h-3.5 w-3.5 text-[#B8332F]" aria-hidden="true" />
              ) : (
                <Footprints className="h-3.5 w-3.5 text-[#574D43]" aria-hidden="true" />
              )}
              <span>Menace</span>
            </span>
            <span className={noiseStyle}>{noiseLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-b border-[#231F1B]/10 pb-1">
          <span className="font-medium text-[#574D43]">Allié actif</span>
          <span className="font-semibold text-[#1E1B18]">
            {state.ally ? state.ally.name : 'Aucun'}
          </span>
        </div>

        {discoveredEntries.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#231F1B]/10 pb-1">
            <span className="font-medium text-[#574D43]">Champignons</span>
            <span className="font-medium text-[#1E1B18]">
              {discoveredEntries
                .map(([color, eff]) => {
                  const tag =
                    eff === 'beneficial'
                      ? 'bon'
                      : eff === 'toxic'
                      ? 'toxique'
                      : eff === 'hallucinatory'
                      ? 'hallu'
                      : 'fade';
                  return `${color} (${tag})`;
                })
                .join(' · ')}
            </span>
          </div>
        )}
      </div>

      {/* Bag, Map, Marker & Camp Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#231F1B]/25 pt-3">
        <button
          type="button"
          onClick={onOpenBag}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-sm border border-[#231F1B] bg-[#EFE7D8] px-3 py-2 text-xs font-semibold text-[#1E1B18] transition-colors hover:bg-[#E4D9C4] focus-visible:outline-2 focus-visible:outline-[#B8332F] whitespace-nowrap"
        >
          <Backpack className="h-4 w-4 text-[#9A5B13]" aria-hidden="true" />
          <span className="font-mono-num">
            Sac (I) · {state.bag.length}/{CONFIG.PORTAGE}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenMap}
          className="flex min-h-[42px] items-center justify-center gap-2 rounded-sm border border-[#231F1B] bg-[#EFE7D8] px-3 py-2 text-xs font-semibold text-[#1E1B18] transition-colors hover:bg-[#E4D9C4] focus-visible:outline-2 focus-visible:outline-[#B8332F] whitespace-nowrap"
        >
          <MapIcon className="h-4 w-4 text-[#574D43]" aria-hidden="true" />
          <span>Carte (Tab)</span>
        </button>

        {!isInn && (
          <>
            <button
              type="button"
              disabled={markerCount === 0}
              onClick={onOpenMarker}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-sm border border-[#231F1B] bg-[#EFE7D8] px-3 py-2 text-xs font-semibold text-[#1E1B18] transition-colors hover:bg-[#E4D9C4] disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-[#B8332F] whitespace-nowrap"
            >
              <Flag className="h-4 w-4 text-[#B8332F]" aria-hidden="true" />
              <span className="font-mono-num">Repère (R · {markerCount})</span>
            </button>

            <button
              type="button"
              onClick={onOpenCamp}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-sm border border-[#231F1B] bg-[#EFE7D8] px-3 py-2 text-xs font-semibold text-[#1E1B18] transition-colors hover:bg-[#E4D9C4] focus-visible:outline-2 focus-visible:outline-[#B8332F] whitespace-nowrap"
            >
              <Tent className="h-4 w-4 text-[#574D43]" aria-hidden="true" />
              <span>Bivouac (C)</span>
            </button>
          </>
        )}
      </div>

      {/* Ruled Archival Event Log */}
      <div className="space-y-1.5 border-t border-[#231F1B]/25 pt-3">
        <p className="font-mono-num text-[11px] font-bold text-[#574D43]">
          MAIN COURANTE DES EXPÉDITIONS
        </p>
        <ul className="ledger-ruled max-h-36 space-y-1 overflow-y-auto pr-1 text-xs leading-[28px]">
          {state.logs.slice(0, 8).map((log) => {
            const colorClass =
              log.tone === 'danger'
                ? 'text-[#9F1D1D] font-semibold'
                : log.tone === 'warn'
                ? 'text-[#8C4A0B] font-medium'
                : log.tone === 'good'
                ? 'text-[#2D5F35] font-medium'
                : log.tone === 'info'
                ? 'text-[#1E1B18]'
                : 'text-[#574D43]';
            return (
              <li key={log.id} className={colorClass}>
                <span className="font-mono-num mr-1.5 text-[11px] text-[#6B5E52]">
                  T{log.turn}
                </span>
                {log.text}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};
