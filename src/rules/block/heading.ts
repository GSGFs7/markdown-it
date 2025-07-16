import { BlockRuleFN } from "@/src/ruler";
import { isSpace } from "@/src/utils";

type headingLevels = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const headingLevel = (level: number): headingLevels => {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    case 4:
      return "h4";
    case 5:
      return "h5";
    case 6:
      return "h6";
    default:
      throw new Error("Invalid heading level");
  }
};

const heading: BlockRuleFN = (state, startLine, _endLine, silent): boolean => {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndex >= 4) {
    return false;
  }

  let ch = state.src.charCodeAt(pos);
  if (ch !== 0x23 /* # */ || pos >= max) {
    return false;
  }

  // count heading level
  let level = 1;
  ch = state.src.charCodeAt(++pos);
  while (ch === 0x23 /* # */ && pos < max && level <= 6) {
    level++;
    ch = state.src.charCodeAt(++pos);
  }

  if (level > 6 || (pos < max && !isSpace(ch))) {
    return false;
  }

  // pass the check
  if (silent) {
    return true;
  }

  // cut tails like '    ###  ' from the end of string
  max = state.skipSpacesBack(max, pos);
  const tmp = state.skipCharsBack(max, 0x23 /* # */, pos);
  if (tmp > pos && isSpace(state.src.charCodeAt(tmp - 1))) {
    max = tmp;
  }

  state.line = startLine + 1;

  const token_o = state.push("heading_open", headingLevel(level), 1);
  token_o.markup = "######".slice(0, level);
  token_o.map = [startLine, state.line];

  const token_i = state.push("inline", "", 0);
  token_i.content = state.src.slice(pos, max).trim();
  token_i.map = [startLine, state.line];
  token_i.children = [];

  const token_c = state.push("heading_close", headingLevel(level), -1);
  token_c.markup = "######".slice(0, level);

  return true;
};

export default heading;
