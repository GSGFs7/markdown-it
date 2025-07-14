import StateCore from "@/src/parser/core_state";
import { CoreRuleFN } from "@/src/ruler";

// convert URLs, emails, etc. in text into clickable links

// '<a>' or '<a '
const isLinkOpen = (str: string) => {
  return /^<a[>\s]/i.test(str);
};

// '</a>' or '</a >' (any number of space is allowed)
const isLinkClose = (str: string) => {
  return /^<\/a\s*>/i.test(str);
};

const linkify: CoreRuleFN = (state: StateCore) => {
  if (!state.md.options.linkify) {
    return;
  }

  const blockTokens = state.tokens;

  for (const blockToken of blockTokens) {
    if (
      blockToken.type !== "inline" ||
      state.md.linkify.pretest(blockToken.content)
    ) {
      continue;
    }

    // TODO
  }
};

export default linkify;
