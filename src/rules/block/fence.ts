import { BlockRuleFN } from "@/src/ruler";

/// fences (``` lang, ~~~ lang)

const fence: BlockRuleFN = (state, startLine, endLine, silent): boolean => {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndex >= 4) {
    return false;
  }

  // "```" or "~~~"
  if (pos + 3 > max) {
    return false;
  }

  const marker = state.src.charCodeAt(pos);
  if (marker !== 0x7e /* ~ */ && marker !== 0x60 /* ` */) {
    return false;
  }

  // scan marker length
  let mem = pos;
  pos = state.skipChars(pos, marker);

  let len = pos - mem;
  if (len < 3) {
    return false;
  }

  const markup = state.src.slice(mem, pos); // "`" or "~"
  const params = state.src.slice(pos, max); // lang
  if (marker === 0x60 /* ` */) {
    if (params.indexOf(String.fromCharCode(marker)) >= 0) {
      return false;
    }
  }

  // Since start is found, we can report success here in validation mode
  if (silent) {
    return true;
  }

  let nextLine = startLine;
  let haveEndMarker = false;

  while (true) {
    nextLine++;
    if (nextLine >= endLine) {
      // unclosed block should be auto closed by end of document
      // also block seems to be auto closed by end of parent
      break;
    }

    // new line
    pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];

    if (pos < max && state.sCount[nextLine] < state.blkIndex) {
      break;
    }

    if (state.src.charCodeAt(pos) !== marker) {
      continue;
    }

    // closing fence should be indented less than 4 space
    if (state.sCount[nextLine] - state.blkIndex >= 4) {
      continue;
    }

    pos = state.skipChars(pos, marker);

    if (pos - mem < len) {
      continue;
    }

    pos = state.skipSpaces(pos);

    if (pos < max) {
      continue;
    }

    // found
    haveEndMarker = true;
    break;
  }

  // if a fence has heading spaces, they should be removed from its inner block
  len = state.sCount[startLine];

  state.line = nextLine + (haveEndMarker ? 1 : 0);

  const token = state.push("fence", "code", 0);
  token.info = params;
  token.content = state.getLines(startLine + 1, nextLine, len, true);
  token.markup = markup;
  token.map = [startLine, state.line];

  return true;
};

export default fence;
