import test from "node:test";
import assert from "node:assert/strict";
import { PlayerCore } from "../domain/core/PlayerCore";
import { DomainEvent, DomainEventBus } from "../domain/ports/DomainEvenPort";
import { MessagePort } from "../domain/ports/MessagePort";
import { createBullModule } from "../domain/modules/bull";
import { BullEngine } from "../domain/services/facility/BullEngine";

class TestBus implements DomainEventBus {
  private readonly subs = new Map<string, Set<(evt: DomainEvent) => void>>();

  publish(evt: DomainEvent): void {
    for (const handler of this.subs.get(evt.type) ?? []) handler(evt);
  }

  subscribe(type: string, handler: (evt: DomainEvent) => void): () => void {
    let set = this.subs.get(type);
    if (!set) {
      set = new Set();
      this.subs.set(type, set);
    }
    set.add(handler);
    return () => {
      const current = this.subs.get(type);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.subs.delete(type);
    };
  }
}

class TestMessages implements MessagePort {
  whispers: Array<{ playerId: number; text: string }> = [];
  broadcasts: string[] = [];

  whisper(playerId: number, text: string): void {
    this.whispers.push({ playerId, text });
  }

  broadcast(text: string): void {
    this.broadcasts.push(text);
  }
}

function createBullHarness() {
  const bus = new TestBus();
  const messages = new TestMessages();
  const player = new PlayerCore({ id: 1, name: "Bull Tester" }, { bus });
  const bull = createBullModule();
  player.attach(bull);

  new BullEngine(bus, messages, (id) => (id === player.identity.id ? player : undefined));

  return { bus, messages, player, bull };
}

test("ready bull ignores later skill-fail charge loss until orgasm resolves it", () => {
  const { bus, bull } = createBullHarness();

  for (let index = 0; index < 20; index += 1) {
    bus.publish({
      type: "player:skill.used",
      payload: { playerId: 1, outcome: "success", skillName: "test" },
    });
  }

  assert.equal(bull.getState().ready, true);
  assert.equal(bull.getState().energy, 100);

  bus.publish({
    type: "player:skill.used",
    payload: { playerId: 1, outcome: "fail", skillName: "test" },
  });

  assert.equal(bull.getState().ready, true);
  assert.equal(bull.getState().energy, 100);

  bus.publish({
    type: "player:climax.orgasm",
    payload: { playerId: 1, bullState: { ready: true } },
  });

  assert.equal(bull.getState().ready, false);
  assert.equal(bull.getState().energy, 0);
});

test("ready bull still resolves through orgasm resist", () => {
  const { bus, bull } = createBullHarness();

  for (let index = 0; index < 20; index += 1) {
    bus.publish({
      type: "player:skill.used",
      payload: { playerId: 1, outcome: "success", skillName: "test" },
    });
  }

  assert.equal(bull.getState().ready, true);

  bus.publish({
    type: "player:climax.resist",
    payload: { playerId: 1, bullState: { ready: true } },
  });

  assert.equal(bull.getState().ready, false);
  assert.equal(bull.getState().energy, 75);
});
