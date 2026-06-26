import { SongNoteCatalog, SongRecipe } from "../../../domain/modules/song";

export const songNotes: SongNoteCatalog = {
  white: {
    family: "self",
    tier: 0,
    label: "White Note",
    icon: "⬜",
    role: "Makes you more powerful through self-improvement.",
  },
  purple: {
    family: "self",
    tier: 1,
    label: "Purple Note",
    icon: "🟪",
    role: "An elevated self-improvement note with stronger personal scaling.",
  },
  red: {
    family: "drive",
    tier: 0,
    label: "Red Note",
    icon: "🟥",
    role: "Raises rewards and accelerates bull charge buildup.",
  },
  orange: {
    family: "drive",
    tier: 1,
    label: "Orange Note",
    icon: "🟧",
    role: "A stronger aggressive note with amplified payoff and momentum.",
  },
  green: {
    family: "restore",
    tier: 0,
    label: "Green Note",
    icon: "🟩",
    role: "Focuses on restorative effects such as energy recovery.",
  },
  lightBlue: {
    family: "guard",
    tier: 0,
    label: "Blue Note",
    icon: "🟦",
    role: "Raises tolerance to disruption and stabilizes performance.",
  },
  gold: {
    family: "crown",
    tier: 2,
    label: "Gold Note",
    icon: "🟨",
    role: "A rare crown note used for exceptionally powerful songs.",
  },
};

