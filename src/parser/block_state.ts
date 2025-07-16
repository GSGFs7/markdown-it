import Markdown from "../markdown";
import { TagType } from "../renderer";
import Token, { TokenType } from "../token";
import { isSpace } from "../utils";

export default class StateBlock {
  /** */
  src: string;

  /** */
  md: Markdown;

  /** */
  env;

  /** */
  tokens: Token[];

  /**
   * line begin offsets for fast jumps
   */
  bMarks: number[];

  /**
   * line end offsets for fast jumps
   */
  eMarks: number[];

  /**
   * offsets of the first non-space characters (tabs not expand)
   */
  tShift: number[];

  /**
   * indents for each line (tabs expanded)
   */
  sCount: number[];

  /** */
  bsCount: number[];

  /** */
  blkIndex: number;

  /** */
  line: number;

  /** */
  lineMax: number;

  /** */
  tight: boolean;

  /** */
  ddIndex: number;

  /** */
  listIndex: number;

  /** */
  parentType: "root" | "list" | "blockquote" | "paragraph" | "reference";

  /** */
  level: number;

  constructor(src: string, md: Markdown, env, tokens: Token[]) {
    this.src = src;
    this.md = md;
    this.env = env;
    this.tokens = tokens;

    this.bMarks = [];
    this.eMarks = [];
    this.tShift = [];
    this.sCount = [];
    this.bsCount = [];

    this.blkIndex = 0;
    this.line = 0;
    this.lineMax = 0;
    this.tight = false;
    this.ddIndex = -1;
    this.listIndex = -1;

    this.parentType = "root";

    this.level = 0;

    // split markdown string to lines and mark it
    const s = this.src;
    const len = s.length;
    let start = 0;
    let indent = 0;
    let offset = 0;
    let index_found = false;
    for (let pos = 0; pos < len; pos++) {
      const ch = s.charCodeAt(pos);

      // process line head
      if (!index_found) {
        if (isSpace(ch)) {
          indent++;

          // Calculate how many spaces need to add to get to the next tab stop.
          // Such as the situation of space mix with tab
          // If two space mix with a tab, the teb will transition to two space
          if (ch === 0x09) {
            // tab
            offset += 4 - (offset % 4);
          } else {
            offset++;
          }

          continue;
        } else {
          index_found = true;
        }
      }

      // process line tail
      if (ch === 0x0a || pos === len - 1) {
        // '\n', Line Feed
        if (ch !== 0x0a) {
          pos++;
        }

        // mark as new line
        this.bMarks.push(start);
        this.eMarks.push(pos);
        this.tShift.push(indent);
        this.sCount.push(offset);
        this.bsCount.push(0);

        // start new line
        index_found = false;
        indent = 0;
        offset = 0;
        start = pos + 1;
      }
    }

    // Push fake entry to simplify cache bounds checks
    this.bMarks.push(s.length);
    this.eMarks.push(s.length);
    this.tShift.push(0);
    this.sCount.push(0);
    this.bsCount.push(0);

    // don't count the last fake line
    this.lineMax = this.bMarks.length - 1;
  }

  /**
   * Adds a new block-level token to the state.
   *
   * @param type - The type of the token to create.
   * @param tag - The tag associated with the token.
   * @param nesting - The nesting level change for the token. Positive values decrease the current level, negative values increase it.
   * @returns The newly created token.
   */
  push(type: TokenType, tag: TagType, nesting: number) {
    const token = new Token(type, tag, nesting);
    token.block = true;

    if (nesting < 0) this.level++;
    token.level = this.level;
    if (nesting > 0) this.level--;

    this.tokens.push(token);
    return token;
  }

  /**
   * Skip char code from given position
   *
   * Skips consecutive characters in the source string starting from the given position,
   * as long as they match the specified character code.
   *
   * @param pos - The starting position in the source string.
   * @param code - The character code to skip.
   * @returns The position of the first character that does not match the specified code,
   *          or the length of the source string if all remaining characters match.
   */
  skipChars(pos: number, code: number): number {
    for (let max = this.src.length; pos < max; pos++) {
      if (this.src.charCodeAt(pos) !== code) {
        break;
      }
    }
    return pos;
  }

