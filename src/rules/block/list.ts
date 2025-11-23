import StateBlock from "@/src/parser/block_state";
import { BlockRuleFN } from "@/src/ruler";
import Token from "@/src/token";
import { isSpace } from "@/src/utils";

// search `\d+[.)][\n ]`, return next pos after marker on success or -1 in fail.
const skipOrderedListMarker = (
  state: StateBlock,
  startLine: number,
): number => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  let pos = start;

  // List marker should have at least 2 chars (digit + dot)
  if (pos + 1 >= max) {
    return -1;
  }

  let ch = state.src.charCodeAt(pos++);
  if (ch <= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) {
    return -1;
  }

  while (true) {
    // EOL -> fail
    if (pos >= max) {
      return -1;
    }

    ch = state.src.charCodeAt(pos++);

    if (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) {
      // List marker should have no more than 9 digits
      // (prevents integer overflow in browsers)
      if (pos - start >= 10) {
        return -1;
      }

      continue;
    }

    // found valid marker
    if (ch === 0x29 /* ) */ || ch === 0x2e /* . */) {
      break;
    }

    return -1;
  }

  if (pos < max) {
    ch = state.src.charCodeAt(pos);

    if (!isSpace(ch)) {
      // "1.test" - is not a list item
      return -1;
    }
  }

  return pos;
};

// search `[-+*][\n ]`, return next pos after marker on success or -1 on fail
const skipBulletListMarker = (state: StateBlock, startLine: number): number => {
  const max = state.eMarks[startLine];
  let pos = state.bMarks[startLine] + state.tShift[startLine];

  const markder = state.src.charCodeAt(pos++);
  if (
    markder !== 0x2a /* * */ &&
    markder !== 0x2d /* - */ &&
    markder !== 0x2b /* + */
  ) {
    return -1;
  }

  if (pos < max) {
    const ch = state.src.charCodeAt(pos);

    if (!isSpace(ch)) {
      // "-test" - is not a list item
      return -1;
    }
  }

  return pos;
};

const markToghtParagraphs = (state: StateBlock, idx: number): void => {
  const level = state.level + 2;

  for (let i = idx + 2, l = state.tokens.length - 2; i < l; i++) {
    if (
      state.tokens[i].level === level &&
      state.tokens[i].type === "paragraph_open"
    ) {
      state.tokens[i + 2].hidden = true;
      state.tokens[i].hidden = true;
      i += 2;
    }
  }
};

