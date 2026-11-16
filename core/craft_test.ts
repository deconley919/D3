import { assertEquals } from "@std/assert";
import { apply, newGame } from "./rules.ts";
import type { ItemKind } from "./terrain.ts";
import { RECIPES } from "./recipes.ts";

const SEED = 121;

Deno.test("every recipe row crafts", () => {
  for (const recipe of RECIPES) {
    const state = { ...newGame(SEED), inventory: { ...recipe.inputs } };
    const events = apply(state, { type: "craft", recipe: recipe.id });

    assertEquals(events[0].type, "crafted", `recipe "${recipe.id}`);
    for (const item of Object.keys(recipe.inputs) as ItemKind[]) {
      assertEquals(
        state.inventory[item],
        undefined,
        `"${recipe.id}" should use up ${item}`,
      );
    }
    assertEquals(
      state.inventory[recipe.output],
      1,
      `"${recipe.id}" should make 1 ${recipe.output}`,
    );
  }
});

Deno.test("a craft with missing items changes nothing and says why", () => {
  const state = { ...newGame(SEED), inventory: { fiber: 1 } };
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: "rope" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "craftFailed",
    recipe: "rope",
    reason: "missing items",
    missing: [{ item: "fiber", need: 2, have: 1 }],
  }]);
});

Deno.test("an unknown recipe changes nothing", () => {
  const state = { ...newGame(SEED), inventory: { fiber: 5 } };
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: "spaceship" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "craftFailed",
    recipe: "spaceship",
    reason: "unknown recipe",
    missing: [],
  }]);
});

Deno.test("a crafted event keeps its counts while state moves on", () => {
  const state = { ...newGame(SEED), inventory: { fiber: 4 } };

  const [first] = apply(state, { type: "craft", recipe: "rope" });
  apply(state, { type: "craft", recipe: "rope" });

  assertEquals(first, {
    type: "crafted",
    recipe: "rope",
    output: "rope",
    counts: { fiber: 2, rope: 1 },
  });
});
