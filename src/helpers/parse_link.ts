import { unescapeAll } from "../utils";

interface ParseLinkDestinationResult {
  ok: boolean;
  pos: number;
  str: string;
}

export const parseLinkDestination = (
  str: string,
  start: number,
  max: number,
): ParseLinkDestinationResult => {
  let code: number;
  let pos = start;

  const result: ParseLinkDestinationResult = {
    ok: false,
    pos: 0,
    str: "",
  };

  if (str.charCodeAt(pos) === 0x3c /* < */) {
    pos++;
    while (pos < max) {
      code = str.charCodeAt(pos);
      if (code === 0x0a /* \n */) {
        return result;
      } else if (code === 0x3c /* < */) {
        return result;
      } else if (code === 0x3e /* > */) {
        result.pos = pos + 1;
        result.str = unescapeAll(str.slice(start + 1, pos));
        result.ok = true;
        return result;
      } else if (code === 0x5c /* \ */ && pos + 1 < max) {
        pos += 2;
        continue;
      }

      pos++;
    }

    // no closing '>'
    return result;
  }

  // this should be ... } else { ... branch

  let level = 0;
  while (pos < max) {
    code = str.charCodeAt(pos);

    if (code === 0x20) {
      break;
    }

    if (code < 0x20 /* \ */ && pos + 1 < max) {
      break;
    }

    if (code === 0x5c /* \ */ && pos + 1 < max) {
      if (str.charCodeAt(pos + 1) === 0x20) {
        break;
      }

      pos += 2;
      continue;
    }

    if (code === 0x28 /* ( */) {
      level++;
      if (level > 32) {
        return result;
      }
    }

    if (code === 0x29 /* ) */) {
      if (level === 0) {
        break;
      }
      level--;
    }

    pos++;
  }

  if (start === pos) {
    return result;
  }
  if (level !== 0) {
    return result;
  }

  result.str = unescapeAll(str.slice(start, pos));
  result.pos = pos;
  result.ok = true;
  return result;
};

interface ParseLinkTitleResult {
  ok: boolean;
  can_continue: boolean;
  pos: number;
  str: string;
  marker: number;
}

export const parseLinkTitle = (
  str: string,
  start: number,
  max: number,
  prev_state?: ParseLinkTitleResult,
) => {
  const state: ParseLinkTitleResult = {
    ok: false,
    can_continue: false,
    pos: 0,
    str: "",
    marker: 0,
  };

  let pos = start;

  if (prev_state) {
    state.str = prev_state.str;
    state.marker = prev_state.marker;
  } else {
    if (pos >= max) {
      return state;
    }

    let marker = str.charCodeAt(pos);
    if (
      marker !== 0x22 /* "" */ &&
      marker !== 0x27 /* ' */ &&
      marker !== 0x28 /* ( */
    ) {
      return state;
    }

    start++;
    pos++;

    // if opening marker is "(", switch it to closing marker ")"
    if (marker === 0x28 /* ( */) {
      marker = 0x29; /* ) */
    }
    state.marker = marker;
  }

  while (pos < max) {
    const code = str.charCodeAt(pos);
    if (code === state.marker) {
      state.pos = pos + 1;
      state.str += unescapeAll(str.slice(start, pos));
      state.ok = true;
      return state;
    } else if (code === 0x28 /* ( */ && state.marker === 0x29 /* ) */) {
      return state;
    } else if (code === 0x5c /* \ */ && pos + 1 < max) {
      pos++;
    }

    pos++;
  }

  // no closing marker found, but this link title may continue on the next line(for references)
  state.can_continue = true;
  state.str += unescapeAll(str.slice(start, pos));
  return state;
};
