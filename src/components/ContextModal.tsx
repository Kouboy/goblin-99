import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CONFIG } from '../game/config';
import { GameState } from '../game/types';

interface ContextModalProps {
  state: GameState;
  onClose: () => void;
  onInnService: (
    action:
      | { type: 'buy_oil' }
      | { type: 'buy_food' }
      | { type: 'buy_water' }
      | { type: 'buy_ration' }
      | { type: 'buy_waterskin' }
      | { type: 'buy_trap' }
      | { type: 'buy_markers' }
      | { type: 'sell_item'; itemId: string }
      | { type: 'sell_all_treasures' }
      | { type: 'dormitory' }
      | { type: 'hire_tavern_ally' }
      | { type: 'stamp_99_victory' },
  ) => void;
  onNpcChoice: (npcId: string, choice: 'pay' | 'talk' | 'recruit' | 'flee') => void;
  onFeatureChoice: (x: number, y: number, action: 'confirm' | 'leave') => void;
  onBagAction: (itemId: string, action: 'use' | 'drop') => void;
  onConfirmCamp: () => void;
  onPlaceMarker: (text: string) => void;
  onActionMenuChoice: (choice: 'scan' | 'camp' | 'bag' | 'map') => void;
  onPitWinchChoice: (action: 'salvage' | 'descend' | 'leave') => void;
}

