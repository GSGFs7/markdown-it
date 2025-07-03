interface TokenAttr {
  0: string;
  1: string;
}

export default class Token {
  type: string;
  tag: string;
  attrs: TokenAttr[] | null;
  map: [number, number] | null;
  nesting: number;
  level: number;
  children: Token[] | null;
  content: string;
  markup: string;
  info: string;
  meta: unknown;
  block: boolean;
  hidden: boolean;

  constructor(type: string, tag: string, nesting: number) {
    this.type = type;
    this.tag = tag;
    this.attrs = null;
    this.map = null;
    this.nesting = nesting;
    this.level = 0;
    this.children = null;
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