const list: BlockRuleFN = (state, startLine, endLine, silent): boolean => {
  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }

  let max: number;
  let pos: number;
  let start: number = startLine;
  let token: Token;
  let nextLine = startLine;
  let tight = true;

  // Special case:
  // - item 1
  //  - item 2
  //   - item 3
  //    - item 4
  //     - this one is a paragraph continuation
  if (
    state.listIndent >= 0 &&
    state.sCount[nextLine] - state.listIndent >= 4 &&
    state.sCount[nextLine] < state.blkIndent
  ) {
    return false;
  }

  // limit conditions when list can interrupt
  // a paragraph (validation)
  let isTerminatingParagraph = false;
  if (silent && state.parentType === "paragraph") {
    // Next list item should still terminate pervious list item
    if (state.sCount[nextLine] >= state.blkIndent) {
      isTerminatingParagraph = true;
    }
  }

  // Detect list type and position after marker
  let isOrdered: boolean;
  let markerValue: number = 0;
  let posAfterMarker: number;
  if ((posAfterMarker = skipOrderedListMarker(state, nextLine)) >= 0) {
    isOrdered = true;
    start = state.bMarks[nextLine] + state.tShift[nextLine];
    markerValue = Number(state.src.slice(start, posAfterMarker - 1));

    // If we're starting a new ordered list right after a paragraph, it should start with 1.
    if (isTerminatingParagraph && markerValue !== 1) {
      return false;
    }
  } else if ((posAfterMarker = skipBulletListMarker(state, nextLine)) >= 0) {
    isOrdered = false;
  } else {
    return false;
  }

  // If we're starting a new unordered list right after a paragraph, first line should not be empty.
  if (isTerminatingParagraph) {
    if (state.skipSpaces(posAfterMarker) >= state.eMarks[nextLine]) {
      return false;
    }
  }

  // For validation mode we can terminate immediately
  if (silent) {
    return true;
  }

  // We should terminate list on style change. Remember first one to compare.
  const markerCharCode = state.src.charCodeAt(posAfterMarker - 1);

  // Start list
  const listTokIdx = state.tokens.length;

  if (isOrdered) {
    token = state.push("ordered_list_open", "ol", 1);
    if (markerValue !== 1) {
      token.attrs = [["start", markerValue]];
    }
  } else {
    token = state.push("bullet_list_open", "ul", 1);
  }

  const listLines: [number, number] = [nextLine, 0];
  token.map = listLines;
  token.markup = String.fromCharCode(markerCharCode);

  // Iterate list item

  let prevEmptyEnd = false;
  const terminatorRules = state.md.block.ruler.getRules("list");
  const oldPrentType = state.parentType;
  state.parentType = "list";

  while (nextLine < endLine) {
    pos = posAfterMarker;
    max = state.eMarks[nextLine];

    const initial =
      state.sCount[nextLine] +
      posAfterMarker -
      (state.bMarks[nextLine] + state.tShift[nextLine]);
    let offset = initial;

    while (pos < max) {
      const ch = state.src.charCodeAt(pos);

      if (ch === 0x09) {
        offset += 4 - ((offset + state.bsCount[nextLine]) % 4);
      } else if (ch === 0x20) {
        offset++;
      } else {
        break;
      }

      pos++;
    }

    const contentStart = pos;
    let indentAfterMarker: number;
    if (contentStart >= max) {
      // trimming space in "-    \n  3" case, indext is 1 here
      indentAfterMarker = 1;
    } else {
      indentAfterMarker = offset - initial;
    }

    // If have more than 4 spaces, the indent is 1
    if (indentAfterMarker > 4) {
      indentAfterMarker = 1;
    }

    // "  -  test"
    //  ^^^^^ - calculating total length of this thing
    const indent = initial + indentAfterMarker;

    token = state.push("list_item_open", "li", 1);
    token.markup = String.fromCharCode(markerCharCode);
    const itemLines: [number, number] = [nextLine, 0];
    token.map = itemLines;
    if (isOrdered) {
      token.info = state.src.slice(start, posAfterMarker - 1);
    }

    // change current state, than restore it after parser subcall
    const oldTight = state.tight;
    const oldTShift = state.tShift[nextLine];
    const oldSCount = state.sCount[nextLine];

    //  - example list
    // ^ listIndent position will be here
    //   ^ blkIndent position will be here
    const oldListIndent = state.listIndent;
    state.listIndent = state.blkIndent;
    state.blkIndent = indent;
    state.tight = true;
    state.tShift[nextLine] = contentStart - state.bMarks[nextLine];
    state.sCount[nextLine] = offset;

    if (contentStart >= max && state.isEmpty(nextLine + 1)) {
      state.line = Math.min(state.line + 2, endLine);
    } else {
      // state.md.block.tokenize(state, nextLine, endLine, true);
      // 4 args???
      // https://github.com/markdown-it/markdown-it/blob/d2782d892a51201b25d3eeab172201ad5a53a24c/lib/parser_block.mjs#L56
      // This function only requires 3 args
      state.md.block.tokenize(state, nextLine, endLine);
    }

    // If any of list is tight, mark list as tight
    if (!state.tight || prevEmptyEnd) {
      tight = false;
    }
    // Item become loose if finish with empty line,
    // but we should filter last element, because it means list finish.
    prevEmptyEnd = (state.line, nextLine) > 1 && state.isEmpty(state.line - 1);

    state.blkIndent = state.listIndent;
    state.listIndent = oldListIndent;
    state.tShift[nextLine] = oldTShift;
    state.sCount[nextLine] = oldSCount;
    state.tight = oldTight;

    token = state.push("list_item_close", "li", -1);
    token.markup = String.fromCharCode(markerCharCode);

    nextLine = state.line;
    itemLines[1] = nextLine;

    if (nextLine >= endLine) {
      break;
    }

    // Try to check if list is terminated or continued
    if (state.sCount[nextLine] < state.blkIndent) {
      break;
    }

    // If it's indented more than 3 spaces, it should be a code block
    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      break;
    }

    // fail if terminating block found
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }

    if (isOrdered) {
      posAfterMarker = skipOrderedListMarker(state, nextLine);
      if (posAfterMarker < 0) {
        break;
      }
      start = state.bMarks[nextLine] + state.tShift[nextLine];
    } else {
      posAfterMarker = skipBulletListMarker(state, nextLine);
      if (posAfterMarker < 0) {
        break;
      }
    }
    if (markerCharCode !== state.src.charCodeAt(posAfterMarker - 1)) {
      break;
    }
  }

  // Finalize list
  if (isOrdered) {
    token = state.push("ordered_list_close", "ol", -1);
  } else {
    token = state.push("bullet_list_close", "ul", -1);
  }
  token.markup = String.fromCharCode(markerCharCode);

  listLines[1] = nextLine;
  state.line = nextLine;

  state.parentType = oldPrentType;

  if (tight) {
    markToghtParagraphs(state, listTokIdx);
  }

  return true;
};

export default list;
