import type { ItemKind } from "./terrain.ts";

export type Recipe = {
  id: string;
  inputs: Partial<Record<ItemKind, number>>;
  output: ItemKind;
  capstone?: true;
};

export const RECIPES: readonly Recipe[] = [
  { id: "rope", inputs: { fiber: 2 }, output: "rope" },
  { id: "raft", inputs: { rope: 4, shell: 8 }, output: "raft" },
  {
    id: "water necklace",
    inputs: { pearl: 6, rope: 1 },
    output: "water necklace",
  },
  { id: "charm", inputs: { pearl: 6, fiber: 2 }, output: "charm" },
  {
    id: "water armor",
    inputs: { charm: 1, raft: 1, fiber: 4 },
    output: "water armor",
  },
  {
    id: "beacon",
    inputs: { "water necklace": 1, charm: 1, "water armor": 1 },
    output: "beacon",
    capstone: true,
  },
];
