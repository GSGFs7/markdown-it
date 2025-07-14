import StateCore from "@/src/parser/core_state";
import { CoreRuleFN } from "@/src/ruler";
import Token from "@/src/token";

/**
 * Core rule function for processing block-level or inline-level Markdown content.
 *
 * @param state - The current parsing state, containing the source text, environment, and token stream.
 *
 * If `state.inlineMode` is `true`, this function creates a single inline token containing the entire source.
 * Otherwise, it delegates parsing to the block parser, which processes the source into block-level tokens.
 */
const block: CoreRuleFN = (state: StateCore): void => {
  if (state.inlineMode) {
    const token = new Token("inline", "", 0);
    token.content = state.src;
    token.map = [0, 1];
    token.children = [];
    state.tokens.push(token);
  } else {
    state.md.block.parse(state.src, state.md, state.env, state.tokens);
  }
};

export default block;
