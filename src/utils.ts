import { decodeHTML } from "entities";

export const isSpace = (code: number) => {
  switch (code) {
    case 0x09: // '\t', tab
    case 0x20: // ' ', space
      return true;
  }
  return false;
};

// Merge objects
// export const assign = (obj) => {
//   const sources = Array.prototype.slice.call(arguments, 1);

//   sources.forEach((source) => {
//     if (!source) {
//       return;
//     }

//     if (typeof source !== "object") {
//       throw new TypeError(source + "must be object");
//     }

//     Object.keys(source).forEach((key) => {
//       obj[key] = source[key];
//     });
//   });

//   return obj;
// };

/**
 * Checks if a character code is a valid Unicode code point for HTML entities.
 *
 * This function verifies that the code point is not within the ranges of surrogate pairs,
 * non-characters, control codes, or out of Unicode range. These checks help prevent
 * invalid or potentially unsafe Unicode characters from being used in HTML entities.
 *
 * @param code - The character code to check.
 * @returns True if the code is a valid Unicode code point for HTML entities, false otherwise.
 */
const isValidEntityCode = (code: number): boolean => {
  // Surrogate pairs (used in UTF-16, invalid as standalone code points)
  if (code >= 0xd800 && code <= 0xdfff) {
    return false;
  }
  // Non-characters (never used in Unicode)
  if (code >= 0xfdd0 && code <= 0xfdef) {
    return false;
  }
  // Non-characters (ending with FFFE or FFFF)
  if ((code & 0xffff) === 0xffff || (code & 0xffff) === 0xfffe) {
    return false;
  }
  // Control codes (C0 and C1 controls, except for allowed whitespace)
  if (code >= 0x00 && code <= 0x08) {
    return false;
  }
  if (code === 0x0b) {
    return false;
  }
  if (code >= 0x0e && code <= 0x1f) {
    return false;
  }
  if (code >= 0x7f && code <= 0x9f) {
    return false;
  }
  // Out of Unicode range
  if (code >= 0x10ffff) {
    return false;
  }
  return true;
};

const HTML_ESCAPE_TEST_RE = /[&<>"]/; // match '&', '<', '>' or '"'
const HTML_ESCAPE_RE = /[&<>"]/g; // Full replacement
const HTML_REPLACEMENTS = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

/**
 * Escapes special HTML characters in a string to prevent HTML injection.
 *
 * If the input string contains characters that need to be escaped (such as `<`, `>`, `&`, `"`),
 * this function replaces them with their corresponding HTML entities.
 *
 * @param str - The input string to escape.
 * @returns The escaped string with special HTML characters replaced, or the original string if no escaping is needed.
 */
export const escapeHtml = (str: string): string => {
  if (!HTML_ESCAPE_TEST_RE.test(str)) {
    return str;
  }
  return str.replace(HTML_ESCAPE_RE, (ch) => HTML_REPLACEMENTS[ch]);
};

const DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;
const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi;
const UNESCAPE_ALL_RE = new RegExp(
  UNESCAPE_MD_RE + "|" + ENTITY_RE.source,
  "gi",
);

const fromCodePoint = (code: number): string => {
  if (code > 0xffff) {
    code -= 0x10000;

    const surrogate1 = 0xd800 + (code >> 10);
    const surrogate2 = 0xdc00 + (code & 0x3ff);

    return String.fromCodePoint(surrogate1, surrogate2);
  }

  return String.fromCharCode(code);
};

const replaceEntityPattern = (match: string, name: string) => {
  if (
    name.charCodeAt(0) === 0x23 /* # */ &&
    DIGITAL_ENTITY_TEST_RE.test(name)
  ) {
    const code =
      name[1].toLowerCase() === "x"
        ? parseInt(name.slice(2), 16)
        : parseInt(name.slice(1), 10);

    if (isValidEntityCode(code)) {
      return fromCodePoint(code);
    }

    return match;
  }

  return decodeHTML(match);
};

export const unescapeAll = (str: string): string => {
  if (str.indexOf("\\") < 0 && str.indexOf("&") < 0) {
    return str;
  }

  return str.replace(UNESCAPE_ALL_RE, (match, escaped, entity) => {
    if (escaped) {
      return escaped;
    }
    return replaceEntityPattern(match, entity);
  });
};
