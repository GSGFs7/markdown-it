export type RuleFN = (...args: unknown[]) => unknown;

export type Rule = {
  name: string;
  enabled: boolean;
  fn: RuleFN;
  alt: string[];
};

export class Ruler {
  private rules: Rule[];
  private index: Map<string, number>;
  private chains: Record<string, RuleFN[]> | null; // rule chain

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
  push(ruleName: string, fn: RuleFN, options?: { alt?: string[] }): void {
    const opt = options || {};

    if (this.findIndex(ruleName) === -1) {
      throw new Error(`Ruler: rule name ${ruleName} already exists`);
    }

    this.rules.push({ name: ruleName, enabled: true, fn, alt: opt.alt || [] });

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
    const chains: Record<string, RuleFN[]> = {};
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
  getRules(ruleName: string): ((...args: unknown[]) => unknown)[] {
    if (this.chains === null) {
      this.chains = this.buildChain();
    }

    return this.chains[ruleName];
  }
}
