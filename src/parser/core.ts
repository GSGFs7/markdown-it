import { RuleFN, Ruler } from "../ruler";
import StateCore from "./core_state";

const rules: [string, RuleFN][] = [];

export default class Core {
  ruler: Ruler;

  constructor() {
    this.ruler = new Ruler();

    for (const [ruleName, fn] of rules) {
      this.ruler.push(ruleName, fn);
    }
  }

  process(state: StateCore) {
    const rules = this.ruler.getRules("");

    for (const fn of rules) {
      fn(state);
    }
  }
}