  /**
   * Skip char codes reverse from given position - 1
   *
   * Moves the position `pos` backwards in the source string as long as the character code at each position
   * matches the specified `code`, stopping at the `min` boundary (inclusive).
   *
   * @param pos - The starting position in the source string to move backwards from.
   * @param code - The character code to match while moving backwards.
   * @param min - The minimum position (inclusive) to stop moving backwards.
   * @returns The new position after skipping matching characters, or the original position if no matches are found.
   */
  skipCharsBack(pos: number, code: number, min: number): number {
    if (pos <= min) {
      return pos;
    }

    while (pos > min) {
      if (code !== this.src.charCodeAt(--pos)) {
        return pos + 1;
      }
    }

    return pos;
  }

  /**
   * Skips over empty lines starting from the given line number.
   *
   * An empty line is determined by checking if the sum of the beginning mark (`bMarks[line]`)
   * and the indentation shift (`tShift[line]`) is less than the end mark (`eMarks[line]`).
   * The method increments the line number until a non-empty line is found or the end of the document is reached.
   *
   * @param line - The line number to start checking from.
   * @returns The line number of the first non-empty line found, or `lineMax` if none are found.
   */
  skipEmptyLines(line: number): number {
    for (; line < this.lineMax; line++) {
      if (this.bMarks[line] + this.tShift[line] < this.eMarks[line]) {
        break;
      }
    }
    return line;
  }

  /**
   * Skip spaces from given position
   *
   * Advances the given position past any consecutive whitespace characters in the source string.
   *
   * @param pos - The starting position in the source string.
   * @returns The position of the first non-whitespace character at or after the given position.
   */
  skipSpaces(pos: number): number {
    for (let max = this.src.length; pos < max; pos++) {
      const ch = this.src.charCodeAt(pos);
      if (!isSpace(ch)) {
        break;
      }
    }
    return pos;
  }

  /**
   * Skip spaces from given position in reverse
   *
   * Starts at `pos - 1` and moves backwards until a non-space character is found or `min` is reached.
   * Returns the position of the first non-space character after skipping, or `min` if none found.
   *
   * @param pos - The starting position (exclusive) to begin skipping spaces backwards.
   * @param min - The minimum position (inclusive) to stop searching.
   * @returns The position after the last skipped space character, or `min` if no spaces were skipped.
   */
  skipSpacesBack(pos: number, min: number): number {
    if (pos <= min) {
      return pos;
    }

    while (pos > min) {
      if (!isSpace(this.src.charCodeAt(--pos))) {
        return pos + 1;
      }
    }

    return pos;
  }

  /**
   * Determines whether the specified line is empty.
   *
   * A line is considered empty if the sum of its beginning mark (`bMarks[line]`)
   * and the indentation shift (`tShift[line]`) is greater than or equal to its end mark (`eMarks[line]`).
   *
   * @param line - The index of the line to check.
   * @returns `true` if the line is empty; otherwise, `false`.
   */
  isEmpty(line: number): boolean {
    return this.bMarks[line] + this.tShift[line] >= this.eMarks[line];
  }

  getLines(begin: number, end: number, indent: number, keepLastLF: boolean) {
    if (begin >= end) {
      return "";
    }

    const queue = new Array(end - begin);
    for (let i = 0, line = begin; line < end; i++, line++) {
      const lineStart: number = this.bMarks[line];
      let lineIndent: number = 0;
      let first: number = lineStart;
      let last: number;

      if (line + 1 < end || keepLastLF) {
        last = this.eMarks[line] + 1;
      } else {
        last = this.eMarks[line];
      }

      while (first < last && lineIndent < indent) {
        const ch = this.src.charCodeAt(first);

        if (isSpace(ch)) {
          if (ch === 0x09 /* '\t', Tab */) {
            lineIndent += 4 - ((lineIndent + this.bsCount[line]) % 4);
          } else {
            lineIndent++;
          }
        } else if (first - lineStart < this.tShift[line]) {
          lineIndent++;
        } else {
          break;
        }

        first++;
      }

      if (lineIndent > indent) {
        queue[i] =
          new Array(lineIndent - indent + 1).join(" ") +
          this.src.slice(first, end);
      } else {
        queue[i] = this.src.slice(first, last);
      }
    }

    return queue.join("");
  }
}
