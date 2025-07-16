import { InlineRuleFN } from "@/src/ruler";

/**
 * Determines whether the given character code represents a Markdown inline terminator character.
 *
 * Terminator characters are those that signal the end of a text run and the possible start of a Markdown inline element,
 * such as emphasis, links, or other syntax. This function checks for common Markdown special characters and line breaks.
 *
 * @param ch - The character code (number) to check.
 * @returns `true` if the character code is a Markdown inline terminator; otherwise, `false`.
 */
const isTerminatorChar = (ch: number) => {
  switch (ch) {
    case 0x0a /* \n */:
    case 0x21 /* ! */:
    case 0x23 /* # */:
    case 0x24 /* $ */:
    case 0x25 /* % */:
    case 0x26 /* & */:
    case 0x2a /* * */:
    case 0x2b /* + */:
    case 0x2d /* - */:
    case 0x3a /* : */:
    case 0x3c /* < */:
    case 0x3d /* = */:
    case 0x3e /* > */:
    case 0x40 /* @ */:
    case 0x5b /* [ */:
    case 0x5c /* \ */:
    case 0x5d /* ] */:
    case 0x5e /* ^ */:
    case 0x5f /* _ */:
    case 0x60 /* ` */:
    case 0x7b /* { */:
    case 0x7d /* } */:
    case 0x7e /* ~ */:
      return true;
    default:
      return false;
  }
};

/**
 * Rule to skip pure text.
 *
 * Skip text characters for text token, place those to pending buffer and increment current pos.
 *
 * @param state - The current inline parsing state.
 * @param silent - If true, parsing is performed without modifying the state.
 * @returns True if any text was parsed; otherwise, false.
 */
const text: InlineRuleFN = (state, silent): boolean => {
  let pos = state.pos;

  while (pos < state.posMax && !isTerminatorChar(state.src.charCodeAt(pos))) {
    pos++;
  }

  if (pos === state.pos) {
    return false;
  }

  if (!silent) {
    state.pending += state.src.slice(state.pos, pos);
  }

  state.pos = pos;

  return true;
};

export default text;
