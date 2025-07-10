import StateCore from "@/src/parser/core_state";

/**
 * Normalize input string.
 * @param {StateCore} state - Core state object to be normalized.
 */
export default function normalize(state: StateCore): boolean {
  const newlineRe = /\r\n?|\n/g; // CRLF -> LF
  const nullRe = /\0/g; // remove '\0'

  state.src = state.src.replace(newlineRe, "\n");
  // replace NULL with Unicode replacement character
  state.src = state.src.replace(nullRe, "\uFFFD");

  return true;
}