export const ContextModal: React.FC<ContextModalProps> = ({
  state,
  onClose,
  onInnService,
  onNpcChoice,
  onFeatureChoice,
  onBagAction,
  onConfirmCamp,
  onPlaceMarker,
  onActionMenuChoice,
  onPitWinchChoice,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerInputRef = useRef<HTMLInputElement | null>(null);
  const prevModalTypeRef = useRef<string>('none');
  const [markerText, setMarkerText] = useState('');

  const floor = state.floors[state.depth];
  const gold = state.resources.gold;

  // Reset / prefill marker input when opening marker_place
  useEffect(() => {
    if (state.modal.type === 'marker_place' && floor) {
      const existing = floor.tiles[state.player.y]?.[state.player.x]?.marker?.text ?? '';
      setMarkerText(existing);
    }
  }, [state.modal.type, floor, state.player.x, state.player.y]);

  // Auto-focus first interactive element whenever modal type changes or active button unmounts
  useEffect(() => {
    const modalChanged = prevModalTypeRef.current !== state.modal.type;
    prevModalTypeRef.current = state.modal.type;

    if (state.modal.type === 'none') return;
    const timer = requestAnimationFrame(() => {
      if (state.modal.type === 'marker_place' && markerInputRef.current) {
        if (modalChanged || !containerRef.current?.contains(document.activeElement)) {
          markerInputRef.current.focus();
          markerInputRef.current.select();
        }
        return;
      }
      const root = containerRef.current;
      if (!root) return;
      const active = document.activeElement as HTMLElement | null;
      if (
        !modalChanged &&
        active &&
        root.contains(active) &&
        !(active as HTMLButtonElement).disabled
      ) {
        return;
      }
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled):not([data-close-x]), input:not(:disabled)',
        ),
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [state.modal, state.bag.length, state.resources.gold]);

  // Full keyboard navigation across ALL dialogue boxes (Arrows + Space/Enter + Escape)
  useEffect(() => {
    if (state.modal.type === 'none') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && state.modal.type === 'map_overview') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const root = containerRef.current;
      if (!root) return;

      const active = document.activeElement as HTMLElement | null;
      const isTextInput = active instanceof HTMLInputElement && active.type === 'text';

      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled):not([data-close-x]), input:not(:disabled)',
        ),
      );

      if (focusables.length === 0) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      const currentIdx = active ? focusables.indexOf(active) : -1;

      if (
        e.key === 'ArrowDown' ||
        (!isTextInput && e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        e.stopPropagation();
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % focusables.length;
        focusables[nextIdx].focus();
        return;
      }

      if (
        e.key === 'ArrowUp' ||
        (!isTextInput && e.key === 'ArrowLeft')
      ) {
        e.preventDefault();
        e.stopPropagation();
        const prevIdx =
          currentIdx <= 0 ? focusables.length - 1 : currentIdx - 1;
        focusables[prevIdx].focus();
        return;
      }

      if (!isTextInput && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        if (active && root.contains(active) && active instanceof HTMLButtonElement) {
          active.click();
        } else {
          focusables[0].click();
        }
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [state.modal.type, onClose]);

  if (state.modal.type === 'none') return null;

  const focusBtnClass =
    'focus-visible:ring-2 focus-visible:ring-[#B8332F] focus:ring-2 focus:ring-[#B8332F] focus:outline-none';

  const renderBody = () => {
    switch (state.modal.type) {
      case 'action_menu': {
        const isInn = floor?.isInn ?? false;
        const c = CONFIG.CAMP;
        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">
                Étage {state.depth} · Case ({state.player.x}, {state.player.y})
              </p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                {isInn ? 'Options en refuge' : 'Que faire ici ?'}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!isInn && (
                <>
                  <button
                    type="button"
                    onClick={() => onActionMenuChoice('scan')}
                    className={`min-h-[48px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3.5 py-2.5 text-left transition-colors hover:bg-[#E5DCC9] ${focusBtnClass}`}
                  >
                    <div className="font-semibold text-[#1E1B18]">Fouiller</div>
                    <div className="text-xs text-[#6B5E52]">
                      Scruter autour et révéler les pièges (1 tour)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onActionMenuChoice('camp')}
                    className={`min-h-[48px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3.5 py-2.5 text-left transition-colors hover:bg-[#E5DCC9] ${focusBtnClass}`}
                  >
                    <div className="font-semibold text-[#1E1B18]">Camper</div>
                    <div className="font-mono-num text-xs text-[#6B5E52]">
                      +{c.hpHeal} PV ({c.oilCost} huile, {c.foodCost} vivre, {c.waterCost} eau)
                    </div>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onActionMenuChoice('bag')}
                className={`min-h-[48px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3.5 py-2.5 text-left transition-colors hover:bg-[#E5DCC9] ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">
                  Sac ({state.bag.length}/{CONFIG.PORTAGE})
                </div>
                <div className="text-xs text-[#6B5E52]">
                  Rations, gourdes, pièges et repères
                </div>
              </button>

              <button
                type="button"
                onClick={() => onActionMenuChoice('map')}
                className={`min-h-[48px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3.5 py-2.5 text-left transition-colors hover:bg-[#E5DCC9] ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">Carte</div>
                <div className="text-xs text-[#6B5E52]">
                  Consulter le plan mémorisé de l’étage
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[40px] rounded-lg border border-[#1E1B18]/30 px-4 py-1.5 text-xs font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Fermer (Échap)
              </button>
            </div>
          </div>
        );
      }

      case 'inn_counter': {
        const meta = floor?.innMeta;
        const treasures = state.bag.filter((i) => i.kind === 'jewel' || i.kind === 'relic');
        const totalSell = treasures.reduce((acc, i) => acc + i.sellValue, 0);

        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">
                  Formulaire {meta?.formCode ?? 'CERFA-G00'}
                </p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                  Comptoir de {meta?.innkeeperName ?? 'l’Aubergiste'}
                </h3>
              </div>
              <span className="stamp-seal px-2 py-0.5 font-mono-num text-[11px] font-bold">
                ZONE SÛRE
              </span>
            </div>

            <p className="text-sm leading-relaxed text-[#3E3730]">
              « Bienvenue à <strong>{meta?.name}</strong>. Vos réserves ne baissent pas ici. Pensez à liquider vos trouvailles avant de redescendre. »
            </p>

            <div className="rounded-lg border border-[#1E1B18]/15 bg-[#EFE8DA] p-3 text-xs text-[#3E3730]">
              <div className="flex items-center justify-between">
                <span>Bourse actuelle</span>
                <span className="font-mono-num font-bold">{gold} or</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Trésors en sac</span>
                <span className="font-mono-num">
                  {treasures.length} ({totalSell} or)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {treasures.length > 0 && (
                <button
                  type="button"
                  onClick={() => onInnService({ type: 'sell_all_treasures' })}
                  className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] transition-colors hover:bg-[#38312B] ${focusBtnClass}`}
                >
                  Vendre tout le butin (+{totalSell} or)
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 ${focusBtnClass}`}
              >
                Fermer
              </button>
            </div>
          </div>
        );
      }

      case 'inn_market': {
        const m = CONFIG.MARKET;
        const sellable = state.bag;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">Étal d’approvisionnement</p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">Marché du refuge</h3>
              </div>
              <span className="font-mono-num text-sm font-bold text-[#9A5B13]">
                {gold} or · Sac {state.bag.length}/{CONFIG.PORTAGE}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-xs font-semibold text-[#6B5E52]">Recharger les réserves</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={gold < m.oilPack.price}
                  onClick={() => onInnService({ type: 'buy_oil' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">+{m.oilPack.amount} Huile</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">{m.oilPack.price} or</div>
                </button>
                <button
                  type="button"
                  disabled={gold < m.waterPack.price}
                  onClick={() => onInnService({ type: 'buy_water' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">+{m.waterPack.amount} Eau</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">{m.waterPack.price} or</div>
                </button>
                <button
                  type="button"
                  disabled={gold < m.foodPack.price}
                  onClick={() => onInnService({ type: 'buy_food' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">+{m.foodPack.amount} Vivres</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">{m.foodPack.price} or</div>
                </button>
              </div>

              <p className="pt-2 text-xs font-semibold text-[#6B5E52]">Équipement de sac</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={gold < m.rationItem.price || state.bag.length >= CONFIG.PORTAGE}
                  onClick={() => onInnService({ type: 'buy_ration' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">Ration sèche</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">{m.rationItem.price} or</div>
                </button>
                <button
                  type="button"
                  disabled={gold < m.waterskinItem.price || state.bag.length >= CONFIG.PORTAGE}
                  onClick={() => onInnService({ type: 'buy_waterskin' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">Gourde scellée</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">
                    {m.waterskinItem.price} or
                  </div>
                </button>
                <button
                  type="button"
                  disabled={gold < m.trapItem.price || state.bag.length >= CONFIG.PORTAGE}
                  onClick={() => onInnService({ type: 'buy_trap' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">Piège pliant</div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">{m.trapItem.price} or</div>
                </button>
                <button
                  type="button"
                  disabled={gold < m.markerPack.price}
                  onClick={() => onInnService({ type: 'buy_markers' })}
                  className={`min-h-[44px] rounded-lg border border-[#1E1B18]/20 bg-[#EFE8DA] px-3 py-2 text-left transition-colors hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
                >
                  <div className="font-semibold text-[#1E1B18]">
                    Lot de {m.markerPack.amount} repères
                  </div>
                  <div className="font-mono-num text-xs text-[#6B5E52]">
                    {m.markerPack.price} or (pile de 4)
                  </div>
                </button>
              </div>

              {sellable.length > 0 && (
                <div className="pt-2">
                  <p className="mb-1.5 text-xs font-semibold text-[#6B5E52]">Vendre depuis le sac</p>
                  <div className="flex flex-wrap gap-2">
                    {sellable.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onInnService({ type: 'sell_item', itemId: item.id })}
                        className={`min-h-[40px] rounded-lg border border-[#1E1B18]/20 bg-white/70 px-3 py-1.5 text-xs font-medium text-[#1E1B18] hover:bg-white ${focusBtnClass}`}
                      >
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''} (+{item.sellValue} or)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[40px] rounded-lg border border-[#1E1B18]/30 px-4 py-1.5 text-xs font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Quitter l’étal
              </button>
            </div>
          </div>
        );
      }

      case 'inn_tavern': {
        const meta = floor?.innMeta;
        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">Table des rumeurs & contrats</p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">Coin Taverne</h3>
            </div>
            <blockquote className="rounded-lg border border-[#1E1B18]/15 bg-[#EFE8DA] p-3 text-sm italic text-[#3E3730]">
              « {meta?.rumor ?? 'Les héros descendent vite quand la chandelle tremble.'} »
            </blockquote>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={state.ally !== null || gold < 4}
                onClick={() => onInnService({ type: 'hire_tavern_ally' })}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#38312B] disabled:opacity-45 ${focusBtnClass}`}
              >
                {state.ally
                  ? `Allié déjà actif (${state.ally.name})`
                  : 'Recruter Biscuit le Rat-Portier (4 or)'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Quitter la table
              </button>
            </div>
          </div>
        );
      }

      case 'inn_dormitory': {
        const price = CONFIG.MARKET.dormitoryPrice;
        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">Couchettes numérotées</p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">Dortoir du refuge</h3>
            </div>
            <p className="text-sm text-[#3E3730]">
              Un matelas de paille réglementaire pour restaurer vos PV à{' '}
              <span className="font-mono-num font-semibold">
                {CONFIG.MAX_HP}/{CONFIG.MAX_HP}
              </span>{' '}
              (actuel : <span className="font-mono-num">{state.resources.hp.toFixed(1)}</span>).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={gold < price || state.resources.hp >= CONFIG.MAX_HP}
                onClick={() => onInnService({ type: 'dormitory' })}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#38312B] disabled:opacity-45 ${focusBtnClass}`}
              >
                Se reposer ({price} or)
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Annuler
              </button>
            </div>
          </div>
        );
      }

      case 'npc': {
        const npcId = state.modal.npcId;
        const npc = floor?.npcs.find((n) => n.id === npcId);
        if (!npc) return null;

        const payBenefit =
          npc.kind === 'rat_percepteur'
            ? '+4 huile'
            : npc.kind === 'squelette_concierge'
            ? 'Révèle la carte et les pièges'
            : '+3 eau';

        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">{npc.role}</p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">{npc.name}</h3>
              </div>
              <span className="font-mono-num text-xs font-semibold text-[#9A5B13]">
                {gold} or
              </span>
            </div>

            <p className="text-sm text-[#3E3730]">
              {npc.talked
                ? npc.rumor
                : 'L’habitant vous observe prudemment depuis l’ombre. Quelle approche choisissez-vous ?'}
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={npc.paid || gold < npc.bribeCost}
                onClick={() => onNpcChoice(npc.id, 'pay')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3 py-2 text-left text-sm hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">Payer ({npc.bribeCost} or)</div>
                <div className="text-xs text-[#6B5E52]">{npc.paid ? 'Déjà payé' : payBenefit}</div>
              </button>

              <button
                type="button"
                onClick={() => onNpcChoice(npc.id, 'talk')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3 py-2 text-left text-sm hover:bg-[#E5DCC9] ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">Parler</div>
                <div className="text-xs text-[#6B5E52]">Obtenir rumeur ou indice</div>
              </button>

              <button
                type="button"
                disabled={gold < npc.recruitCost}
                onClick={() => onNpcChoice(npc.id, 'recruit')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-3 py-2 text-left text-sm hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">
                  Recruter ({npc.recruitCost} or)
                </div>
                <div className="text-xs text-[#6B5E52]">
                  {state.ally ? 'Remplacera votre allié actuel' : 'S’interpose face à un héros'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNpcChoice(npc.id, 'flee')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/25 bg-white/70 px-3 py-2 text-left text-sm hover:bg-white ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">Fuir</div>
                <div className="text-xs text-[#6B5E52]">Reculer d’une case</div>
              </button>
            </div>
          </div>
        );
      }

      case 'feature': {
        const { x, y } = state.modal;
        const feat = floor?.tiles[y]?.[x]?.feature;
        if (!feat) return null;

        let title = 'Découverte';
        let desc = '';
        let actionLabel = 'Agir';

        if (feat.kind === 'chest') {
          title = 'Coffre verrouillé';
          desc =
            'Peut contenir de l’or et des trésors à revendre, mais l’ouverture fait du bruit et certains coffres sont piégés.';
          actionLabel = 'Forcer le coffre (1 tour)';
        } else if (feat.kind === 'mushroom') {
          const color = feat.mushroomColor ?? 'ocre';
          const known = state.discoveredMushrooms[color];
          title = `Champignon ${color}`;
          desc = known
            ? `Variété identifiée durant cette expédition : effet ${known}.`
            : 'Effet inconnu pour cette partie : peut nourrir, intoxiquer ou troubler vos sens.';
          actionLabel = 'Manger le champignon';
        } else if (feat.kind === 'corpse') {
          title = 'Dépouille d’aventurier';
          desc =
            'Contient souvent vivres et parfois huile, mais le charognage fait du bruit et peut attirer des vermines.';
          actionLabel = 'Fouiller la dépouille';
        } else if (feat.kind === 'well') {
          title = 'Puits souterrain';
          desc = `Qualité apparente : ${feat.waterQuality ?? 'trouble'}. Permet de recharger votre réserve d’eau.`;
          actionLabel = 'Puiser et boire';
        } else if (feat.kind === 'puddle') {
          title = 'Flaque stagnante';
          desc = `Qualité apparente : ${feat.waterQuality ?? 'douteuse'}. Utile en urgence mais risque de maux de ventre.`;
          actionLabel = 'Boire à la flaque';
        }

        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">Inspection de terrain</p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">{title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-[#3E3730]">{desc}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFeatureChoice(x, y, 'confirm')}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#38312B] ${focusBtnClass}`}
              >
                {actionLabel}
              </button>
              <button
                type="button"
                onClick={() => onFeatureChoice(x, y, 'leave')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Laisser
              </button>
            </div>
          </div>
        );
      }

      case 'pit_winch': {
        const winchUsed = floor?.winchUsed ?? false;
        const canHoistDescend = state.resources.oil >= 1;
        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">Installation du Grand Puits</p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                Treuil & monte-charge douteux
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[#3E3730]">
              Des chaînes graissées à la hâte plongent dans le vide. L’engrenage fera un vacarme d’enfer dans tout l’abîme si vous l’actionnez.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={winchUsed}
                onClick={() => onPitWinchChoice('salvage')}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/25 bg-[#EFE8DA] px-4 py-2 text-left text-sm hover:bg-[#E5DCC9] disabled:opacity-45 ${focusBtnClass}`}
              >
                <div className="font-semibold text-[#1E1B18]">
                  {winchUsed ? 'Câble déjà remonté à vide' : 'Tirer la chaîne du puits (+3 or, +2 huile)'}
                </div>
                <div className="text-xs text-[#6B5E52]">
                  Bruit très élevé · peut attirer un Héros
                </div>
              </button>

              <button
                type="button"
                disabled={!canHoistDescend}
                onClick={() => onPitWinchChoice('descend')}
                className={`min-h-[44px] rounded-lg bg-[#1E1B18] px-4 py-2 text-left text-sm text-[#F4EFE6] hover:bg-[#38312B] disabled:opacity-45 ${focusBtnClass}`}
              >
                <div className="font-semibold">
                  Emprunter la nacelle vers le bas (-1 huile)
                </div>
                <div className="text-xs text-[#D6D3D1]">
                  Saute 1 à 2 étages directement le long du Puits
                </div>
              </button>

              <button
                type="button"
                onClick={() => onPitWinchChoice('leave')}
                className={`min-h-[40px] rounded-lg border border-[#1E1B18]/30 px-4 py-1.5 text-xs font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Laisser (Échap)
              </button>
            </div>
          </div>
        );
      }

      case 'bag': {
        const pending = state.modal.pendingPickup;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">Inventaire limité</p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                  Sac de portage ({state.bag.length}/{CONFIG.PORTAGE})
                </h3>
              </div>
            </div>

            {pending && (
              <div className="rounded-lg border border-[#B8332F]/40 bg-[#B8332F]/10 p-3 text-xs text-[#7F1D1D]">
                Sac plein ! Choisissez un objet à utiliser ou abandonner pour emporter{' '}
                <strong>{pending.name}</strong>.
              </div>
            )}

            {state.bag.length === 0 ? (
              <p className="text-sm text-[#6B5E52]">Votre sac est actuellement vide.</p>
            ) : (
              <div className="space-y-2">
                {state.bag.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#1E1B18]/15 bg-[#EFE8DA] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1E1B18]">
                        {item.name}
                        {item.maxStack > 1 && (
                          <span className="font-mono-num ml-1.5 text-xs text-[#9A5B13]">
                            ({item.quantity}/{item.maxStack})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B5E52]">{item.description}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {item.consumable && (
                        <button
                          type="button"
                          onClick={() => onBagAction(item.id, 'use')}
                          className={`min-h-[40px] rounded-md bg-[#1E1B18] px-3 py-1 text-xs font-semibold text-[#F4EFE6] hover:bg-[#38312B] ${focusBtnClass}`}
                        >
                          {item.kind === 'marker' ? 'Poser' : 'Utiliser'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onBagAction(item.id, 'drop')}
                        className={`min-h-[40px] rounded-md border border-[#1E1B18]/25 px-2.5 py-1 text-xs font-medium text-[#1E1B18] hover:bg-[#1E1B18]/5 ${focusBtnClass}`}
                      >
                        Jeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[40px] rounded-lg border border-[#1E1B18]/30 px-4 py-1.5 text-xs font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Fermer (Échap)
              </button>
            </div>
          </div>
        );
      }

      case 'marker_place': {
        const presets = ['Sortie ▲', 'Descente ▼', 'Eau ici', 'Impasse', 'Danger'];
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (markerText.trim().length > 0) {
            onPlaceMarker(markerText);
          }
        };

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">
                Étage {state.depth} · Case ({state.player.x}, {state.player.y})
              </p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                Poser un repère à la craie
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-[#3E3730]">
              Inscrivez une note courte sur cette dalle. Elle restera lisible dans votre mémoire cartographique même sans huile.
            </p>

            <input
              ref={markerInputRef}
              type="text"
              maxLength={28}
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Ex : Vers l’escalier haut ->"
              className="min-h-[44px] w-full rounded-lg border border-[#1E1B18]/35 bg-white px-3 py-2 text-sm font-medium text-[#1E1B18] placeholder:text-[#9A8F82] focus:border-[#B8332F] focus:outline-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMarkerText(p)}
                  className={`min-h-[34px] rounded border border-[#1E1B18]/20 bg-[#EFE8DA] px-2.5 py-1 text-xs font-medium text-[#1E1B18] hover:bg-[#E5DCC9] ${focusBtnClass}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={markerText.trim().length === 0}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#38312B] disabled:opacity-45 ${focusBtnClass}`}
              >
                Tracer le repère
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Annuler
              </button>
            </div>
          </form>
        );
      }

      case 'map_overview': {
        if (!floor) return null;
        const markers: Array<{ x: number; y: number; text: string }> = [];
        for (let y = 0; y < floor.height; y++) {
          for (let x = 0; x < floor.width; x++) {
            const m = floor.tiles[y][x].marker;
            if (m) markers.push({ x, y, text: m.text });
          }
        }

        const cellSizePx = Math.max(8, Math.min(18, Math.floor(320 / floor.width)));

        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">
                  Étage {floor.depth} · {floor.width}×{floor.height}
                </p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                  Carte mémorisée
                </h3>
              </div>
              <span className="stamp-seal px-2 py-0.5 font-mono-num text-[10px] font-bold">
                RELEVÉ
              </span>
            </div>

            <div className="flex justify-center overflow-auto rounded-xl border border-[#1E1B18]/20 bg-[#121417] p-3">
              <div
                className="grid gap-[1px]"
                style={{
                  gridTemplateColumns: `repeat(${floor.width}, ${cellSizePx}px)`,
                }}
              >
                {floor.tiles.flatMap((row) =>
                  row.map((tile) => {
                    const isPlayer =
                      tile.x === state.player.x && tile.y === state.player.y;
                    const vis = floor.isInn ? 'visible' : tile.visibility;

                    let bg = '#0B0D10';
                    let glyph = '';
                    let textColor = '#F1EDE4';

                    if (vis !== 'unknown') {
                      if (tile.kind === 'pit') {
                        bg = '#050506';
                        textColor = '#6B5E52';
                        glyph = '·';
                      } else if (tile.kind === 'pit_bridge') {
                        bg = '#8C6239';
                        textColor = '#F4EFE6';
                        glyph = '≡';
                      } else if (tile.kind === 'pit_winch') {
                        bg = '#C87D20';
                        textColor = '#121417';
                        glyph = '⚙';
                      } else if (tile.kind === 'wall') {
                        bg = vis === 'visible' ? '#333B48' : '#21262F';
                      } else {
                        bg = vis === 'visible' ? '#1E2530' : '#151920';
                      }
                      if (tile.kind === 'stairs_up') {
                        bg = '#4D8B55';
                        glyph = '▲';
                      } else if (tile.kind === 'stairs_down') {
                        bg = '#E59A38';
                        textColor = '#121417';
                        glyph = '▼';
                      } else if (tile.marker) {
                        bg = '#B8332F';
                        glyph = '⚑';
                      } else if (
                        tile.feature &&
                        !tile.feature.consumed &&
                        tile.feature.revealed
                      ) {
                        if (tile.feature.kind === 'well' || tile.feature.kind === 'puddle') {
                          bg = '#3B82A6';
                        } else if (tile.feature.kind === 'chest') {
                          bg = '#B45309';
                        } else if (tile.feature.kind === 'trap' || tile.feature.kind === 'placed_trap') {
                          bg = '#7F1D1D';
                        }
                      }
                    }

                    if (isPlayer) {
                      bg = '#86EFAC';
                      textColor = '#121417';
                      glyph = '@';
                    }

                    return (
                      <div
                        key={`${tile.x}-${tile.y}`}
                        title={tile.marker?.text}
                        style={{
                          width: `${cellSizePx}px`,
                          height: `${cellSizePx}px`,
                          backgroundColor: bg,
                          color: textColor,
                          fontSize: `${Math.max(8, cellSizePx - 4)}px`,
                        }}
                        className="flex items-center justify-center font-mono-num font-bold leading-none"
                      >
                        {glyph}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B5E52]">
              <span>@ Vous · · Grand Puits · ≡ Passerelle · ▲ Montée · ▼ Descente · ⚑ Repère</span>
            </div>

            {markers.length > 0 && (
              <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-[#1E1B18]/15 bg-[#EFE8DA] p-2.5 text-xs">
                <p className="font-semibold text-[#1E1B18]">Repères sur cet étage :</p>
                {markers.map((m) => (
                  <div key={`${m.x}-${m.y}`} className="flex justify-between gap-2 text-[#3E3730]">
                    <span>⚑ « {m.text} »</span>
                    <span className="font-mono-num text-[#6B5E52]">
                      ({m.x}, {m.y})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[42px] rounded-lg bg-[#1E1B18] px-4 py-2 text-xs font-semibold text-[#F4EFE6] ${focusBtnClass}`}
              >
                Fermer la carte (Tab / Échap)
              </button>
            </div>
          </div>
        );
      }

      case 'camp_confirm': {
        const c = CONFIG.CAMP;
        const canCamp =
          state.resources.oil >= c.oilCost &&
          state.resources.food >= c.foodCost &&
          state.resources.water >= c.waterCost;

        return (
          <div className="space-y-4">
            <div className="border-b border-[#1E1B18]/15 pb-3 pr-8">
              <p className="font-mono-num text-xs text-[#6B5E52]">Repos d’urgence</p>
              <h3 className="font-display text-xl font-bold text-[#1E1B18]">Monter un bivouac</h3>
            </div>
            <p className="text-sm leading-relaxed text-[#3E3730]">
              Restaure <strong>+{c.hpHeal} PV</strong> au prix de{' '}
              <span className="font-mono-num">
                {c.oilCost} huile, {c.foodCost} vivre, {c.waterCost} eau
              </span>
              . La lueur risque d’attirer un héros si le secteur est bruyant.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canCamp}
                onClick={onConfirmCamp}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#1E1B18] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#38312B] disabled:opacity-45 ${focusBtnClass}`}
              >
                Camper maintenant
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Annuler
              </button>
            </div>
          </div>
        );
      }

      case 'vault_finale': {
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-[#1E1B18]/15 pb-3 pr-8">
              <div>
                <p className="font-mono-num text-xs text-[#6B5E52]">Fond du Grand Puits · -99</p>
                <h3 className="font-display text-xl font-bold text-[#1E1B18]">
                  Pupitre du Maître du Donjon
                </h3>
              </div>
              <span className="stamp-seal px-2 py-0.5 font-mono-num text-[11px] font-bold">
                -99 ATTEINT
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#3E3730]">
              Au pied des chaînes de quatre-vingt-dix-neuf étages, le Maître du Donjon lève à peine les yeux de ses feuillets. Un tampon vierge attend à côté du Grand Registre, sans révéler ce que vaut vraiment la Prophétie du Niveau 1.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onInnService({ type: 'stamp_99_victory' })}
                className={`min-h-[44px] flex-1 rounded-lg bg-[#B8332F] px-4 py-2 text-sm font-semibold text-[#F4EFE6] hover:bg-[#9E2A26] ${focusBtnClass}`}
              >
                Présenter son dossier (-99)
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`min-h-[44px] rounded-lg border border-[#1E1B18]/30 px-4 py-2 text-sm font-medium text-[#1E1B18] ${focusBtnClass}`}
              >
                Observer encore
              </button>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={containerRef}
        className="paper-surface relative w-full max-w-lg rounded-2xl border border-[#C9BFA9] p-5 shadow-2xl"
      >
        <button
          type="button"
          data-close-x="true"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg text-[#6B5E52] transition-colors hover:bg-[#1E1B18]/10 hover:text-[#1E1B18]"
        >
          <X className="h-5 w-5" />
        </button>
        {renderBody()}
      </div>
    </div>
  );
};
