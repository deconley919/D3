import {
  type Command,
  type GameState,
  missingFor,
  RECIPES,
} from "../core/mod.ts";

export class RecipeBook {
  private readonly state: GameState;
  private readonly buttons: HTMLButtonElement[] = [];

  constructor(
    list: HTMLElement,
    state: GameState,
    send: (command: Command) => void,
  ) {
    this.state = state;
    for (const recipe of RECIPES) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", (event) => {
        send({ type: "craft", recipe: recipe.id });
        if (event.detail > 0) button.blur();
      });
      item.append(button);
      list.append(item);
      this.buttons.push(button);
    }
  }

  update() {
    RECIPES.forEach((recipe, i) => {
      const missing = missingFor(this.state.inventory, recipe);
      const cost = Object.entries(recipe.inputs)
        .map(([item, n]) => `${item} ×${n}`)
        .join(", ");
      const status = missing.length === 0 ? "ready" : "need " +
        missing.map((m) => `${m.item} ${m.have}/${m.need}`).join(", ");
      const button = this.buttons[i];
      button.textContent = `${i + 1} ${recipe.output} ← ${cost} (${status})`;
      button.classList.toggle("ready", missing.length === 0);
    });
  }
}
