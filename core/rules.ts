// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import {
  ALL_TERRAINS,
  canEnter,
  type Inventory,
  type ItemKind,
  type Terrain,
  terrainAt,
  YIELDS,
} from "./terrain.ts";
import { type Recipe, RECIPES } from "./recipes.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

type Counts = Partial<Record<ItemKind, number>>;
export type Missing = { item: ItemKind; need: number; have: number };

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  inventory: Partial<Record<ItemKind, number>>;
  gathered: Record<string, true>; // "x,y" cells player changed/gathered
  won: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" } // gather within the player's cell
  | { type: "craft"; recipe: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "gathered"; at: Cell; item: ItemKind; count: number }
  | {
    type: "gatherFailed";
    at: Cell;
    reason: "already gathered" | "nothing here";
  }
  | {
    type: "crafted";
    recipe: string;
    output: ItemKind;
    counts: Counts;
  }
  | {
    type: "craftFailed";
    recipe: string;
    reason: "unknown recipe" | "missing items" | "would be stranded";
    missing: Missing[];
  }
  | { type: "unlocked"; terrains: Terrain[] }
  | { type: "ended"; recipe: string };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

const cellKey = (cell: Cell): string => `${cell.x},${cell.y}`;

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    inventory: {},
    gathered: {},
    won: false,
  };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.won) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.recipe);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!canEnter(state.inventory, terrain)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

function gather(state: GameState): GameEvent[] {
  const here: Cell = { ...state.player };
  const key = cellKey(here);

  if (state.gathered[key]) {
    return [{ type: "gatherFailed", at: here, reason: "already gathered" }];
  }

  const item = YIELDS[terrainAt(state.seed, here.x, here.y)];
  if (item === null) {
    return [{ type: "gatherFailed", at: here, reason: "nothing here" }];
  }

  state.gathered[key] = true;
  state.inventory[item] = (state.inventory[item] ?? 0) + 1;

  return [{ type: "gathered", at: here, item, count: state.inventory[item]! }];
}

//what a recipe doesnt have
export function missingFor(inventory: Inventory, recipe: Recipe): Missing[] {
  const missing: Missing[] = [];
  for (
    const [item, need] of Object.entries(recipe.inputs) as [ItemKind, number][]
  ) {
    const have = inventory[item] ?? 0;
    if (have < need) missing.push({ item, need, have });
  }
  return missing;
}

function inventoryAfter(inventory: Inventory, recipe: Recipe): Inventory {
  const next = { ...inventory };
  for (
    const [item, need] of Object.entries(recipe.inputs) as [ItemKind, number][]
  ) {
    const remaining = next[item]! - need;
    if (remaining === 0) delete next[item];
    else next[item] = remaining;
  }
  next[recipe.output] = (next[recipe.output] ?? 0) + 1;
  return next;
}

function craft(state: GameState, id: string): GameEvent[] {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) {
    return [{
      type: "craftFailed",
      recipe: id,
      reason: "unknown recipe",
      missing: [],
    }];
  }

  const inputs = Object.entries(recipe.inputs) as [ItemKind, number][];

  const missing = missingFor(state.inventory, recipe);

  if (missing.length > 0) {
    return [{
      type: "craftFailed",
      recipe: id,
      reason: "missing items",
      missing,
    }];
  }

  // refuse a craft that would leave the player unable to stand where they are
  const here = state.player;
  if (
    !canEnter(
      inventoryAfter(state.inventory, recipe),
      terrainAt(state.seed, here.x, here.y),
    )
  ) {
    return [{
      type: "craftFailed",
      recipe: id,
      reason: "would be stranded",
      missing: [],
    }];
  }

  const enterable = () =>
    ALL_TERRAINS.filter((t) => canEnter(state.inventory, t));
  const before = enterable();

  const counts: Counts = {};
  for (const [item, need] of inputs) {
    const remaining = state.inventory[item]! - need;
    if (remaining === 0) delete state.inventory[item];
    else state.inventory[item] = remaining;
    counts[item] = remaining;
  }

  const made = (state.inventory[recipe.output] ?? 0) + 1;
  state.inventory[recipe.output] = made;
  counts[recipe.output] = made;

  const opened = enterable().filter((t) => !before.includes(t));
  const events: GameEvent[] = [
    {
      type: "crafted",
      recipe: recipe.id,
      output: recipe.output,
      counts,
    },
  ];
  if (opened.length > 0) events.push({ type: "unlocked", terrains: opened });
  if (recipe.capstone) {
    state.won = true;
    events.push({ type: "ended", recipe: recipe.id });
  }
  return events;
}
