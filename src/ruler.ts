import StateBlock from "./parser/block_state";
import StateCore from "./parser/core_state";
import StateInline from "./parser/inline_state";

export type CoreRuleFN = (state: StateCore, silent?: boolean) => void;
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

  /**
   * # Rule chain
   *
   * rule chain cache, used to fast find rules
   *
   * chains:
   * "" -> default chain, containing all rules which enabled
   *
   */
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

  /**
   * Builds a chain of rule functions grouped by their alternative names.
   *
   * Iterates through all enabled rules, collecting their alternative names into a set.
   * For each unique chain name, creates an array of rule functions (`T[]`) that are enabled
   * and either have the chain name in their `alt` array or are part of the default chain.
   *
   * @returns A record mapping each chain name to an array of rule functions.
   */
  private buildChain(): Record<string, T[]> {
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

    // O(n^2)?
    chainsNames.forEach((chainName) => {
      chains[chainName] = [];
      this.rules.forEach((rule) => {
        if (!rule.enabled) {
          return;
        }

        // chainName name exist and not found in alt
        if (chainName && rule.alt.indexOf(chainName) < 0) {
          return;
        }

        chains[chainName].push(rule.fn);
      });
    });

    return chains;
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
