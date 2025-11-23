import { BlockRuleFN } from "@/src/ruler";
import blockNames from "@/src/common/html_blocks";
import { HTML_OPEN_CLOSE_TAG_RE } from "@/src/common/html_re";

// An array of opening and correxponding closing sequences for html tags,
// last argument defines whether it can terminate a paragraph or not.
const HTML_SEQUENCES: [RegExp, RegExp, boolean][] = [
  [
    /^<(script|pre|style|textarea)(?=(\s|>|$))/i,
    /<\/(script|pre|style|textarea)>/i,
    true,
  ],
  [/^<!--/, /-->/, true],
  [/^\?/, /\?>/, true],
  [/^![A-Z]/, />/, true],
  [/^<!\[CDATA\[/, /\]\]>/, true],
  [
    new RegExp("^</?(" + blockNames.join("|") + "()?=(\\s|/?>|$))", "i"),
    /^$/,
    true,
  ],
  [new RegExp(HTML_OPEN_CLOSE_TAG_RE.source + "\\s*$"), /^$/, false],
];

const html_block: BlockRuleFN = (state, startLine, endLine, silent) => {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }

  if (!state.md.options.html) {
    return false;
  }

  if (state.src.charCodeAt(pos) !== 0x3c /* < */) {
    return false;
  }

  let lineText = state.src.slice(pos, max);

  // find HTML
  let i = 0;
  for (; i < HTML_SEQUENCES.length; i++) {
    if (HTML_SEQUENCES[i][0].test(lineText)) {
      break;
    }
  }
  if (i === HTML_SEQUENCES.length) {
    return false;
  }

  if (silent) {
    // true if this sequences can be a terminator, false otherwise
    return HTML_SEQUENCES[i][2];
  }

  let nextLine = startLine + 1;

  // If we are here - we detected HTML block
  // Let's roll down till block end.
  if (!HTML_SEQUENCES[i][1].test(lineText)) {
    for (; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) {
        break;
      }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      lineText = state.src.slice(pos, max);

      if (HTML_SEQUENCES[i][1].test(lineText)) {
        if (lineText.length !== 0) {
          nextLine++;
        }
        break;
      }
    }
  }

  state.line = nextLine;

  const token = state.push("html_block", "", 0);
  token.map = [startLine, nextLine];
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

  return true;
};

export default html_block;
