interface TokenAttr {
  0: string;
  1: string;
}

export type TokenType =
  // block
  | "blockquote_open"
  | "blockquote_close"
  | "code_block"
  | "fence"
  | "heading_open"
  | "heading_close"
  | "hr"
  | "html_block"
  | "list_item_open"
  | "list_item_close"
  | "bullet_list_open"
  | "bullet_list_close"
  | "ordered_list_open"
  | "ordered_list_close"
  | "paragraph_open"
  | "paragraph_close"
  | "reference"
  | "table_open"
  | "table_close"
  | "thread_open"
  | "thread_close"
  | "tbody_open"
  | "tbody_close"
  | "tr_open"
  | "tr_close"
  | "th_open"
  | "th_close"
  | "td_open"
  | "td_close"
  // inline
  | "code_line"
  | "em_open"
  | "em_close"
  | "hard_break"
  | "soft_break"
  | "html_inline"
  | "image"
  | "link_open"
  | "link_close"
  | "strikethrough_open"
  | "strikethrough_close"
  | "strong_open"
  | "strong_close"
  | "text"
  | "text_special"
  // generic
  | "inline";

export default class Token {
  /** The type of token (string, e.g. "paragraph_open") */
  type: TokenType;

  /** HTML tag name */
  tag: string;

  /** HTML attributes. Format: `[[name, value]]` */
  attrs: TokenAttr[] | null;

  /** Source map info. Format: `[line_begin, line_end]` */
  map: [number, number] | null;

  /**
   * Level change,
   *
   * - `1`: the tag is opening
   * - `0`: the tag is self-closing
   * - `-1`: the tag is closing
   */
  nesting: number;

  /** nesting level, same as `state.level` */
  level: number;

  /** An array of child nodes (inline and image tokens) */
  children: Token[];

  /**
   * In a case of self-closing tag (code, html, fence, etc.)
   * it has contents of this tag.
   */
  content: string;

  /**
   * '*' or '_' for emphasis, fence string for fence, etc.
   */
  markup: string;

  /**
   * Additional information:
   *
   * - Info string for "fence" tokens
   * - The value "auto" for autolink "link_open" and "link_close" tokens
   * - The value of the item marker for ordered_list "list_item_open" tokens
   */
  info: string;

  /**
   * A place for plugins to store an arbitrary data
   */
  meta: unknown;

  /**
   * True for block-level tokens, false for inline tokens
   * Used in renderer to calculate line breaks
   */
  block: boolean;

  /**
   * If it's true, ignore this element when rendering
   * Used for tight lists to hide paragraphs
   */
  hidden: boolean;

  constructor(type: TokenType, tag: string, nesting: number) {
    this.type = type;
    this.tag = tag;
    this.attrs = null;
    this.map = null;
    this.nesting = nesting;
    this.level = 0;
    this.children = [];
    this.content = "";
    this.markup = "";
    this.info = "";
    this.meta = null;
    this.block = false;
    this.hidden = false;
  }

  /**
   * Find the index of the specified attribute name
   * @param name The name of attribute
   * @returns The array subscript. If not found, return -1
   */
  attrIndex(name: string): number {
    if (!this.attrs) {
      return -1;
    }

    for (let i = 0, len = this.attrs.length; i < len; i++) {
      if (this.attrs[i][0] === name) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Add new attribute
   * @param attrData The attribute that will be added
   */
  attrPush(attrData: TokenAttr): void {
    if (this.attrs) {
      this.attrs.push(attrData);
    } else {
      this.attrs = [attrData];
    }
  }

  attrSet(name: string, value: string): void {
    const index = this.attrIndex(name);

    if (index < 0) {
      this.attrPush([name, value]);
    } else if (this.attrs) {
      this.attrs[index] = [name, value];
    }
  }

  attrGet(name: string): string | null {
    const index = this.attrIndex(name);
    let value: string | null = null;

    if (index >= 0 && this.attrs) {
      value = this.attrs[index][1];
    }

    return value;
  }

  attrJoin(name: string, value: string): void {
    const index = this.attrIndex(name);

    if (index < 0) {
      this.attrPush([name, value]);
    } else if (this.attrs) {
      this.attrs[index][1] += " " + value;
    }
  }
}
