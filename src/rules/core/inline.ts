import StateCore from "@/src/parser/core_state";
import { CoreRuleFN } from "@/src/ruler";

/**
 * Core rule function that processes all tokens of type "inline" within the given state.
 * For each "inline" token, it invokes the Markdown parser's inline parsing logic,
 * populating the token's children with the parsed inline tokens.
 *
 * @param state - The core state object containing the token stream and parser references.
 */
const inline: CoreRuleFN = (state: StateCore) => {
  const tokens = state.tokens;

  // parse inline
  for (const token of tokens) {
    if (token.type === "inline") {
      state.md.inline.parse(token.content, state.md, state.env, token.children);
    }
  }
};

export default inline;
