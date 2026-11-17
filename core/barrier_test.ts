import { assert, assertEquals } from "@std/assert";
import { apply, newGame } from "./rules.ts";
import { RECIPES } from "./recipes.ts";
import { isPassable, type Terrain, terrainAt } from "./terrain.ts";

const SEED = 121;
const RAFT = RECIPES.find((r) => r.id === "raft")!;

// a new game with the player on a passable cell and `terrain` one step east.
function besideTerrain(seed: number, terrain: Terrain) {
  for (let y = -50; y <= 50; y++) {
    for (let x = -50; x <= 50; x++) {
      if (
        isPassable(terrainAt(seed, x, y)) &&
        terrainAt(seed, x + 1, y) === terrain
      ) {
        return { ...newGame(seed), player: { x, y } };
      }
    }
  }
  throw new Error(`no ${terrain} found near the origin for seed ${seed}`);
}

// beside floodwater, craft a raft through apply, step onto the water.
function craftRaftAndCross() {
  const state = {
    ...besideTerrain(SEED, "floodwater"),
    inventory: { ...RAFT.inputs },
  };
  apply(state, { type: "craft", recipe: "raft" });
  apply(state, { type: "move", direction: "east" });
  return state;
}

Deno.test("floodwater is shut before a raft and open after", () => {
  const state = {
    ...besideTerrain(SEED, "floodwater"),
    inventory: { ...RAFT.inputs },
  };
  const start = { ...state.player };
  const snapshot = JSON.parse(JSON.stringify(state));

  let events = apply(state, { type: "move", direction: "east" });
  assertEquals(events.map((e) => e.type), ["blocked"]);
  assertEquals(state, snapshot);

  events = apply(state, { type: "craft", recipe: "raft" });
  assertEquals(events.map((e) => e.type), ["crafted", "unlocked"]);
  assertEquals(events[1], { type: "unlocked", terrains: ["floodwater"] });

  events = apply(state, { type: "move", direction: "east" });
  assertEquals(events.map((e) => e.type), ["moved"]);
  assertEquals(state.player, { x: start.x + 1, y: start.y });
});

Deno.test("crafting something that unlocks nothing gives no unlocked event", () => {
  const state = { ...newGame(SEED), inventory: { fiber: 2 } };
  const events = apply(state, { type: "craft", recipe: "rope" });
  assertEquals(events.map((e) => e.type), ["crafted"]);
});

Deno.test("a second raft does not unlock again", () => {
  const doubled = Object.fromEntries(
    Object.entries(RAFT.inputs).map(([item, n]) => [item, n! * 2]),
  );
  const state = { ...newGame(SEED), inventory: doubled };

  apply(state, { type: "craft", recipe: "raft" });
  const second = apply(state, { type: "craft", recipe: "raft" });

  assertEquals(second.map((e) => e.type), ["crafted"]);
});

Deno.test("pearls can be gathered once on the water", () => {
  const state = craftRaftAndCross();
  const events = apply(state, { type: "gather" });

  assert(events[0].type === "gathered");
  assertEquals(events[0].item, "pearl");
});

const ARMOR = RECIPES.find((r) => r.id === "water armor")!;

// A new game with the player on floodwater, surrounded by floodwater on all four sides.
function onOpenWater(seed: number) {
  const around = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = -50; y <= 50; y++) {
    for (let x = -50; x <= 50; x++) {
      if (
        around.every(([dx, dy]) =>
          terrainAt(seed, x + dx, y + dy) === "floodwater"
        )
      ) {
        return { ...newGame(seed), player: { x, y } };
      }
    }
  }
  throw new Error(`no open water found near the origin for seed ${seed}`);
}

Deno.test("crafting away the raft never strands the player on open water", () => {
  const state = { ...onOpenWater(121), inventory: { ...ARMOR.inputs } };
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: ARMOR.id });

  assertEquals(events, [{
    type: "craftFailed",
    recipe: ARMOR.id,
    reason: "would be stranded",
    missing: [],
  }]);
  assertEquals(state, snapshot);
});

Deno.test("water armor still crafts on land", () => {
  const state = {
    ...besideTerrain(121, "floodwater"),
    inventory: { ...ARMOR.inputs },
  };
  const events = apply(state, { type: "craft", recipe: ARMOR.id });
  assertEquals(events[0].type, "crafted");
});
