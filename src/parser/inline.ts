import Markdown from "../markdown";
import { InlineRuleFN, InlineRuler, Ruler } from "../ruler";
import Token from "../token";
import StateInline from "./inline_state";

const _rules: [string, InlineRuleFN][] = [];
const _rules2: [string, InlineRuleFN][] = [];

type StateInlineConstructor = new (
  src: string,
  md: Markdown,
  env,
  outTokens: Token[],
) => StateInline; // can be extend a child class

export default class Inline {
  private ruler: InlineRuler;
  private ruler2: InlineRuler;
  State: StateInlineConstructor;

  constructor() {
    this.ruler = new Ruler();
    this.ruler2 = new Ruler();
    this.State = StateInline;

    for (const rule of _rules) {
      this.ruler.push(rule[0], rule[1]);
    }

    for (const rule of _rules2) {
      this.ruler2.push(rule[0], rule[1]);
    }
  }

  /**
   * Tokenizes the input inline markdown text for input range using a set of parsing rules.
   *
   * Iterates through the input string (`state.src`) from the current position (`state.pos`)
   * up to the maximum position (`state.posMax`), applying each rule in sequence.
   * If a rule matches and processes input, it must advance `state.pos`. If no rule matches,
   * the current character is added to the pending buffer.
   *
   * When the pending buffer contains text, it is flushed to the token stream.
   * Throws an error if a rule does not advance the position after matching.
   *
   * @param state - The current inline parsing state, containing the source text,
   *                position, nesting level, and other parsing context.
   *
   * @throws {Error} If a rule matches but does not advance the parsing position.
   */
  tokenize(state: StateInline) {
    const rules = this.ruler.getRules("");
    const end = state.posMax;
    const maxNesting = state.md.options.maxNesting;

    while (state.pos < end) {
      const prev_pos = state.pos;
      let ok: boolean = false;

      if (state.level < maxNesting) {
        for (const rule of rules) {
          ok = rule(state, false);

          if (ok) {
            if (prev_pos >= state.pos) {
              throw new Error("inline rule didn't increment `state.pos`");
            }
            break;
          }
        }
      }

      if (ok) {
        if (state.pos >= end) {
          break;
        }
        continue;
      }

      state.pending += state.src[state.pos++];
    }

    if (state.pending) {
      state.pushPending();
    }
  }

  skipToken(state: StateInline) {
    const pos = state.pos;
    const rules = this.ruler.getRules("");
    const maxNesting = state.md.options.maxNesting;
    const cache = state.cache;

    if (typeof cache[pos] !== "undefined") {
      state.pos = cache[pos];
      return;
    }

    let ok: boolean = false;

    if (state.level < maxNesting) {
      for (const rule of rules) {
        state.level++;
        ok = rule(state, true);
        state.level--;

        if (ok) {
          if (pos >= state.pos) {
            throw new Error("inline rule didn't increment `state.pos`");
          }
          break;
        }
      }
    } else {
      state.pos = state.posMax;
    }

    if (!ok) {
      state.pos++;
    }
    cache[pos] = state.pos;
  }

  parse(str: string, md: Markdown, env, outTokens: Token[]) {
    // Strategy Pattern + Dependency Injection
    const state = new this.State(str, md, env, outTokens);

    this.tokenize(state);

    const rules = this.ruler2.getRules("");

    for (const rule of rules) {
      rule(state);
    }
  }
}
