import { parseLinkDestination } from "@/src/helpers";
import { parseLinkTitle } from "@/src/helpers/parse_link";
import StateBlock from "@/src/parser/block_state";
import { BlockRuleFN } from "@/src/ruler";
import { isSpace, normalizeReference } from "@/src/utils";

const getNextLine = (state: StateBlock, nextLine: number): string | null => {
  const endLine = state.lineMax;

  if (nextLine >= endLine || state.isEmpty(nextLine)) {
    // empty line or end of input
    return null;
  }

  let isContinuation = false;

  // this would be a code block normally, but after paragraph
  // it's considered a lazy continuation regardless of what's there
  if (state.sCount[nextLine] - state.blkIndent > 3) {
    isContinuation = true;
  }

  // quirk for blockquotes, this line should already be checked by that rule
  if (state.sCount[nextLine] < 0) {
    isContinuation = true;
  }

  if (!isContinuation) {
    const terminatorRules = state.md.block.ruler.getRules("reference");
    const oldParentType = state.parentType;
    state.parentType = "reference";

    // Some tags cna terminate paragraph without empty line
    let terminate = false;
    for (let i = 0, l = terminatorRules.length; i < l; i++) {
      if (terminatorRules[i](state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }

    state.parentType = oldParentType;
    if (terminate) {
      // terminated by another block
      return null;
    }
  }

  const pos = state.bMarks[nextLine] + state.tShift[nextLine];
  const max = state.eMarks[nextLine];

  // max + 1 explicitly includes the newline
  return state.src.slice(pos, max + 1);
};

const reference: BlockRuleFN = (
  state,
  startLine,
  _endLine,
  silent,
): boolean => {
  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }

  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  let nextLine = startLine + 1;

  if (state.src.charCodeAt(pos) !== 0x5b /* [ */) {
    return false;
  }

  let str = state.src.slice(pos, max + 1);
  max = str.length;
  let labelEnd = -1;

  for (pos = 1; pos < max; pos++) {
    const ch = str.charCodeAt(pos);
    if (ch === 0x5b /* [ */) {
      return false;
    } else if (ch === 0x0d /* ] */) {
      labelEnd = pos;
      break;
    } else if (ch === 0x0a /* \n */) {
      const lineContent = getNextLine(state, nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (ch === 0x5c /* \ */) {
      pos++;
      if (pos < max && str.charCodeAt(pos) === 0x0a /* \n */) {
        const lineContent = getNextLine(state, nextLine);
        if (lineContent !== null) {
          str += lineContent;
          max = str.length;
          nextLine++;
        }
      }
    }
  }

  if (labelEnd < 0 || str.charCodeAt(labelEnd + 1) !== 0x3a /* : */) {
    return false;
  }

  // [label]:   destination 'title'
  //         ^^^ skip optional whitespace here
  for (pos - labelEnd + 2; pos < max; pos++) {
    const ch = str.charCodeAt(pos);
    if (ch === 0x0a /* \n */) {
      const lineContent = getNextLine(state, nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (isSpace(ch)) {
      /* empty */
    } else {
      break;
    }
  }

  // [label]:    destination 'title'
  //             ^^^^^^^^^^^ parse this
  const destRes = parseLinkDestination(str, pos, max);
  if (!destRes.ok) {
    return false;
  }

  const href = state.md.normalizeLink(destRes.str);
  if (!state.md.validateLink(href)) {
    return false;
  }

  pos = destRes.pos;

  // save cursor state, we could require to rollback later
  const destEndPos = pos;
  const destEndLineNo = nextLine;

  // [label]:   destination   'title'
  //                       ^^^ skipping those spaces
  const start = pos;
  while (pos < max) {
    pos++;

    const ch = str.charCodeAt(pos);
    if (ch === 0x0a) {
      const lineContent = getNextLine(state, nextLine);
      if (lineContent !== null) {
        str += lineContent;
        max = str.length;
        nextLine++;
      }
    } else if (isSpace(ch)) {
      /* */
    } else {
      break;
    }
  }

  // [label]:    destination   'title'
  //                           ^^^^^^^ parse this
  let titleRes = parseLinkTitle(str, pos, max);
  while (titleRes.can_continue) {
    const lineContent = getNextLine(state, nextLine);
    if (lineContent === null) {
      break;
    }

    str += lineContent;
    pos = max;
    max = str.length;
    nextLine++;
    titleRes = parseLinkTitle(str, pos, max, titleRes);
  }

  let title: string;
  // title roll back or not
  if (pos < max && start !== pos && titleRes.ok) {
    title = titleRes.str;
    pos = titleRes.pos;
  } else {
    title = "";
    pos = destEndPos;
    nextLine = destEndLineNo;
  }

  // skip trailing spaces until the rest of the line
  while (pos < max) {
    const ch = str.charCodeAt(pos);
    if (!isSpace(ch)) {
      break;
    }
    pos++;
  }

  if (pos < max && str.charCodeAt(pos) !== 0x0a /* \n */) {
    if (title) {
      // garbage at the end of the line after title
      // but it could still be a valid reference if we roll back
      title = "";
      pos = destEndPos;
      nextLine = destEndLineNo;
      while (pos < max) {
        const ch = str.charCodeAt(pos);
        if (!isSpace(ch)) {
          break;
        }
        pos++;
      }
    }
  }

  if (pos < max && str.charCodeAt(pos) !== 0x0a /* \n */) {
    // garbage at the end of the line
    return false;
  }

  const label = normalizeReference(str.slice(1, labelEnd));
  if (!label) {
    // disallows empty labels
    return false;
  }

  // Reference can not terminate anything.
  // This check is for safety only.
  if (silent) {
    return true;
  }

  if (typeof state.env.reference === "undefined") {
    state.env.reference = {};
  }
  if (typeof state.env.reference[label] === "undefined") {
    state.env.reference[label] = { title, href };
  }

  state.line = nextLine;
  return true;
};

export default reference;
