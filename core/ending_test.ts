import { assertEquals } from "@std/assert";
import { apply, type Command, newGame } from "./rules.ts";
import { RECIPES } from "./recipes.ts";

const SEED = 121;
const CAPSTONE = RECIPES.find((r) => r.capstone)!;

Deno.test("crafting the capstone ends the game", () => {
  const state = { ...newGame(SEED), inventory: { ...CAPSTONE.inputs } };

  const events = apply(state, { type: "craft", recipe: CAPSTONE.id });

  assertEquals(events.map((e) => e.type), ["crafted", "ended"]);
  assertEquals(state.won, true);
});

Deno.test("after the ending, every command does nothing", () => {
  const state = { ...newGame(SEED), inventory: { ...CAPSTONE.inputs } };
  apply(state, { type: "craft", recipe: CAPSTONE.id });
  const snapshot = JSON.parse(JSON.stringify(state));

  const commands: Command[] = [
    { type: "move", direction: "north" },
    { type: "move", direction: "south" },
    { type: "move", direction: "east" },
    { type: "move", direction: "west" },
    { type: "gather" },
    { type: "craft", recipe: "spaceship" },
    ...RECIPES.map((r): Command => ({ type: "craft", recipe: r.id })),
  ];
  for (const command of commands) {
    assertEquals(apply(state, command), [], JSON.stringify(command));
    assertEquals(state, snapshot);
  }
});
