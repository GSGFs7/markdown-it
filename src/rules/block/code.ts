import { BlockRuleFN } from "@/src/ruler";

// Code block (4 spaces padded)

/**
 * Block rule function for parsing indented code blocks in Markdown.
 *
 * This function checks if the current line starts an indented code block (at least 4 spaces).
 * It then continues to collect subsequent lines that are also indented by at least 4 spaces,
 * or are empty, until it reaches a line that is not sufficiently indented.
 * The collected lines are then added as a "code_block" token to the parser state.
 *
 * @param state - The current parser state, containing line information and utility methods.
 * @param startLine - The index of the line where the block starts.
 * @param endLine - The index of the line where the block parsing should end.
 * @returns `true` if a code block was successfully parsed, otherwise `false`.
 */
const code: BlockRuleFN = (state, startLine, endLine): boolean => {
  if (state.sCount[startLine] - state.blkIndex < 4) {
    return false;
  }

  let nextLine = startLine + 1;
  let last = nextLine;

  // empty line or at least 4 spaces indented line
  while (nextLine < endLine) {
    if (state.isEmpty(nextLine)) {
      nextLine++;
      continue;
    }

    if (state.sCount[nextLine] - state.blkIndex >= 4) {
      nextLine++;
      last = nextLine;
      continue;
    }

    break;
  }

  state.line = last;

  // add the token
  const token = state.push("code_block", "code", 0);
  token.content =
    state.getLines(startLine, last, 4 + state.blkIndex, false) + "\n";
  token.map = [startLine, state.line];

  return true;
};

export default code;
