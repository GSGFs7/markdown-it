export function isSpace(code) {
  switch (code) {
    case 0x09: // '\t', tab
    case 0x20: // ' ', space
      return true;
  }
  return false;
}
