import StateCore from "@/src/parser/core_state";
import { CoreRuleFN } from "@/src/ruler";

/**
 * Normalize input string.
 * @param {StateCore} state - Core state object to be normalized.
 */
const normalize: CoreRuleFN = (state: StateCore): void => {
  const newlineRe = /\r\n?|\n/g; // CRLF -> LF
  const nullRe = /\0/g; // remove '\0'

  state.src = state.src.replace(newlineRe, "\n");
  // replace NULL with Unicode replacement character
  state.src = state.src.replace(nullRe, "\uFFFD");
};

export default normalize;
