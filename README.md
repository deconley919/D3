# Tsunami Loop

**play it** <https://github.com/deconley919/D3>

**Target:** a keyboard-playable survival-crafting game for the browser. A tsunami destroyed your island in Hawaii and killed you, and you were sent back to the day before it hits, again and again. Gather materials and craft a beacon to stab into the island to survive the tsunami and break the loop.

Made by Devin and Keanu for CMPM 121 (D3).

## How to play

| Key             | Action                                  |
| --------------- | --------------------------------------- |
| Arrow keys      | Move one cell                           |
| `E`             | Gather from the cell you stand on       |
| `1`-`9`         | Craft the recipe with that number       |
| `Tab` / `Enter` | Focus a recipe button and craft with it |

- Sand and palm give you shell and fiber. Basalt has nothing - acts as a physical blocakde
- Floodwater blocks you until you craft a raft. Standing in the flood lets you gather pearls
- A recipe button glows when you can craft it. Otherwise it shows what is missing
- A craft that would leave you stranded on open water is refused, as the raft is needed to travel across it
- Craft the **beacon** to win. After that, the game doesn't accept anymore commands

## Run it locally

Needs [Deno](https://deno.com/) and git.

```bash
git clone https://github.com/deconley919/D3
cd D3
deno task setup
deno task dev
deno task build
deno task ci
deno task preview
```

## How to add a recipe

Recipes are rows of data in **`core/recipes.ts`**. Add a row to `RECIPES`:

```ts
{ id: "rope", inputs: { fiber: 2 }, output: "rope" },
```

- If the recipe uses or makes a **new item**, add its name to the `ItemKind` union in **`core/terrain.ts`**.
- If a terrain is to yield the new item, change that terrain's row in `YIELDS` in **`core/terrain.ts`**.
- If the item is to open a barrier, add it to `UNLOCKS` in **`core/terrain.ts`**.

No rule code changes. `craft` and `missingFor` in **`core/rules.ts`** read the table, and the recipe buttons are built from it by **`game/recipe_book.ts`**. The new recipe also gets the next digit key in **`game/controller.ts`**, up to 9.

Then run `deno task test`. **`core/content_test.ts`** fails if an input has no source, and **`core/reach_test.ts`** fails if a recipe can never be made.

## How it is built

- **`core/`** is the game itself: state, seeded terrain, recipes, and `apply(state, command)`. It has no browser, clock, or Phaser, so tests run it headlessly
- **`game/`** is the client. Only `game/grid/` may import Phaser, and only to draw the grid. The controller turns keys and button clicks into commands, the presenter plays the resulting events in order, and the grid, HUD, and sound each show them.

## Tests

- `rules_test.ts`, `harvest_test.ts`, `craft_test.ts`: moving, gathering, and crafting, including failures that change nothing.
- `barrier_test.ts`: floodwater is shut before a raft and open after, and crafting away the raft never strands the player. This test came from a bug found by hand.
- `reach_test.ts`: a fixpoint check that every recipe, and the beacon, can be made, and that a recipe needing its own output is reported unreachable.
- `ending_test.ts`: after the beacon, every command does nothing.
- `determinism_test.ts`: a recorded run in `core/runs/full_run.json` finishes the game and repeats with identical state and events.

[TESTING.md](TESTING.md) is the manual test script.

## Two folders, two rules

- **`core/`** holds the game itself: plain-data state, the seeded terrain function, and `apply(state, command)`. It has no clock, no animation, no browser, and no Phaser. A command updates the state it is given, immediately, and returns events: a record of what happened. Events are kept and played later while state keeps changing, so an event gets its own copies of any cells it reports, never an object that state still holds.
- **`game/`** is the client, wired together in `game/main.ts`. `controller.ts` turns keys into commands, `presenter.ts` plays events in order, and three outputs show each event as it plays: the Phaser grid (`grid/grid_view.ts`), the HUD (`hud.ts`, page elements in `index.html` styled by `style.css`), and sound (`sounds.ts`). The controller holds input while an event plays and calls the core when it ends. That busy state lives only in `game/`.

**Rule one:** `core/` never depends on `game/`, Phaser, or anything else outside `core/`. `game/` imports the core through `../core/mod.ts`. Game rules belong in `core/`, where tests can reach them without a browser. `console` is allowed in `core/` for debugging.

**Rule two:** only `game/grid/` may import Phaser. Phaser is here for one narrow job, drawing the grid and moving its camera. Everything around the grid is ordinary web page, so style it with CSS and make it your own.

Phaser has no device-pixel setting of its own, so `grid_view.ts` sizes the canvas backing store to CSS size times `devicePixelRatio` and zooms the camera to match. Draw in logical pixels and the grid stays crisp on high-resolution displays. The view has a fixed CSS size. A change in pixel ratio is handled, and a window resize changes the page layout only.

Sound uses the browser's Web Audio API directly, because Phaser plays loaded audio but has no synthesis. Audio starts on the first key press or click, as browsers require, and the page plays on silently if audio is unavailable. Change the notes in `sounds.ts` to change how your game sounds.

## Testing entry points

These are supported, for people and for agents driving a browser: `?seed=7` selects a world, `game.state` in the browser console reads logical state (the `game` handle is set in `game/main.ts`), and the `#live` element holds the most recent played event as text, since a canvas is opaque to accessibility-tree tools. [TESTING.md](TESTING.md) is a manual test script. No browser step runs in `deno task ci`.

## Patterns you are already using

Named here so you can read about them. Each also appears in a one-line comment where it is used.

- [Command](https://gameprogrammingpatterns.com/command.html): keys and tests drive the core with the same `Command` objects.
- [Event Queue](https://gameprogrammingpatterns.com/event-queue.html): the presenter separates when an event is produced from when it is played.
- [Observer](https://gameprogrammingpatterns.com/observer.html): the grid, the HUD, and sound each hear played events, and do not know about each other.
- [Mediator](https://refactoring.guru/design-patterns/mediator): the controller stands between input, the core, and the presenter.
- [Facade](https://refactoring.guru/design-patterns/facade): `apply` and `core/mod.ts` are the one way in.
- [Domain Event](https://martinfowler.com/eaaDev/DomainEvent.html): `GameEvent` says what happened in the game's own terms.
- [Humble Object](http://xunitpatterns.com/Humble%20Object.html): the grid view only shows events and decides nothing, because the logic lives in `core/`.
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture): the core is the inside, and keys, tests, the grid, the HUD, and sound all sit outside it. No formal port is declared.
- [Aliasing Bug](https://martinfowler.com/bliki/AliasingBug.html) and [Value Object](https://martinfowler.com/bliki/ValueObject.html): `apply` mutates state, so events copy their cells.
- [Given-When-Then](https://martinfowler.com/bliki/GivenWhenThen.html): the shape of the sample unit tests.
- [Singleton](https://gameprogrammingpatterns.com/singleton.html), avoided on purpose: `newGame(seed)` makes as many worlds as tests need.

## Tasks

| Task                 | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `deno task setup`    | Install dependencies and turn on the commit hook (once per clone)     |
| `deno task dev`      | Run the game locally                                                  |
| `deno task test`     | Run the core's tests                                                  |
| `deno task check`    | Type-check `core/` and `game/`, each under its own `deno.json`        |
| `deno task boundary` | Check what `core/` imports, and that only `game/grid/` imports Phaser |
| `deno task fmt`      | Fix formatting                                                        |
| `deno task lint`     | Lint                                                                  |
| `deno task build`    | Build the site into `dist/`                                           |
| `deno task preview`  | Serve the built `dist/` locally                                       |
| `deno task ci`       | Run every gate below, in order                                        |

## The gates

The commit hook and the GitHub Pages workflow both run `deno task ci`. See each gate fail on purpose, then undo the change:

| Gate        | Try this                                                                                                                                          | What you should see                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Formatting  | Add extra spaces inside a line in `core/rules.ts`                                                                                                 | `deno fmt --check` reports the difference                                                      |
| Lint        | Add `const unused = 1;` to `core/rules.ts`                                                                                                        | `deno lint` reports `no-unused-vars`                                                           |
| Types       | Add `document.title = "core";` to `core/rules.ts`                                                                                                 | `deno check core` cannot find `document`                                                       |
| Tests       | In `move` in `core/rules.ts`, add `state.player = to;` to the start of the blocked branch                                                         | The blocked-move test fails and shows the difference                                           |
| Determinism | Use `Math.random()` in `terrainAt` in `core/terrain.ts`, or add `movedAt?: number` to `GameState` and set `state.movedAt = Date.now();` in `move` | The terrain test fails, or the replay test does                                                |
| Boundary    | Add `import type _Phaser from "npm:phaser@4.2.1";` to `core/rules.ts`                                                                             | `deno task boundary` names the file and the import. Only this gate catches it.                 |
| Boundary 2  | Add `import Phaser from "phaser"; console.log(Phaser);` to `game/hud.ts`                                                                          | `deno task boundary` says Phaser is mentioned outside `game/grid/`. Only this gate catches it. |
| Build       | Change `/game/main.ts` in `index.html` to a missing file                                                                                          | `deno task build` cannot resolve it                                                            |

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 D2 starter](https://github.com/ucsc-cmpm-121-f26/d2-starter), with the Phaser setup following the instructor's E4 starter. Those repositories have no explicit repository license; no new license is assigned to that material. The D3 scaffold was instructor-directed and authored with Anthropic Claude agent assistance. Dependencies retain their respective licenses.
