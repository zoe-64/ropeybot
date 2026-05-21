import { PlayerCore, PlayerModule } from "../core/PlayerCore";
import { ModifierDefinition } from "../moduleTypes/Modifier.types";
import { BullModifier } from "../moduleTypes/Bull.types";
import { ModifierModule } from "../modules/modifiers";
import { QualityModifier } from "../modules/quality";
import { AnyModifier } from "../skills/Skill.types";
import { fromBullModifier, fromQualityModifier, fromSkillModifier } from "../../games/facility/modifierHelpers";

export type SongNoteColor = "white" | "purple" | "red" | "orange" | "green" | "lightBlue" | "gold";
export type SongNoteFamily = "self" | "drive" | "restore" | "guard" | "crown";
export type SongPhraseKind = "song" | "melody" | "aria";
export type SongVariant = "S" | "L" | "XL";

export type SongNoteDefinition = {
  family: SongNoteFamily;
  tier: 0 | 1 | 2;
  label: string;
  icon: string;
  role: string;
};

export type SongNoteCatalog = Record<SongNoteColor, SongNoteDefinition>;

export type SongNote = {
  color: SongNoteColor;
  family: SongNoteFamily;
  icon: string;
  label: string;
  skillName: string;
  createdAt: number;
  power: number;
};

export type SongScope = "self" | "others";

export type SongRecipeVariant = {
  summary: string;
  durationShifts: number;
  skillModifiers?: { skillName?: string; modifier: AnyModifier; remainingShifts?: number }[];
  qualityModifiers?: { modifier: QualityModifier; remainingShifts?: number }[];
  bullModifiers?: { modifier: BullModifier; remainingShifts?: number }[];
  energyRestore?: number;
  bullCharge?: number;
  scoreBonus?: number;
  shiftScorePerLevel?: number;
  shiftEnergyPerLevel?: number;
  shiftXpBonus?: number;
  globalEventId?: string;
};

export type SongRecipe = {
  id: string;
  name: string;
  kind: SongPhraseKind;
  pattern: SongNoteFamily[];
  notePattern?: SongNoteColor[];
  scope: SongScope;
  requiresGold?: boolean;
  variants?: Partial<Record<SongVariant, SongRecipeVariant>>;
  ariaEffect?: SongRecipeVariant;
};

export type ResolvedSong = SongRecipeVariant & {
  id: string;
  name: string;
  kind: SongPhraseKind;
  scope: SongScope;
  variant?: SongVariant;
  pattern: SongNoteFamily[];
  notePattern?: SongNoteColor[];
};

export type ActiveSong = ResolvedSong & {
  remainingShifts: number;
  performedAt: number;
  stackLevel: number;
};

export type SongComposeResult = {
  note: SongNote;
  melody: string;
  completedSong?: ResolvedSong;
  bufferedSong?: ResolvedSong;
  activatedSong?: ActiveSong;
  bufferRejected?: boolean;
};

export type SongModule = PlayerModule & {
  key: "song";
  state: {
    notes: SongNote[];
    activeSongs: ActiveSong[];
    storedSongs: ResolvedSong[];
    lastPlayedSong?: ResolvedSong;
    maxNotes: number;
  };
  composeNote(note: Omit<SongNote, "createdAt">): SongComposeResult;
  performStoredSong(index?: number): ActiveSong | undefined;
  replayLastSong(): ActiveSong | undefined;
  renderMelody(): string;
  clearNotes(): void;
  listActiveSongs(): ActiveSong[];
  listStoredSongs(): ResolvedSong[];
  getBufferCapacity(): number;
  getMelodyCapacity(): number;
  syncActiveEffects(preservedUses?: Map<string, number | undefined>): void;
};

const songSourcePrefix = "song:";
const SONG_STACK_CAP = 3;

function extraStacks(level: number): number {
  return Math.max(0, Math.min(SONG_STACK_CAP, level) - 1);
}

function scaledRewardMultiplier(base: number, level: number): number {
  return Number((base + 0.04 * extraStacks(level)).toFixed(3));
}

function scaledEnergyMultiplier(base: number, level: number, floor = 0.85): number {
  return Number(Math.max(floor, base - 0.03 * extraStacks(level)).toFixed(3));
}

function scaledQualityMultiplier(base: number, level: number, cap = 1.3): number {
  return Number(Math.min(cap, base + 0.04 * extraStacks(level)).toFixed(3));
}

function scaledBullMultiplier(base: number, level: number, cap = 1.3): number {
  return Number(Math.min(cap, base + 0.04 * extraStacks(level)).toFixed(3));
}

