import { PlayerCore, PlayerModule } from "../core/PlayerCore";
import { DomainEvent } from "../ports/DomainEvenPort";
import { SkillOutcome } from "../skills/Skill.types";
import { ModifierModule } from "./modifiers";

export type OutcomeChances = { positive: number; negative: number };

export type QualityModifier = {
  add?: number;
  mult?: number;
  successAdd?: number;
  failAdd?: number;
  successMult?: number;
  failMult?: number;
  clampMin?: number;
  clampMax?: number;
  remainingShifts?: number;
  sourceId?: string;
};

export type QualityModule = PlayerModule & {
  key: "quality";
  state: { qualityScore: number };
  getQualityScore(): number;
  getNormalizedQuality(): number;
  getQuality(): number;
  setQualityScore(value: number): void;
  reduceQualityByHalf(): void;
  adjustQuality(amount: number): void;
  isQualityAbove(threshold: number): boolean;
  resetQuality(value?: number): void;
  qualityScoreToOutcomeSmooth(): OutcomeChances;
  triggerRandomOutcome(): "positive" | "negative" | "none";
  tickShift(): void;
  applyProductionDecay(shiftProduction: number): number;
};

export function createQualityModule(initialQuality = 50): QualityModule {
  let player: PlayerCore | undefined;
  const unsubscribers: Array<() => void> = [];

  const state = { qualityScore: Math.max(0, initialQuality) };

  const getModifiers = () => player?.tryGet<ModifierModule>("modifiers");
  const getEffectiveScore = () => getModifiers()?.resolveNumber("quality.score", state.qualityScore, { playerId: player?.identity.id ?? -1 }) ?? state.qualityScore;

  const logQualityChange = (delta: number, newValue: number, reason?: string) => {
    const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
    const suffix = reason ? ` reason=${reason}` : "";
    console.log(`[QUALITY] ${name} delta=${delta >= 0 ? "+" : ""}${delta} total=${newValue}${suffix}`);
  };

  const mod: QualityModule = {
    key: "quality",
    state,
    onAttach(p) {
      player = p;
      const bus = player.ctx.bus;
      unsubscribers.push(bus.subscribe("player:skill.used", (evt: DomainEvent) => {
        if (!player) return;
        const payload = evt.payload as { playerId: number; outcome?: SkillOutcome; skillName?: string };
        if (payload?.playerId !== player.identity.id) return;
        const outcome = payload.outcome ?? "success";
        const baseDelta = outcome === "fail" ? -5 : outcome === "critical" ? 10 : 5;
        const scaled = getModifiers()?.resolveNumber("quality.delta", baseDelta, {
          playerId: player.identity.id,
          actionType: "skillUse",
          skillName: payload.skillName,
          outcome,
        }) ?? baseDelta;
        mod.adjustQuality(scaled);
      }));

      unsubscribers.push(bus.subscribe("player:climax.orgasm", (evt: DomainEvent) => {
        if (!player) return;
        const payload = evt.payload as { playerId?: number; bullState?: { ready?: boolean } };
        if (payload?.playerId !== player.identity.id) return;
        const ready = payload?.bullState?.ready ?? false;
        if (ready) {
          mod.adjustQuality(50);
        } else {
          mod.reduceQualityByHalf();
        }
      }));

      unsubscribers.push(bus.subscribe("player:climax.resist", (evt: DomainEvent) => {
        if (!player) return;
        const payload = evt.payload as { playerId?: number };
        if (payload?.playerId !== player.identity.id) return;
        mod.adjustQuality(5);
      }));
    },
    onDetach() {
      while (unsubscribers.length) {
        const unsubscribe = unsubscribers.pop();
        try { unsubscribe?.(); } catch { /* ignore */ }
      }
    },
    getQualityScore() { return getEffectiveScore(); },
    getNormalizedQuality() { return Math.round(getEffectiveScore()); },
    getQuality() { return getEffectiveScore() / 100; },
    setQualityScore(value: number) {
      const newScore = Math.max(0, value);
      const delta = newScore - state.qualityScore;
      state.qualityScore = newScore;
      logQualityChange(delta, state.qualityScore, "setQualityScore");
    },
    reduceQualityByHalf() {
      const newScore = Math.max(0, state.qualityScore / 2);
      const delta = newScore - state.qualityScore;
      state.qualityScore = newScore;
      logQualityChange(delta, state.qualityScore, "reduceQualityByHalf");
    },
    adjustQuality(amount: number) {
      const newScore = Math.max(0, state.qualityScore + amount);
      const delta = newScore - state.qualityScore;
      state.qualityScore = newScore;
      logQualityChange(delta, state.qualityScore, "adjustQuality");
    },
    isQualityAbove(threshold: number) { return getEffectiveScore() > threshold; },
    resetQuality(value: number = 100) {
      const newScore = Math.max(0, value);
      const delta = newScore - state.qualityScore;
      state.qualityScore = newScore;
      logQualityChange(delta, state.qualityScore, "resetQuality");
    },
    qualityScoreToOutcomeSmooth(): OutcomeChances {
      const effective = getEffectiveScore();
      const steepness = 0.05;
      const midpoint = 75;
      const positive = 100 / (1 + Math.exp(-steepness * (effective - midpoint)));
      const negative = 100 - positive;
      return { positive, negative };
    },
    triggerRandomOutcome(): "positive" | "negative" | "none" {
      const { positive, negative } = mod.qualityScoreToOutcomeSmooth();
      const total = positive + negative;
      const posNorm = (positive / total) * 100;
      const negNorm = (negative / total) * 100;
      const roll = Math.random() * 100;
      if (roll < posNorm) return "positive";
      if (roll < posNorm + negNorm) return "negative";
      return "none";
    },
    tickShift() {
      // Shift-based quality modifiers are aged by the shared modifier module.
    },
    applyProductionDecay(shiftProduction: number) {
      const prod = Math.max(0, shiftProduction);
      const decay = Math.round(Math.min(20, Math.max(5, 5 + 15 * (prod / 25))));
      mod.adjustQuality(-decay);
      if (player) {
        player.ctx.bus.publish({
          type: "facility:message.whisper",
          payload: { playerId: player.identity.id, text: `(Quality decayed by ${decay} due to last shift production ${prod.toFixed(2)})` },
        });
        console.log(`[QUALITY] Player ${player.identity.id} prod=${prod.toFixed(2)} decay=${decay}`);
      }
      return decay;
    },
  };

  return mod;
}
