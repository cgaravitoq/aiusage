import { AiusageIslandElement } from "./element";

const tag = "aiusage-island";

if (customElements.get(tag) === undefined) {
  customElements.define(tag, AiusageIslandElement);
}
