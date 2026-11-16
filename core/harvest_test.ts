import { assertEquals, assertNotEquals } from "@std/assert";
import { apply, YIELDS } from "./mod.ts";
import { stateOn } from "./test_helpers.ts";

const SEED = 121;

Deno.test("gathering yields the terrain's item", () => {
  const state = stateOn(SEED, "sand");
  const { x, y } = state.player;

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gathered",
    at: { x, y },
    item: YIELDS.sand!,
    count: 1,
  }]);
  assertEquals(state.inventory[YIELDS.sand!], 1);
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const state = stateOn(SEED, "palm");
  apply(state, { type: "gather" });
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "gather" });

  assertEquals(events[0].type, "gatherFailed");
  assertEquals(state, snapshot);
});

Deno.test("a cell that yields nothing changes nothing", () => {
  const state = stateOn(SEED, "basalt");
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "gather" });

  assertEquals(events, [{
    type: "gatherFailed",
    at: { ...state.player },
    reason: "nothing here",
  }]);
  assertEquals(state, snapshot);
});

Deno.test("saved state holds only the cells that changed", () => {
  const state = stateOn(SEED, "sand");
  apply(state, { type: "gather" });

  assertEquals(Object.keys(state.gathered).length, 1);
  assertEquals(JSON.parse(JSON.stringify(state)), state);
});

Deno.test("a gathered event keeps its cell while state moves on", () => {
  const state = stateOn(SEED, "sand");
  const { x, y } = state.player;

  const [first] = apply(state, { type: "gather" });

  for (const direction of ["east", "west", "south", "north"] as const) {
    const events = apply(state, { type: "move", direction });
    if (events[0].type === "moved") break;
  }
  assertNotEquals(state.player, { x, y });

  assertEquals(first, {
    type: "gathered",
    at: { x, y },
    item: YIELDS.sand!,
    count: 1,
  });
});
