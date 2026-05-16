import { BullModifier } from "../../domain/moduleTypes/Bull.types";
import { ModifierDefinition } from "../../domain/modifiers/Modifier.types";
import { QualityModifier } from "../../domain/modules/quality";
import { AnyModifier } from "../../domain/skills/Skill.types";
import { StatDelta } from "./config";

function skillFilters(modifier: AnyModifier) {
  return {
    skillWhitelist: modifier.skillWhitelist,
    skillBlacklist: modifier.skillBlacklist,
    actionTypes: ["skillUse"],
  };
}

export function fromSkillModifier(
  modifier: AnyModifier,
  args: { id: string; sourceType: ModifierDefinition["sourceType"]; sourceId: string; ownerPlayerId?: number }
): ModifierDefinition[] {
  const duration = modifier.usesRemaining != null
    ? { type: "uses" as const, remaining: modifier.usesRemaining, consumeOn: "skillUse" as const }
    : { type: "manual" as const };
  const defs: ModifierDefinition[] = [];

  if (modifier.energyCostMultiplier != null) {
    defs.push({
      id: `${args.id}:energy`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "skill.energy",
      operation: { type: "mult", value: modifier.energyCostMultiplier },
      duration,
      filters: skillFilters(modifier),
    });
  }
  if (modifier.rewardMultiplier != null) {
    defs.push({
      id: `${args.id}:reward`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "skill.reward",
      operation: { type: "mult", value: modifier.rewardMultiplier },
      duration,
      filters: skillFilters(modifier),
    });
  }
  if (modifier.transformEffect) {
    defs.push({
      id: `${args.id}:effect`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "skill.effect",
      operation: {
        type: "transformEffect",
        transformEffect: (effect, ctx) => {
          if (!ctx.player || !ctx.skillName) return effect;
          return modifier.transformEffect!(effect, { player: ctx.player, skillName: ctx.skillName });
        },
      },
      duration,
      filters: skillFilters(modifier),
    });
  }

  return defs;
}

export function fromStatDelta(
  stat: StatDelta,
  args: { id: string; sourceType: ModifierDefinition["sourceType"]; sourceId: string; ownerPlayerId?: number }
): ModifierDefinition[] {
  const target = stat.target === "xp"
    ? "xp.gain"
    : stat.target === "economy"
      ? "economy.payout"
      : stat.target === "energy"
        ? "energy.recovery"
        : null;
  if (!target) return [];

  return [{
    id: args.id,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    ownerPlayerId: args.ownerPlayerId,
    target,
    operation: stat.op === "mult" ? { type: "mult", value: stat.value } : { type: "add", value: stat.value },
    duration: { type: "shifts", remaining: stat.remainingShifts },
  }];
}

export function fromQualityModifier(
  modifier: QualityModifier,
  args: { id: string; sourceType: ModifierDefinition["sourceType"]; sourceId: string; ownerPlayerId?: number; remainingShifts?: number }
): ModifierDefinition[] {
  const remaining = args.remainingShifts ?? modifier.remainingShifts;
  const duration = remaining != null ? { type: "shifts" as const, remaining } : { type: "manual" as const };
  const defs: ModifierDefinition[] = [];

  if (modifier.add != null) {
    defs.push({
      id: `${args.id}:score:add`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.score",
      operation: { type: "add", value: modifier.add },
      duration,
    });
  }
  if (modifier.mult != null) {
    defs.push({
      id: `${args.id}:score:mult`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.score",
      operation: { type: "mult", value: modifier.mult },
      duration,
    });
  }
  if (modifier.successAdd != null) {
    defs.push({
      id: `${args.id}:delta:success:add`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.delta",
      operation: { type: "add", value: modifier.successAdd },
      duration,
      filters: { success: true, actionTypes: ["skillUse"] },
    });
  }
  if (modifier.failAdd != null) {
    defs.push({
      id: `${args.id}:delta:fail:add`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.delta",
      operation: { type: "add", value: modifier.failAdd },
      duration,
      filters: { failure: true, actionTypes: ["skillUse"] },
    });
  }
  if (modifier.successMult != null) {
    defs.push({
      id: `${args.id}:delta:success:mult`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.delta",
      operation: { type: "mult", value: modifier.successMult },
      duration,
      filters: { success: true, actionTypes: ["skillUse"] },
    });
  }
  if (modifier.failMult != null) {
    defs.push({
      id: `${args.id}:delta:fail:mult`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "quality.delta",
      operation: { type: "mult", value: modifier.failMult },
      duration,
      filters: { failure: true, actionTypes: ["skillUse"] },
    });
  }

  return defs;
}

export function fromBullModifier(
  modifier: BullModifier,
  args: { id: string; sourceType: ModifierDefinition["sourceType"]; sourceId: string; ownerPlayerId?: number; remainingShifts?: number }
): ModifierDefinition[] {
  const remaining = args.remainingShifts ?? modifier.remainingShifts;
  const duration = remaining != null ? { type: "shifts" as const, remaining } : { type: "manual" as const };
  const defs: ModifierDefinition[] = [];

  if (modifier.chargeMultiplier != null) {
    defs.push({
      id: `${args.id}:charge`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "bull.charge",
      operation: { type: "mult", value: modifier.chargeMultiplier },
      duration,
    });
  }
  if (modifier.energyMaxBonus != null) {
    defs.push({
      id: `${args.id}:cap`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "bull.cap",
      operation: { type: "add", value: modifier.energyMaxBonus },
      duration,
    });
  }
  if (modifier.stepMultiplier != null) {
    defs.push({
      id: `${args.id}:step`,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      ownerPlayerId: args.ownerPlayerId,
      target: "bull.step",
      operation: { type: "mult", value: modifier.stepMultiplier },
      duration,
    });
  }

  return defs;
}
