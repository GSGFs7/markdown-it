import Markdown from "../markdown";
import { BlockRuleFN, BlockRuler, Ruler } from "../ruler";
import Token from "../token";
import StateBlock from "./block_state";

import r_table from "../rules/block/table";
import r_paragraph from "../rules/block/paragraph";

type StateBlockConstructor = new (
  src: string,
  md: Markdown,
  env,
  outTokens: Token[],
) => StateBlock; // can be extend a child class

const _rules: [string, BlockRuleFN, string[]?][] = [
  ["table", r_table, ["paragraph", "reference"]],
  ["paragraph", r_paragraph],
];

export default class Block {
  ruler: BlockRuler;
  State: StateBlockConstructor;

  constructor() {
    this.ruler = new Ruler();
    this.State = StateBlock;

    for (const rule of _rules) {
      this.ruler.push(rule[0], rule[1], { alt: (rule[2] || []).slice() });
    }
  }

  /**
   * Tokenizes a block of lines in the Markdown parser state.
   *
   * This method iterates over the lines from `startLine` to `endLine`, applying block-level parsing rules
   * to generate tokens. It manages nesting, handles empty lines, and ensures that each rule advances the
   * parsing state correctly. If no rule matches a line, or if a rule fails to advance the line, an error is thrown.
   *
   * @param state - The current state of the block parser, containing the source lines, tokens, and parsing context.
   * @param startLine - The index of the first line to process.
   * @param endLine - The index one past the last line to process.
   *
   * @throws {Error} If no block rule matches a line, or if a rule does not advance the line.
   */
  tokenize(state: StateBlock, startLine: number, endLine: number) {
    const rules = this.ruler.getRules("");
    const maxNesting = state.md.options.maxNesting;
    let line = startLine;
    let hasEmptyLines = false;

    while (line < endLine) {
      state.line = line = state.skipEmptyLines(line);

      // empty
      if (line >= endLine) {
        break;
      }

      // Termination condition for nested calls.
      // Nested calls currently used for blockQuotes & lines.
      if (state.sCount[line] < state.blkIndex) {
        break;
      }

      // If nesting level exceeded - skip tail to the end.
      // That's not ordinary situation and we should not care about content.
      if (state.level >= maxNesting) {
        state.line = endLine;
        break;
      }

      // Try all possible rules.
      // On success. rule should:
      //
      // - update `state.line`
      // - update `state.tokens`
      // - return true
      const prevLine = state.line;
      let ok = false;

      for (const rule of rules) {
        ok = rule(state, line, endLine, false);
        if (ok) {
          if (prevLine >= state.line) {
            throw new Error("block rule didn't increment `state.line`");
          }
          break;
        }
      }

      // This can only happen if user disable paragraph rule.
      if (!ok) {
        throw new Error("none of the block rules matched");
      }

      // set `state.tight` if we had an empty line before current tag
      // i.e. last empty line should not count
      state.tight = !hasEmptyLines;

      // paragraph might "eat" one new line after it in nested lists
      if (state.isEmpty(state.line - 1)) {
        hasEmptyLines = true;
      }

      // sync current line
      line = state.line;

      if (line < endLine && state.isEmpty(line)) {
        hasEmptyLines = true;
        line++;
        state.line = line;
      }
    }
  }

  /**
   * Parses the given source string and generates block-level tokens.
   *
   * @param src - The source string to parse.
   * @param md - The Markdown parser instance.
   * @param env - The environment sandbox, used to store parsing state or metadata.
   * @param outTokens - The array to which parsed tokens will be pushed.
   * @returns Returns nothing if the source string is empty; otherwise, processes the input and populates `outTokens`.
   */
  parse(src: string, md: Markdown, env, outTokens: Token[]) {
    if (!src) {
      return;
    }

    const state = new this.State(src, md, env, outTokens);

    this.tokenize(state, state.line, state.lineMax);
  }
}
