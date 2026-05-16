import { PlayerCore, PlayerModule } from "../core/PlayerCore";
import { BullState, BullModifier } from "../moduleTypes/Bull.types";
import { ModifierModule } from "./modifiers";

export type BullModule = PlayerModule & {
  key: "bull";
  state: BullState;
  modifiers: BullModifier[];
  addCharge(amount: number): { progressed: number; becameReady: boolean };
  removeCharge(amount: number): { reduced: number; lostReady: boolean };
  fail(): { fromReady: boolean; progressed: number };
  consume(): { consumed: boolean };
  applyModifier(mod: BullModifier): void;
  tickShift(): void;
  getState(): BullState;
  getEnergyCap(): number;
};

export function createBullModule(): BullModule {
  let player: PlayerCore | undefined;

  const state: BullState = {
    level: 1,
    energy: 0,
    threshold: 100,
    ready: false,
    step: 25,
    cooldownShifts: 0,
  };

  const modifiers: BullModifier[] = [];
  const getModifierModule = () => player?.tryGet<ModifierModule>("modifiers");

  function energyCap() {
    return getModifierModule()?.resolveNumber("bull.cap", state.threshold, { playerId: player?.identity.id ?? -1 }) ?? state.threshold;
  }

  function addCharge(amount: number): { progressed: number; becameReady: boolean } {
    if (state.cooldownShifts && state.cooldownShifts > 0) return { progressed: 0, becameReady: false };
    if (state.ready) return { progressed: 0, becameReady: false };
    const mult = getModifierModule()?.resolveNumber("bull.charge", amount, { playerId: player?.identity.id ?? -1 }) ?? amount;
    const delta = Math.max(0, Math.floor(mult));
    if (delta === 0) return { progressed: 0, becameReady: false };
    const prevEnergy = state.energy;
    state.energy = Math.min(energyCap(), state.energy + delta);
    const becameReady = state.energy >= energyCap();
    if (becameReady) state.ready = true;
    const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
    const applied = state.energy - prevEnergy;
    console.log(`[BULL] ${name} charge ${applied >= 0 ? "+" : ""}${applied}, energy=${state.energy}/${energyCap()}`);
    return { progressed: delta, becameReady };
  }

  function fail(): { fromReady: boolean; progressed: number } {
    const step = Math.max(1, Math.floor(getModifierModule()?.resolveNumber("bull.step", state.step, { playerId: player?.identity.id ?? -1 }) ?? state.step));
    const prevEnergy = state.energy;
    let fromReady = false;
    if (state.ready) {
      state.energy = Math.max(0, state.threshold - step);
      state.ready = false;
      fromReady = true;
    } else {
      state.energy = Math.max(0, state.energy - step);
    }
    const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
    const applied = state.energy - prevEnergy;
    console.log(`[BULL] ${name} fail ${applied >= 0 ? "+" : ""}${applied}, energy=${state.energy}/${energyCap()}`);
    return { fromReady, progressed: step };
  }

  function removeCharge(amount: number): { reduced: number; lostReady: boolean } {
    const delta = Math.max(0, Math.floor(amount));
    if (delta === 0) return { reduced: 0, lostReady: false };
    const prevEnergy = state.energy;
    const cap = energyCap();
    const wasReady = state.ready;
    state.energy = Math.max(0, state.energy - delta);
    if (state.energy < cap) state.ready = false;
    const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
    const applied = prevEnergy - state.energy;
    console.log(`[BULL] ${name} charge -${applied}, energy=${state.energy}/${cap}`);
    return { reduced: applied, lostReady: wasReady && !state.ready };
  }

  function consume(): { consumed: boolean } {
    if (!state.ready) return { consumed: false };
    const prevEnergy = state.energy;
    state.energy = 0;
    state.ready = false;
    const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
    const applied = state.energy - prevEnergy;
    console.log(`[BULL] ${name} consume ${applied}, energy=${state.energy}/${energyCap()}`);
    return { consumed: true };
  }

  const mod: BullModule = {
    key: "bull",
    state,
    modifiers,
    onAttach(p) { player = p; },
    addCharge,
    removeCharge,
    fail,
    consume,
    applyModifier() {
      // Bull modifiers are centralized in the shared modifier module.
    },
    tickShift() {
      if (state.cooldownShifts && state.cooldownShifts > 0) state.cooldownShifts -= 1;
    },
    getState() {
      return { ...state };
    },
    getEnergyCap() {
      return energyCap();
    },
  };

  return mod;
}
