import { CoreRuleFN, CoreRuler, Ruler } from "../ruler";
import r_normalize from "../rules/core/normalize";
import StateCore from "./core_state";

const _rules: [string, CoreRuleFN][] = [["normalize", r_normalize]];

export default class Core {
  ruler: CoreRuler;

  constructor() {
    this.ruler = new Ruler();

    for (const [ruleName, fn] of _rules) {
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
