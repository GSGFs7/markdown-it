export default function normalize(markdown: string): string {
  let str = markdown;

  const NEWLINE_RE = /\r\n?|\n/g; // CRLF -> LF
  const NULL_RE = /\0/g; // remove '\0'

  str = str.replace(NEWLINE_RE, "\n");
  str = str.replace(NULL_RE, "\uFFFD");

  return str;
}
