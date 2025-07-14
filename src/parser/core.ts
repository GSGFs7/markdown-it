import { CoreRuleFN, CoreRuler, Ruler } from "../ruler";
import StateCore from "./core_state";

import r_block from "../rules/core/block";
import r_normalize from "../rules/core/normalize";
import r_inline from "../rules/core/inline";
import Markdown from "../markdown";

type StateCoreConstructor = new (src: string, md: Markdown, env) => StateCore; // can be extend a child class

const _rules: [string, CoreRuleFN][] = [
  ["normalize", r_normalize],
  ["block", r_block],
  ["inline", r_inline],
];

export default class Core {
  private ruler: CoreRuler;
  State: StateCoreConstructor;

  constructor() {
    this.ruler = new Ruler();
    this.State = StateCore;

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