function scaleModifier(modifier: AnyModifier, level: number): AnyModifier {
  return {
    ...modifier,
    rewardMultiplier: modifier.rewardMultiplier != null ? scaledRewardMultiplier(modifier.rewardMultiplier, level) : undefined,
    // Self-melody energy discounts stay fixed per variant; stacking extends uptime instead of deepening discounts.
    energyCostMultiplier: modifier.energyCostMultiplier,
  };
}

function scaleQualityModifier(modifier: QualityModifier, level: number): QualityModifier {
  return {
    ...modifier,
    add: modifier.add != null ? modifier.add * level : undefined,
    mult: modifier.mult != null ? scaledQualityMultiplier(modifier.mult, level) : undefined,
    successAdd: modifier.successAdd != null ? modifier.successAdd * level : undefined,
    failAdd: modifier.failAdd != null ? modifier.failAdd * level : undefined,
    successMult: modifier.successMult != null ? scaledQualityMultiplier(modifier.successMult, level) : undefined,
    failMult: modifier.failMult != null ? scaledQualityMultiplier(modifier.failMult, level) : undefined,
  };
}

function createShiftBonusModifier(args: {
  id: string;
  sourceId: string;
  ownerPlayerId: number;
  target: "shift.scoreBonus" | "shift.energyBonus" | "shift.xpBonus";
  value: number;
  remainingShifts: number;
}): ModifierDefinition {
  return {
    id: args.id,
    sourceType: "song",
    sourceId: args.sourceId,
    ownerPlayerId: args.ownerPlayerId,
    target: args.target,
    operation: { type: "add", value: args.value },
    duration: { type: "shifts", remaining: args.remainingShifts },
    filters: { actionTypes: ["shiftEnd"] },
  };
}

