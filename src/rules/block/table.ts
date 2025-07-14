import StateBlock from "@/src/parser/block_state";
import { BlockRuleFN } from "@/src/ruler";
import { isSpace } from "@/src/utils";

/**
 * Extracts and returns the content of a specific line from the markdown source,
 * accounting for block marks and tab shifts.
 *
 * @param state - The current parsing state containing source and line markers.
 * @param line - The line number to extract from the source.
 * @returns The content of the specified line as a string without leading space.
 */
const getLine = (state: StateBlock, line: number): string => {
  const start = state.bMarks[line] + state.tShift[line];
  const end = state.eMarks[line];

  return state.src.slice(start, end);
};

/**
 * Splits a string by the pipe character (`|`), treating escaped pipes (`\|`) as literal characters.
 *
 * This function is useful for parsing Markdown table rows, where cell separators are unescaped pipes,
 * and escaped pipes should be included in the cell content.
 *
 * @param str - The input string to split.
 * @returns An array of strings, split by unescaped pipe characters.
 */
const escapedSplit = (str: string) => {
  const result: string[] = [];
  const max: number = str.length;

  let pos: number = 0;
  let ch: number = str.charCodeAt(pos);
  let isEscaped: boolean = false;
  let lastPos: number = 0;
  let current: string = "";

  while (pos < max) {
    if (ch === 0x7c /* | */) {
      if (!isEscaped) {
        result.push(current + str.substring(lastPos, pos));
        current = "";
        lastPos = pos + 1;
      } else {
        current += str.substring(lastPos, pos - 1);
        lastPos = pos;
      }
    }

    isEscaped = ch === 0x5c /* \ */;
    ch = str.charCodeAt(++pos);
  }

  result.push(current + str.substring(lastPos));

  return result;
};

const table: BlockRuleFN = (state, startLine, endLine, silent) => {
  // should have at least two lines
  if (startLine + 2 > endLine) {
    return false;
  }

  const nextLine = startLine + 1;
  if (state.sCount[nextLine] < state.blkIndex) {
    return false;
  }
  // If it's indented more than 3 space, it should be a code block.
  if (state.sCount[nextLine] - state.blkIndex >= 4) {
    return false;
  }

  let pos = state.bMarks[nextLine] + state.tShift[nextLine];
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }

  const firstCh = state.src.charCodeAt(pos++);
  if (
    firstCh !== 0x7c /* | */ &&
    firstCh !== 0x2d /* - */ &&
    firstCh !== 0x3a /* : */
  ) {
    return false;
  }
  if (pos >= state.eMarks[nextLine]) {
    return false;
  }

  const secondCh = state.src.charCodeAt(pos++);
  if (
    secondCh !== 0x7c /* | */ &&
    secondCh !== 0x2d /* - */ &&
    secondCh !== 0x3a /* : */ &&
    !isSpace(secondCh)
  ) {
    return false;
  }
  // If first character is '-', then second character must not be a space
  // (due to parsing ambiguity with list)
  if (firstCh === 0x2d /* - */ && isSpace(secondCh)) {
    return false;
  }

  while (pos < state.eMarks[nextLine]) {
    const ch = state.src.charCodeAt(pos);

    // must continuous
    if (
      ch !== 0x7c /* | */ &&
      ch !== 0x2d /* - */ &&
      ch !== 0x3a /* : */ &&
      !isSpace(ch)
    ) {
      return false;
    }

    pos++;
  }

  let lineText = getLine(state, startLine + 1);
  let columns = lineText.split("|");
  const aligns: ("left" | "center" | "right" | "")[] = [];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const t = column.trim();
    // empty column
    if (t === "") {
      // Allow empty columns before and after table, but not in between columns
      // e.g. allow ` |---| `, disallow ` ---||--- `
      // ` |---| ` -> ["", "---", ""]
      if (i === 0 || i === column.length - 1) {
        continue;
      } else {
        return false;
      }
    }

    // left aligned, center aligned or right aligned
    if (!/^:?-+:?$/.test(t)) {
      return false;
    }
    if (t.charCodeAt(t.length - 1) === 0x3a /* : */) {
      aligns.push(t.charCodeAt(0) === 0x3a /* : */ ? "center" : "right");
    } else if (t.charCodeAt(0) === 0x3a /* : */) {
      aligns.push("left");
    } else {
      aligns.push("");
    }
  }

  lineText = getLine(state, startLine).trim();
  if (lineText.indexOf("|") === -1) {
    return false;
  }
  if (state.sCount[startLine] - state.blkIndex >= 4) {
    return false;
  }

  columns = escapedSplit(lineText);
  if (columns.length && columns[0] === "") {
    columns.shift();
  }
  if (columns.length && columns[columns.length - 1] === "") {
    columns.pop();
  }

  // header row will define an amount of columns in the entire table,
  // and align row should be exactly the same (the rest of the rows can differ)
  const columnCount = columns.length;
  if (columnCount === 0 || columnCount !== aligns.length) {
    return false;
  }

  if (silent) {
    return true;
  }

  // TODO

  return true;
};

export default table;
