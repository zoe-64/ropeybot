import test from "node:test";
import assert from "node:assert/strict";
import { PlayerCore } from "../domain/core/PlayerCore";
import { createSongModule, SongNoteColor } from "../domain/modules/song";
import { songBook, songNotes } from "../games/facility/events/songBook";

type SongKind = "melody" | "song" | "aria";
type SongVariant = "S" | "L" | "XL";

type SongCase = {
  name: string;
  id: string;
  kind: SongKind;
  notes: SongNoteColor[];
  expectedVariant?: SongVariant;
};

const songCases: SongCase[] = [
  { name: "Mirror Etude S", id: "mirror-etude", kind: "melody", notes: ["white", "white"], expectedVariant: "S" },
  { name: "Mirror Etude L", id: "mirror-etude", kind: "melody", notes: ["purple", "purple"], expectedVariant: "L" },
  { name: "Stillwater Ward S", id: "stillwater-ward", kind: "melody", notes: ["lightBlue", "white"], expectedVariant: "S" },
  { name: "Stillwater Ward L", id: "stillwater-ward", kind: "melody", notes: ["lightBlue", "purple"], expectedVariant: "L" },
  { name: "Ember Renewal S", id: "ember-renewal", kind: "melody", notes: ["green", "red"], expectedVariant: "S" },
  { name: "Ember Renewal L", id: "ember-renewal", kind: "melody", notes: ["green", "orange"], expectedVariant: "L" },
  { name: "Mirror Etude Fugue L", id: "mirror-etude-fugue", kind: "melody", notes: ["purple", "orange", "purple"], expectedVariant: "L" },
  { name: "Stillwater Reservoir L", id: "stillwater-reservoir", kind: "melody", notes: ["purple", "lightBlue", "purple"], expectedVariant: "L" },
  { name: "Ember Crescence L", id: "ember-crescence", kind: "melody", notes: ["orange", "green", "orange"], expectedVariant: "L" },
  { name: "Rallying Chorus S", id: "rallying-chorus", kind: "song", notes: ["red", "white", "lightBlue"], expectedVariant: "S" },
  { name: "Rallying Chorus L", id: "rallying-chorus", kind: "song", notes: ["orange", "purple", "lightBlue"], expectedVariant: "L" },
  { name: "Sheltering Hymn S", id: "sheltering-hymn", kind: "song", notes: ["lightBlue", "green", "white"], expectedVariant: "S" },
  { name: "Sheltering Hymn L", id: "sheltering-hymn", kind: "song", notes: ["lightBlue", "green", "purple"], expectedVariant: "L" },
  { name: "Cadence of Ease S", id: "cadence-of-ease", kind: "song", notes: ["white", "green", "red"], expectedVariant: "S" },
  { name: "Cadence of Ease L", id: "cadence-of-ease", kind: "song", notes: ["purple", "green", "orange"], expectedVariant: "L" },
  { name: "Grand Rally L", id: "grand-rally", kind: "song", notes: ["orange", "lightBlue", "purple", "orange"], expectedVariant: "L" },
  { name: "Coronation Anthem", id: "coronation-anthem", kind: "aria", notes: ["purple", "gold", "orange", "lightBlue", "green"] },
  { name: "Sanctuary Procession L", id: "sanctuary-procession", kind: "song", notes: ["lightBlue", "orange", "green", "purple"], expectedVariant: "L" },
  { name: "Easing Cadence L", id: "easing-cadence", kind: "song", notes: ["green", "purple", "orange", "orange"], expectedVariant: "L" },
];

function createTestBus() {
  return {
    publish() {
      // Song resolution tests do not rely on bus side effects.
    },
    subscribe() {
      return () => {
        // No-op unsubscribe for tests.
      };
    },
  };
}

function createSongHarness() {
  const player = new PlayerCore(
    { id: 1, name: "Test Moonstrel" },
    { bus: createTestBus() },
  );
  const song = createSongModule(songBook, songNotes);
  player.attach(song);
  return song;
}

function compose(
  song: ReturnType<typeof createSongModule>,
  color: SongNoteColor,
) {
  const noteDef = songNotes[color];
  return song.composeNote({
    color,
    family: noteDef.family,
    icon: noteDef.icon,
    label: noteDef.label,
    power: 1,
    skillName: "test",
  });
}

function assertSongCase(songCase: SongCase) {
  const song = createSongHarness();

  for (let index = 0; index < songCase.notes.length - 1; index += 1) {
    const result = compose(song, songCase.notes[index]);
    assert.equal(
      result.completedSong,
      undefined,
      `${songCase.name} resolved too early at note ${index + 1}`,
    );
  }

  const finalResult = compose(song, songCase.notes[songCase.notes.length - 1]);
  assert.equal(finalResult.completedSong?.id, songCase.id);
  assert.equal(finalResult.completedSong?.kind, songCase.kind);

  if (songCase.kind === "aria") {
    assert.equal(finalResult.completedSong?.variant, undefined);
    assert.equal(finalResult.bufferedSong, undefined);
    assert.equal(finalResult.activatedSong, undefined);
    assert.equal(finalResult.melody, "");
    return;
  }

  assert.equal(finalResult.completedSong?.variant, songCase.expectedVariant);

  if (songCase.kind === "song") {
    assert.equal(finalResult.bufferedSong?.id, songCase.id);
    assert.equal(finalResult.activatedSong, undefined);
    assert.equal(finalResult.melody, "");
    assert.deepEqual(song.listStoredSongs().map((storedSong) => storedSong.id), [songCase.id]);
    return;
  }

  assert.equal(finalResult.activatedSong?.id, songCase.id);
  assert.equal(finalResult.activatedSong?.variant, songCase.expectedVariant);
  assert.equal(finalResult.bufferedSong, undefined);
  assert.equal(finalResult.melody, "");
}

for (const songCase of songCases) {
  test(`${songCase.name} resolves from its direct note sequence`, () => {
    assertSongCase(songCase);
  });
}