export function createSongModule(songBook: SongRecipe[], noteCatalog: SongNoteCatalog, maxNotes = 5): SongModule {
  let player: PlayerCore | undefined;
  let unsubscribe: (() => void) | undefined;

  const state: SongModule["state"] = {
    notes: [],
    activeSongs: [],
    storedSongs: [],
    lastPlayedSong: undefined,
    maxNotes: Math.max(5, maxNotes),
  };

  const recipes = songBook.slice().sort((a, b) => b.pattern.length - a.pattern.length);

  const getBufferCapacity = () => {
    const classing = player?.tryGet<any>("classing");
    const level = classing?.state?.level ?? 1;
    let capacity = 2;
    if (level >= 50) capacity += 1;
    if (level >= 100) capacity += 1;
    return capacity;
  };

  const getMelodyCapacity = () => {
    const classing = player?.tryGet<any>("classing");
    const level = classing?.state?.level ?? 1;
    return level >= 50 ? 2 : 1;
  };

  const matchesTail = (recipe: SongRecipe) => {
    const pattern = recipe.pattern;
    if (pattern.length > state.notes.length) return false;
    const tail = state.notes.slice(-pattern.length);
    if (recipe.requiresGold && !tail.some((note) => note.color === "gold")) return false;
    if (recipe.notePattern?.length) {
      return recipe.notePattern.every((color, index) => tail[index]?.color === color);
    }
    return pattern.every((family, index) => tail[index]?.family === family);
  };

  const resolveVariant = (notes: SongNote[]): SongVariant => {
    const maxTier = notes.reduce((max, note) => Math.max(max, noteCatalog[note.color]?.tier ?? 0), 0);
    if (maxTier >= 2) return "XL";
    if (maxTier >= 1) return "L";
    return "S";
  };

  const resolveRecipe = (recipe: SongRecipe, notes: SongNote[]): ResolvedSong => {
    if (recipe.kind === "aria") {
      if (!recipe.ariaEffect) {
        throw new Error(`Aria recipe ${recipe.id} has no ariaEffect data.`);
      }

      return {
        ...recipe.ariaEffect,
        id: recipe.id,
        name: recipe.name,
        kind: recipe.kind,
        scope: recipe.scope,
        pattern: recipe.pattern.slice(),
        notePattern: recipe.notePattern?.slice(),
      };
    }

    const variant = resolveVariant(notes);
    const data = recipe.variants[variant] ?? recipe.variants.L ?? recipe.variants.S;
    if (!data) {
      throw new Error(`Song recipe ${recipe.id} has no usable variant data.`);
    }

    return {
      ...data,
      id: recipe.id,
      name: recipe.name,
      kind: recipe.kind,
      scope: recipe.scope,
      variant,
      pattern: recipe.pattern.slice(),
      notePattern: recipe.notePattern?.slice(),
    };
  };

  const syncActiveEffects = (preservedUses?: Map<string, number | undefined>) => {
    if (!player) return;

    const modifiers = player.tryGet<ModifierModule>("modifiers");
    if (!modifiers) return;

    const localPreservedUses = preservedUses ?? modifiers.getUsesBySource(songSourcePrefix);
    modifiers.removeBySourcePrefix(songSourcePrefix);

    for (const song of state.activeSongs) {
      if (song.kind !== "melody") continue;

      for (const [index, entry] of (song.skillModifiers ?? []).entries()) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:${index}`;
        const usesRemaining = localPreservedUses.has(sourceId)
          ? localPreservedUses.get(sourceId)
          : entry.modifier.usesRemaining;
        modifiers.addMany(fromSkillModifier({
          ...scaleModifier(entry.modifier, song.stackLevel),
          usesRemaining,
        }, {
          id: `${sourceId}:${player.identity.id}`,
          sourceType: "song",
          sourceId,
          ownerPlayerId: player.identity.id,
        }));
      }

      for (const [index, entry] of (song.qualityModifiers ?? []).entries()) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:quality:${index}`;
        modifiers.addMany(fromQualityModifier(
          scaleQualityModifier(entry.modifier, song.stackLevel),
          {
            id: `${sourceId}:${player.identity.id}`,
            sourceType: "song",
            sourceId,
            ownerPlayerId: player.identity.id,
            remainingShifts: entry.remainingShifts ?? song.remainingShifts,
          },
        ));
      }

      for (const [index, entry] of (song.bullModifiers ?? []).entries()) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:bull:${index}`;
        modifiers.addMany(fromBullModifier({
          ...entry.modifier,
          chargeMultiplier: entry.modifier.chargeMultiplier != null ? scaledBullMultiplier(entry.modifier.chargeMultiplier, song.stackLevel) : undefined,
        }, {
          id: `${sourceId}:${player.identity.id}`,
          sourceType: "song",
          sourceId,
          ownerPlayerId: player.identity.id,
          remainingShifts: entry.remainingShifts ?? song.remainingShifts,
        }));
      }

      if ((song.shiftScorePerLevel ?? 0) !== 0) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:shiftScore`;
        modifiers.add(createShiftBonusModifier({
          id: `${sourceId}:${player.identity.id}`,
          sourceId,
          ownerPlayerId: player.identity.id,
          target: "shift.scoreBonus",
          value: (song.shiftScorePerLevel ?? 0) * song.stackLevel,
          remainingShifts: song.remainingShifts,
        }));
      }

      if ((song.shiftEnergyPerLevel ?? 0) !== 0) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:shiftEnergy`;
        modifiers.add(createShiftBonusModifier({
          id: `${sourceId}:${player.identity.id}`,
          sourceId,
          ownerPlayerId: player.identity.id,
          target: "shift.energyBonus",
          value: (song.shiftEnergyPerLevel ?? 0) * song.stackLevel,
          remainingShifts: song.remainingShifts,
        }));
      }

      if ((song.shiftXpBonus ?? 0) !== 0) {
        const sourceId = `${songSourcePrefix}${song.id}:${song.variant ?? "base"}:shiftXp`;
        modifiers.add(createShiftBonusModifier({
          id: `${sourceId}:${player.identity.id}`,
          sourceId,
          ownerPlayerId: player.identity.id,
          target: "shift.xpBonus",
          value: song.shiftXpBonus ?? 0,
          remainingShifts: song.remainingShifts,
        }));
      }
    }
  };

  const trimExpiredSongs = () => {
    for (const song of state.activeSongs) song.remainingShifts -= 1;
    for (let i = state.activeSongs.length - 1; i >= 0; i--) {
      if (state.activeSongs[i].remainingShifts <= 0) state.activeSongs.splice(i, 1);
    }
    syncActiveEffects();
  };

  const activateResolvedSong = (resolved: ResolvedSong): ActiveSong | undefined => {
    if (resolved.kind === "aria") return undefined;

    const existing = state.activeSongs.find((song) => song.id === resolved.id && song.kind === resolved.kind);
    if (!existing) {
      if (resolved.kind === "melody") {
        const activeMelodies = state.activeSongs
          .filter((song) => song.kind === "melody")
          .sort((a, b) => a.performedAt - b.performedAt);
        if (activeMelodies.length >= getMelodyCapacity()) {
          const replaced = activeMelodies[0];
          replaced.variant = resolved.variant;
          replaced.summary = resolved.summary;
          replaced.durationShifts = resolved.durationShifts;
          replaced.skillModifiers = resolved.skillModifiers;
          replaced.qualityModifiers = resolved.qualityModifiers;
          replaced.energyRestore = resolved.energyRestore;
          replaced.bullCharge = resolved.bullCharge;
          replaced.scoreBonus = resolved.scoreBonus;
          replaced.globalEventId = resolved.globalEventId;
          replaced.remainingShifts = resolved.durationShifts;
          replaced.performedAt = Date.now();
          replaced.stackLevel = 1;
          replaced.id = resolved.id;
          replaced.name = resolved.name;
          replaced.scope = resolved.scope;
          replaced.pattern = resolved.pattern.slice();
          syncActiveEffects();
          return replaced;
        }
      }

      const created: ActiveSong = {
        ...resolved,
        remainingShifts: resolved.durationShifts,
        performedAt: Date.now(),
        stackLevel: 1,
      };
      state.activeSongs.push(created);
      syncActiveEffects();
      return created;
    }

    if (existing.variant === resolved.variant) {
      existing.remainingShifts += 1;
      existing.performedAt = Date.now();
      existing.stackLevel = Math.min(SONG_STACK_CAP, existing.stackLevel + 1);
      syncActiveEffects();
      return existing;
    }

    existing.variant = resolved.variant;
    existing.summary = resolved.summary;
    existing.durationShifts = resolved.durationShifts;
    existing.skillModifiers = resolved.skillModifiers;
    existing.qualityModifiers = resolved.qualityModifiers;
    existing.energyRestore = resolved.energyRestore;
    existing.bullCharge = resolved.bullCharge;
    existing.scoreBonus = resolved.scoreBonus;
    existing.globalEventId = resolved.globalEventId;
    existing.remainingShifts = resolved.durationShifts;
    existing.performedAt = Date.now();
    existing.stackLevel = 1;
    syncActiveEffects();
    return existing;
  };

  const mod: SongModule = {
    key: "song",
    state,
    onAttach(p) {
      player = p;
      unsubscribe = player.ctx.bus.subscribe("facility:shift.tick", () => {
        state.notes = [];
        trimExpiredSongs();
      });
    },
    onDetach() {
      unsubscribe?.();
    },
    composeNote(noteInput) {
      const noteDef = noteCatalog[noteInput.color];
      const note: SongNote = {
        ...noteInput,
        family: noteInput.family ?? noteDef.family,
        createdAt: Date.now(),
      };

      state.notes.push(note);
      if (state.notes.length > state.maxNotes) {
        state.notes = state.notes.slice(-state.maxNotes);
      }

      let completedSong: ResolvedSong | undefined;
      let bufferedSong: ResolvedSong | undefined;
      let activatedSong: ActiveSong | undefined;
      let bufferRejected = false;
      for (const recipe of recipes) {
        if (!matchesTail(recipe)) continue;
        const usedNotes = state.notes.slice(-recipe.pattern.length);
        state.notes = state.notes.slice(0, -recipe.pattern.length);
        completedSong = resolveRecipe(recipe, usedNotes);
        if (completedSong.kind === "song") {
          if (state.storedSongs.length < getBufferCapacity()) {
            state.storedSongs.push(completedSong);
            bufferedSong = completedSong;
          } else {
            bufferRejected = true;
          }
        } else {
          activatedSong = activateResolvedSong(completedSong);
        }
        break;
      }

      const name = player?.identity.nickname ?? player?.identity.name ?? "<unknown>";
      console.log(`[SONG] ${name} melody=${mod.renderMelody() || "<empty>"}`);

      return {
        note,
        melody: mod.renderMelody(),
        completedSong,
        bufferedSong,
        activatedSong,
        bufferRejected,
      };
    },
    performStoredSong(index = 0) {
      const stored = state.storedSongs[index];
      if (!stored) return undefined;
      state.storedSongs.splice(index, 1);
       state.lastPlayedSong = { ...stored, pattern: stored.pattern.slice() };
      return activateResolvedSong(stored);
    },
    replayLastSong() {
      if (!state.lastPlayedSong) return undefined;
      const replay = {
        ...state.lastPlayedSong,
        pattern: state.lastPlayedSong.pattern.slice(),
      };
      return activateResolvedSong(replay);
    },
    renderMelody() {
      return state.notes.map((note) => note.icon).join(" ");
    },
    clearNotes() {
      state.notes = [];
    },
    listActiveSongs() {
      return state.activeSongs.slice();
    },
    listStoredSongs() {
      return state.storedSongs.slice();
    },
    getBufferCapacity() {
      return getBufferCapacity();
    },
    getMelodyCapacity() {
      return getMelodyCapacity();
    },
    syncActiveEffects(preservedUses) {
      syncActiveEffects(preservedUses);
    },
  };

  return mod;
}
