import { type GameState, newGame, type Terrain, terrainAt } from "./mod.ts";

// A new game with the player standing on a cell of the given terrain.
export function stateOn(seed: number, terrain: Terrain): GameState {
  for (let y = -60; y <= 60; y++) {
    for (let x = -60; x <= 60; x++) {
      if (terrainAt(seed, x, y) === terrain) {
        const state = newGame(seed);
        state.player.x = x;
        state.player.y = y;
        return state;
      }
    }
  }
  throw new Error(`Found no ${terrain} cell.`);
}
