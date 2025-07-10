import StateBlock from "./parser/block_state";
import StateCore from "./parser/core_state";
import StateInline from "./parser/inline_state";

export type CoreRuleFN = (state: StateCore, silent?: boolean) => boolean;
export type BlockRuleFN = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent?: boolean,
) => boolean;
export type InlineRuleFN = (state: StateInline, silent?: boolean) => boolean;

export type RuleFN = CoreRuleFN | BlockRuleFN | InlineRuleFN;

export type Rule<T extends RuleFN = RuleFN> = {
  name: string;
  enabled: boolean;
  fn: T;
  alt: string[];
};

export class Ruler<T extends RuleFN = RuleFN> {
  private rules: Rule<T>[];
  private index: Map<string, number>;
  private chains: Record<string, T[]> | null; // rule chain

  constructor() {
    this.rules = [];
    this.index = new Map();
    this.chains = null;
  }

  private findIndex(name: string): number {
    return this.index.get(name) ?? -1;
  }

  // set enable/disable status
  private setStatus(ruleName: string, enable: boolean): boolean {
    const index = this.findIndex(ruleName);

    if (index === -1) {
      return false;
    }

    this.rules[index].enabled = enable;

    // invalidate rule chain
    this.chains = null;

    return true;
  }

  // Add rules to the end of the array
  push(ruleName: string, fn: T, options?: { alt?: string[] }): void {
    const opt = options || {};

    if (this.findIndex(ruleName) !== -1) {
      throw new Error(`Ruler: rule name '${ruleName}' already exists`);
    }

    this.rules.push({ name: ruleName, enabled: true, fn, alt: opt.alt || [] });
    this.index.set(ruleName, this.rules.length - 1);

    // invalidate rule chain
    this.chains = null;
  }

  // enable rules
  enable(rule: string | string[]): void {
    if (!Array.isArray(rule)) {
      rule = [rule];
    }

    rule.forEach((ruleName) => {
      if (!this.setStatus(ruleName, true)) {
        throw new Error(
          `Ruler: can not enable ${ruleName}, the rule does not exist`,
        );
      }
    });
  }

  // disable rules
  disable(rule: string | string[]): void {
    if (!Array.isArray(rule)) {
      rule = [rule];
    }

    rule.forEach((ruleName) => {
      if (!this.setStatus(ruleName, false)) {
        throw new Error(
          `Ruler: can not enable ${ruleName}, the rule does not exist`,
        );
      }
    });
  }

  buildChain() {
    const chains: Record<string, T[]> = {};
    const chainsNames: Set<string> = new Set([""]);

    this.rules.forEach((rule) => {
      if (!rule.enabled) {
        return;
      }

      // collect unique names
      rule.alt.forEach((altName) => {
        chainsNames.add(altName);
      });
    });

    chainsNames.forEach((chain) => {
      chains[chain] = [];
      this.rules.forEach((rule) => {
        if (!rule.enabled) {
          return;
        }

        if (chain && rule.alt.indexOf(chain) < 0) {
          return;
        }

        chains[chain].push(rule.fn);
      });
    });

    return chains;
  }

  // get the rule function
  getRules(ruleName: string): T[] {
    if (this.chains === null) {
      this.chains = this.buildChain();
    }

    return this.chains[ruleName];
  }
}

export type CoreRuler = Ruler<CoreRuleFN>;
export type BlockRuler = Ruler<BlockRuleFN>;
export type InlineRuler = Ruler<InlineRuleFN>;
