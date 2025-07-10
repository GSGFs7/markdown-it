import Markdown from "../markdown";
import Token from "../token";
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

  push() {}

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
}
