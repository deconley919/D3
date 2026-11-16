import type { ItemKind } from "./terrain.ts";

export type Recipe = {
  id: string;
  inputs: Partial<Record<ItemKind, number>>;
  output: ItemKind;
};

export const RECIPES: readonly Recipe[] = [
  { id: "rope", inputs: { fiber: 2 }, output: "rope" },
  { id: "raft", inputs: { rope: 4, shell: 8 }, output: "raft" },
  { id: "charm", inputs: { pearl: 6, rope: 1 }, output: "charm" },
];
