import {
  type GameEvent,
  type GameState,
  type ItemKind,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

type CraftFailed = Extract<GameEvent, { type: "craftFailed" }>;

function describeCraftFailure(event: CraftFailed): string {
  switch (event.reason) {
    case "unknown recipe":
      return `no recipe "${event.recipe}"`;
    case "missing items":
      return `can't craft ${event.recipe}: need ` +
        event.missing.map((m) => `${m.item} ${m.have}/${m.need}`).join(", ");
    case "would be stranded":
      return `can't craft ${event.recipe} here: you would be stranded`;
  }
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;

    case "gathered":
      return `gathered ${event.item} at ${event.at.x}, ${event.at.y}`;
    case "gatherFailed":
      return `nothing gathered: ${event.reason}`;
    case "crafted":
      return `crafted ${event.output}`;
    case "craftFailed":
      return describeCraftFailure(event);
    case "unlocked":
      return `${event.terrains.join(", ")} is now crossable`;
    case "ended":
      return `the ${event.recipe} is injected into the soil. The loop is broken!`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  private readonly gathered = new Set<string>();
  private readonly shownItems: Partial<Record<ItemKind, number>>;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.shownItems = { ...state.inventory };
    this.showPosition(state.player.x, state.player.y);
    this.renderInventory();
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);

    if (event.type === "gathered") {
      this.gathered.add(`${event.at.x},${event.at.y}`);
      this.showPosition(event.at.x, event.at.y);
      this.shownItems[event.item] = event.count;
      this.renderInventory();
    }

    if (event.type === "crafted") {
      for (
        const [item, count] of Object.entries(event.counts) as [
          ItemKind,
          number,
        ][]
      ) {
        if (count === 0) delete this.shownItems[item];
        else this.shownItems[item] = count;
      }
      this.renderInventory();
    }

    if (event.type === "ended") element("banner").hidden = false;
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    const terrain = terrainAt(this.seed, x, y);
    element("terrain").textContent = this.gathered.has(`${x},${y}`)
      ? `${terrain} (picked clean)`
      : terrain;
  }

  private renderInventory() {
    const list = element("inventory");
    list.replaceChildren();

    const entries = Object.entries(this.shownItems);
    if (entries.length === 0) {
      const row = document.createElement("li");
      row.className = "empty";
      row.textContent = "empty";
      list.append(row);
      return;
    }

    for (const [item, count] of entries) {
      const row = document.createElement("li");
      row.textContent = `${item} x ${count}`;
      list.append(row);
    }
  }
}
