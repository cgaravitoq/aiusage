import { TokenmaxIslandElement } from "./element";

const tag = "tokenmax-island";

if (customElements.get(tag) === undefined) {
  customElements.define(tag, TokenmaxIslandElement);
}
