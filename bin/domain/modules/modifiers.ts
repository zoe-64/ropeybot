import { PlayerCore, PlayerModule } from "../core/PlayerCore";
import {
  ModifierDefinition,
  ModifierQuery,
  ModifierResolveContext,
} from "../moduleTypes/Modifier.types";
import { SkillEffect } from "../skills/Skill.types";

export type ModifierModule = PlayerModule & {
  key: "modifiers";
  state: { active: ModifierDefinition[] };
  add(modifier: ModifierDefinition): void;
  addMany(modifiers: ModifierDefinition[]): void;
  list(query?: ModifierQuery): ModifierDefinition[];
  has(query: ModifierQuery): boolean;
  getUsesBySource(sourceIdPrefix: string): Map<string, number | undefined>;
  removeBySource(sourceId: string): void;
  removeBySourcePrefix(sourceIdPrefix: string): void;
  extendBySource(sourceId: string, amount: number): void;
  tickShift(): void;
  resolveNumber(target: ModifierDefinition["target"], base: number, ctx: ModifierResolveContext): number;
  resolveEffects(target: ModifierDefinition["target"], effects: SkillEffect[], ctx: ModifierResolveContext): SkillEffect[];
  consumeUses(ctx: ModifierResolveContext): void;
};

function matchesQuery(modifier: ModifierDefinition, query?: ModifierQuery): boolean {
  if (!query) return true;
  if (query.sourceId != null && modifier.sourceId !== query.sourceId) return false;
  if (query.sourceIdPrefix != null && !modifier.sourceId.startsWith(query.sourceIdPrefix)) return false;
  if (query.target != null && modifier.target !== query.target) return false;
  return true;
}

function matchesFilters(modifier: ModifierDefinition, ctx: ModifierResolveContext): boolean {
  const filters = modifier.filters;
  if (!filters) return true;
  if (filters.skillWhitelist?.length && (!ctx.skillName || !filters.skillWhitelist.includes(ctx.skillName))) return false;
  if (filters.skillBlacklist?.length && ctx.skillName && filters.skillBlacklist.includes(ctx.skillName)) return false;
  if (filters.actionTypes?.length && (!ctx.actionType || !filters.actionTypes.includes(ctx.actionType))) return false;
  if (filters.outcomes?.length && (!ctx.outcome || !filters.outcomes.includes(ctx.outcome))) return false;
  return true;
}

function cloneModifier(modifier: ModifierDefinition): ModifierDefinition {
  return {
    ...modifier,
    duration: { ...modifier.duration },
    filters: modifier.filters ? { ...modifier.filters } : undefined,
    meta: modifier.meta ? { ...modifier.meta } : undefined,
  };
}

export function createModifierModule(): ModifierModule {
  let player: PlayerCore | undefined;
  const state: ModifierModule["state"] = { active: [] };

  const mod: ModifierModule = {
    key: "modifiers",
    state,
    onAttach(p) { player = p; },
    add(modifier) {
      state.active.push(cloneModifier(modifier));
    },
    addMany(modifiers) {
      for (const modifier of modifiers) this.add(modifier);
    },
    list(query) {
      return state.active.filter((modifier) => matchesQuery(modifier, query)).map(cloneModifier);
    },
    has(query) {
      return state.active.some((modifier) => matchesQuery(modifier, query));
    },
    getUsesBySource(sourceIdPrefix) {
      return new Map(
        state.active
          .filter((modifier) => modifier.sourceId.startsWith(sourceIdPrefix))
          .map((modifier) => [
            modifier.sourceId,
            modifier.duration.type === "uses" ? modifier.duration.remaining : undefined,
          ]),
      );
    },
    removeBySource(sourceId) {
      state.active = state.active.filter((modifier) => modifier.sourceId !== sourceId);
    },
    removeBySourcePrefix(sourceIdPrefix) {
      state.active = state.active.filter((modifier) => !modifier.sourceId.startsWith(sourceIdPrefix));
    },
    extendBySource(sourceId, amount) {
      if (amount <= 0) return;
      for (const modifier of state.active) {
        if (modifier.sourceId !== sourceId) continue;
        if (modifier.duration.type === "uses" || modifier.duration.type === "shifts") {
          modifier.duration.remaining += amount;
        }
      }
    },
    tickShift() {
      const kept: ModifierDefinition[] = [];
      for (const modifier of state.active) {
        if (modifier.duration.type === "shifts") {
          const remaining = modifier.duration.remaining - 1;
          if (remaining > 0) kept.push({ ...modifier, duration: { ...modifier.duration, remaining } });
          continue;
        }
        kept.push(modifier);
      }
      state.active = kept;
    },
    resolveNumber(target, base, ctx) {
      let value = base;
      for (const modifier of state.active) {
        if (modifier.target !== target || !matchesFilters(modifier, ctx)) continue;
        if (modifier.operation.type === "mult") value = Math.floor(value * modifier.operation.value);
        if (modifier.operation.type === "add") value += modifier.operation.value;
      }
      return value;
    },
    resolveEffects(target, effects, ctx) {
      let resolved = effects.slice();
      for (const modifier of state.active) {
        if (modifier.target !== target || !matchesFilters(modifier, ctx)) continue;
        const operation = modifier.operation;
        if (operation.type !== "transformEffect") continue;
        resolved = resolved
          .map((effect) => operation.transformEffect(effect, {
            playerId: player?.identity.id ?? ctx.playerId,
            player,
            skillName: ctx.skillName,
          }))
          .filter((effect): effect is SkillEffect => effect != null);
      }
      return resolved;
    },
    consumeUses(ctx) {
      const kept: ModifierDefinition[] = [];
      for (const modifier of state.active) {
        if (modifier.duration.type === "uses" && modifier.duration.consumeOn === "skillUse" && matchesFilters(modifier, ctx)) {
          const remaining = modifier.duration.remaining - 1;
          if (remaining > 0) kept.push({ ...modifier, duration: { ...modifier.duration, remaining } });
          continue;
        }
        kept.push(modifier);
      }
      state.active = kept;
    },
  };

  return mod;
}
