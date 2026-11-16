import { assert, assertEquals } from "@std/assert";
import { type Recipe, RECIPES } from "./recipes.ts";
import { YIELDS } from "./terrain.ts";
import { UNLOCKS } from "./terrain.ts";
import { unreachableRecipes } from "./reach.ts";

Deno.test("every real recipe is reachable", () => {
  assertEquals(unreachableRecipes(RECIPES, YIELDS, UNLOCKS), []);
});

Deno.test("a recipe that needs its own output is unreachable", () => {
  const fake = [
    ...RECIPES,
    { id: "loop", inputs: { gem: 1 }, output: "gem" },
  ] as unknown as Recipe[];

  assert(unreachableRecipes(fake, YIELDS, UNLOCKS).includes("loop"));
});

Deno.test("without the raft, the charm is unreachable", () => {
  const noRaft = RECIPES.filter((r) => r.id !== "raft");
  assert(unreachableRecipes(noRaft, YIELDS, UNLOCKS).includes("charm"));
});

Deno.test("the capstone is reachable", () => {
  const capstone = RECIPES.find((r) => r.capstone)!;
  assert(!unreachableRecipes(RECIPES, YIELDS, UNLOCKS).includes(capstone.id));
});