export const songBook: SongRecipe[] = [
  {
    id: "mirror-etude",
    name: "Mirror Etude",
    kind: "melody",
    pattern: ["self", "self"],
    scope: "self",
    variants: {
      S: {
        summary: "A simple reflective melody that adds +4 score per melody level each shift while active.",
        durationShifts: 2,
        shiftScorePerLevel: 4,
      },
      L: {
        summary: "A refined reflective melody that adds +4 score per melody level each shift and reduces energy costs by 8% while active.",
        durationShifts: 2,
        shiftScorePerLevel: 4,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.92 } },
        ],
      },
      XL: {
        summary: "A masterwork reflective melody that adds +5 score per melody level each shift and reduces energy costs by 12% while active.",
        durationShifts: 3,
        shiftScorePerLevel: 5,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.88 } },
        ],
      },
    },
  },
  {
    id: "stillwater-ward",
    name: "Stillwater Ward",
    kind: "melody",
    pattern: ["guard", "self"],
    scope: "self",
    variants: {
      S: {
        summary: "A calm ward melody that restores +8 energy per melody level each shift while active.",
        durationShifts: 2,
        shiftEnergyPerLevel: 8,
      },
      L: {
        summary: "A steadier ward melody that restores +8 energy per melody level each shift and improves quality generation by 15% while active.",
        durationShifts: 2,
        shiftEnergyPerLevel: 8,
        qualityModifiers: [
          { modifier: { successMult: 1.15 }, remainingShifts: 2 },
        ],
      },
      XL: {
        summary: "A crystalline ward melody that restores +10 energy per melody level each shift and improves quality generation by 20% while active.",
        durationShifts: 3,
        shiftEnergyPerLevel: 10,
        qualityModifiers: [
          { modifier: { successMult: 1.2 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "ember-renewal",
    name: "Ember Renewal",
    kind: "melody",
    pattern: ["restore", "drive"],
    scope: "self",
    variants: {
      S: {
        summary: "A warm renewal melody that increases bull charge generation by 10% while active.",
        durationShifts: 2,
        bullModifiers: [
          { modifier: { chargeMultiplier: 1.1 }, remainingShifts: 2 },
        ],
      },
      L: {
        summary: "A brighter renewal melody that increases bull charge generation by 15% and grants 50 extra XP each shift while active.",
        durationShifts: 2,
        shiftXpBonus: 50,
        bullModifiers: [
          { modifier: { chargeMultiplier: 1.15 }, remainingShifts: 2 },
        ],
      },
      XL: {
        summary: "An incandescent renewal melody that increases bull charge generation by 20% and grants 75 extra XP each shift while active.",
        durationShifts: 3,
        shiftXpBonus: 75,
        bullModifiers: [
          { modifier: { chargeMultiplier: 1.2 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "mirror-etude-fugue",
    name: "Mirror Etude Fugue",
    kind: "melody",
    pattern: ["self", "drive", "self"],
    notePattern: ["purple", "red", "purple"],
    scope: "self",
    variants: {
      L: {
        summary: "A longer mirror refrain that adds +7 score per melody level each shift and reduces energy costs by 15% while active.",
        durationShifts: 3,
        shiftScorePerLevel: 7,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.85 } },
        ],
      },
    },
  },
  {
    id: "stillwater-reservoir",
    name: "Stillwater Reservoir",
    kind: "melody",
    pattern: ["self", "guard", "self"],
    notePattern: ["purple", "lightBlue", "purple"],
    scope: "self",
    variants: {
      L: {
        summary: "A deeper ward refrain that restores +12 energy per melody level each shift and improves quality generation by 22% while active.",
        durationShifts: 3,
        shiftEnergyPerLevel: 12,
        qualityModifiers: [
          { modifier: { successMult: 1.22 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "ember-crescence",
    name: "Ember Crescence",
    kind: "melody",
    pattern: ["drive", "restore", "drive"],
    notePattern: ["orange", "green", "orange"],
    scope: "self",
    variants: {
      XL: {
        summary: "A hotter renewal refrain that increases bull charge generation by 22% and grants 90 extra XP each shift while active.",
        durationShifts: 3,
        shiftXpBonus: 90,
        bullModifiers: [
          { modifier: { chargeMultiplier: 1.22 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "rallying-chorus",
    name: "Rallying Chorus",
    kind: "song",
    pattern: ["drive", "self", "guard"],
    scope: "others",
    variants: {
      S: {
        summary: "A supportive chorus that raises neighboring stations' rewards by 12% while active.",
        durationShifts: 2,
        skillModifiers: [
          { modifier: { rewardMultiplier: 1.12 } },
        ],
      },
      L: {
        summary: "A stronger chorus that raises neighboring stations' rewards by 18% while active.",
        durationShifts: 2,
        skillModifiers: [
          { modifier: { rewardMultiplier: 1.18 } },
        ],
      },
      XL: {
        summary: "A broad chorus that raises neighboring stations' rewards by 24% while active.",
        durationShifts: 3,
        skillModifiers: [
          { modifier: { rewardMultiplier: 1.24 } },
        ],
      },
    },
  },
  {
    id: "sheltering-hymn",
    name: "Sheltering Hymn",
    kind: "song",
    pattern: ["guard", "restore", "self"],
    scope: "others",
    variants: {
      S: {
        summary: "A careful hymn that improves neighboring stations' quality generation by 12% while active.",
        durationShifts: 2,
        qualityModifiers: [
          { modifier: { successMult: 1.12 }, remainingShifts: 2 },
        ],
      },
      L: {
        summary: "A firmer hymn that improves neighboring stations' quality generation by 18% while active.",
        durationShifts: 2,
        qualityModifiers: [
          { modifier: { successMult: 1.18 }, remainingShifts: 2 },
        ],
      },
      XL: {
        summary: "A bright hymn that improves neighboring stations' quality generation by 22% while active.",
        durationShifts: 3,
        qualityModifiers: [
          { modifier: { successMult: 1.22 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "cadence-of-ease",
    name: "Cadence of Ease",
    kind: "song",
    pattern: ["self", "restore", "drive"],
    scope: "others",
    variants: {
      S: {
        summary: "A practical cadence that reduces neighboring stations' energy costs by 7% while active.",
        durationShifts: 2,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.93 } },
        ],
      },
      L: {
        summary: "A softer cadence that reduces neighboring stations' energy costs by 10% and raises rewards by 10% while active.",
        durationShifts: 2,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.9, rewardMultiplier: 1.1 } },
        ],
      },
      XL: {
        summary: "A graceful cadence that reduces neighboring stations' energy costs by 12% and raises rewards by 15% while active.",
        durationShifts: 3,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.88, rewardMultiplier: 1.15 } },
        ],
      },
    },
  },
  {
    id: "grand-rally",
    name: "Grand Rally",
    kind: "song",
    pattern: ["drive", "guard", "self", "drive"],
    notePattern: ["orange", "lightBlue", "purple", "orange"],
    scope: "others",
    variants: {
      L: {
        summary: "A drilled rally that raises neighboring stations' rewards by 22% and reduces their energy costs by 10% while active.",
        durationShifts: 3,
        skillModifiers: [
          { modifier: { rewardMultiplier: 1.22, energyCostMultiplier: 0.9 } },
        ],
      },
    },
  },
  {
    id: "coronation-anthem",
    name: "Coronation Anthem",
    kind: "aria",
    pattern: ["self", "drive", "guard", "restore", "crown"],
    notePattern: ["purple", "orange", "lightBlue", "green", "gold"],
    scope: "others",
    requiresGold: true,
    ariaEffect: {
      summary: "A crowned aria that calls a powerful room-wide boon into being.",
      durationShifts: 1,
      globalEventId: "Lovely",
    },
  },
  {
    id: "sanctuary-procession",
    name: "Sanctuary Procession",
    kind: "song",
    pattern: ["guard", "self", "restore", "self"],
    notePattern: ["lightBlue", "purple", "green", "purple"],
    scope: "others",
    variants: {
      L: {
        summary: "A longer procession that improves neighboring stations' quality generation by 20% and lowers their energy costs by 10% while active.",
        durationShifts: 3,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.9 } },
        ],
        qualityModifiers: [
          { modifier: { successMult: 1.2 }, remainingShifts: 3 },
        ],
      },
    },
  },
  {
    id: "easing-cadence",
    name: "Easing Cadence",
    kind: "song",
    pattern: ["restore", "self", "drive", "drive"],
    notePattern: ["green", "purple", "orange", "orange"],
    scope: "others",
    variants: {
      L: {
        summary: "A woven cadence that reduces neighboring stations' energy costs by 12%, raises rewards by 15%, and improves quality generation by 12% while active.",
        durationShifts: 3,
        skillModifiers: [
          { modifier: { energyCostMultiplier: 0.88, rewardMultiplier: 1.15 } },
        ],
        qualityModifiers: [
          { modifier: { successMult: 1.12 }, remainingShifts: 3 },
        ],
      },
    },
  },
];
