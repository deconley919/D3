import { assert, assertEquals } from "@std/assert";
import {
  apply,
  type Command,
  type Direction,
  type GameEvent,
  newGame,
} from "./mod.ts";
import run from "./runs/full_run.json" with { type: "json" };

function commands(): Command[] {
  const walk: Direction[] = ["east", "east", "south", "south", "west", "north"];
  // A long enough walk to bump into terrain as well as cross it.
  return Array.from({ length: 300 }, (_, i) => ({
    type: "move",
    direction: walk[(i * i + i) % walk.length],
  }));
}

const SEED = run.seed;
const RUN = run.commands as Command[];

function play(seed: number, commands: readonly Command[]) {
  const state = newGame(seed);
  const events: GameEvent[] = [];
  for (const command of commands) events.push(...apply(state, command));
  return { state, events };
}

Deno.test("a recorded run finishes the game and repeats exactly", () => {
  const first = play(SEED, RUN);
  assert(first.state.won, "the recorded run should win");
  assertEquals(first.events.at(-1)?.type, "ended");
  assert(
    first.events.some((e) => e.type === "crafted"),
    "the run should include crafting",
  );

  // Let the clock tick, so that a stored timestamp cannot match by luck.
  const tick = Date.now();
  while (Date.now() === tick) { /* spin until the next millisecond */ }

  const second = play(SEED, RUN);
  assertEquals(second, first);

  assertEquals(JSON.parse(JSON.stringify(first)), first);
});

Deno.test("state and events survive a trip through JSON", () => {
  const played = play(121, commands());

  assertEquals(JSON.parse(JSON.stringify(played)), played);
});
