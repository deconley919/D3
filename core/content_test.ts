import { assert } from "@std/assert";
import { RECIPES } from "./recipes.ts";
import { YIELDS } from "./terrain.ts";

Deno.test("every recipe input has a source", () => {
  const sources = new Set<string>([
    ...Object.values(YIELDS).filter((item) => item !== null),
    ...RECIPES.map((r) => r.output),
  ]);

  for (const recipe of RECIPES) {
    for (const item of Object.keys(recipe.inputs)) {
      assert(
        sources.has(item),
        `recipe "${recipe.id}" needs "${item}", but nothing yields or crafts it`,
      );
    }
  }
});
