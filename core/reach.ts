import type { Recipe } from "./recipes.ts";
import { isPassable, type ItemKind, type Terrain } from "./terrain.ts";

type Yields = Record<Terrain, ItemKind | null>;
type Unlocks = Partial<Record<ItemKind, readonly Terrain[]>>;

export function reachable(
  recipes: readonly Recipe[],
  yields: Yields,
  unlocks: Unlocks,
) {
  const terrains = new Set<Terrain>(
    (Object.keys(yields) as Terrain[]).filter((t) => isPassable(t)),
  );
  const items = new Set<ItemKind>();

  let sizeBefore: number;
  do {
    sizeBefore = items.size + terrains.size;

    for (const terrain of terrains) {
      const item = yields[terrain];
      if (item !== null) items.add(item);
    }

    for (const recipe of recipes) {
      const inputs = Object.keys(recipe.inputs) as ItemKind[];
      if (inputs.every((item) => items.has(item))) items.add(recipe.output);
    }

    for (const item of items) {
      for (const terrain of unlocks[item] ?? []) terrains.add(terrain);
    }
  } while (items.size + terrains.size !== sizeBefore);

  return { items, terrains };
}

export function unreachableRecipes(
  recipes: readonly Recipe[],
  yields: Yields,
  unlocks: Unlocks,
): string[] {
  const { items } = reachable(recipes, yields, unlocks);
  return recipes
    .filter((r) =>
      (Object.keys(r.inputs) as ItemKind[]).some((item) => !items.has(item))
    )
    .map((r) => r.id);
}
