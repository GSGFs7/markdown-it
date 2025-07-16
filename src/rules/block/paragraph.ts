import { BlockRuleFN } from "@/src/ruler";

const paragraph: BlockRuleFN = (state, startLine, endLine): boolean => {
  const terminatorRules = state.md.block.ruler.getRules("paragraph");
  const oldParentType = state.parentType;
  let nextLine = startLine + 1;

  state.parentType = "paragraph";

  // jump line-by-line until empty one or EOF
  for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
    // this would be a code block
    if (state.sCount[nextLine] - state.blkIndex > 3) {
      continue;
    }
    // quirk for block quotes, this line should already be checked by that rule
    if (state.sCount[nextLine] < 0) {
      continue;
    }

    // some tags can terminate paragraph without empty line.
    let terminate = false;
    for (const rule of terminatorRules) {
      if (rule(state, nextLine, endLine, true)) {
        terminate = true;
        break;
      }
    }
    if (terminate) {
      break;
    }
  }

  const content = state
    .getLines(startLine, nextLine, state.blkIndex, false)
    .trim();

  state.line = nextLine;

  // return a Token reference, similar to pointer in c/c++
  // primitives type will be copy but object is not
  const token_o = state.push("paragraph_open", "p", 1);
  token_o.map = [startLine, state.line];

  const token_i = state.push("inline", "", 0);
  token_i.content = content;
  token_i.map = [startLine, state.line];
  token_i.children = [];

  state.push("paragraph_close", "p", -1);

  state.parentType = oldParentType;

  return true;
};

export default paragraph;
