import type { PlayerCore } from "../core/PlayerCore";
import { SkillEffect } from "../skills/Skill.types";

export type ModifierTarget =
  | "skill.energy"
  | "skill.reward"
  | "skill.effect"
  | "shift.scoreBonus"
  | "shift.energyBonus"
  | "shift.xpBonus"
  | "xp.gain"
  | "economy.payout"
  | "energy.recovery"
  | "quality.delta"
  | "quality.score"
  | "bull.charge"
  | "bull.cap"
  | "bull.step";

export type ModifierDuration =
  | { type: "uses"; remaining: number; consumeOn?: "skillUse" }
  | { type: "shifts"; remaining: number }
  | { type: "manual" };

export type ModifierFilters = {
  skillWhitelist?: string[];
  skillBlacklist?: string[];
  actionTypes?: string[];
  success?: boolean;
  failure?: boolean;
};

export type ModifierNumericOperation =
  | { type: "add"; value: number }
  | { type: "mult"; value: number };

export type ModifierTransformOperation = {
  type: "transformEffect";
  transformEffect(
    effect: SkillEffect,
    ctx: { playerId: number; player?: PlayerCore; skillName?: string }
  ): SkillEffect | null;
};

export type ModifierOperation = ModifierNumericOperation | ModifierTransformOperation;

export type ModifierDefinition = {
  id: string;
  sourceType: "skill" | "song" | "event" | "system";
  sourceId: string;
  ownerPlayerId?: number;
  target: ModifierTarget;
  operation: ModifierOperation;
  duration: ModifierDuration;
  filters?: ModifierFilters;
  meta?: Record<string, unknown>;
};

export type ModifierQuery = {
  sourceId?: string;
  sourceIdPrefix?: string;
  target?: ModifierTarget;
};

export type ModifierResolveContext = {
  playerId: number;
  skillName?: string;
  actionType?: string;
  success?: boolean;
};
