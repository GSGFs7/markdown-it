import Markdown from "../markdown";
import { TagType } from "../renderer";
import Token, { TokenType } from "../token";

export default class StateInline {
  /** The source markdown string to parse */
  src: string;

  /** */
  md: Markdown;

  /** */
  env: Record<string, unknown>;

  /** */
  tokens: Token[];

  /** */
  tokens_meta: Array<unknown>;

  /** */
  pos: number;

  /** */
  posMax: number;

  /**
   * Current nesting level
   */
  level: number;

  /**
   * # Text Buffer
   *
   * Used to store continuous plain text temporary.
   *
   * The buffer will merge many texts to avoid create too many tokens.
   * It will be pushed as a special token if meet some special mark or pushed as a text token.
   * It also simplify the rule logic, such as check the number of space before '\n' to use <br />
   */
  pending: string;

  /** */
  pendingLevel: number;

  /** */
  cache: Record<number, number>;

  /** */
  delimiters;

  /**
   * Stack of delimiter lists for upper level tags
   */
  _prev_delimiters: Array<unknown>;

  /** */
  backticks;

  /** */
  backticksScanned: boolean;

  /** */
  linkLevel: number;

  constructor(src: string, md: Markdown, env, outTokens: Token[]) {
    this.src = src;
    this.md = md;
    this.env = env;
    this.tokens = outTokens;
    this.tokens_meta = Array(outTokens.length);

    this.pos = 0;
    this.posMax = this.src.length;
    this.level = 0;
    this.pending = "";
    this.pendingLevel = 0;

    this.cache = {};

    this.delimiters = [];

    this._prev_delimiters = [];

    this.backticks = {};
    this.backticksScanned = false;

    this.linkLevel = 0;
  }

  /**
   * Pushes the current pending text as a new "text" token into the tokens array.
   * Clears the pending buffer after pushing.
   *
   * @remarks
   * This method creates a new `Token` of type "text" with the current pending content and level,
   * adds it to the `tokens` array, and resets the pending content to an empty string.
   */
  pushPending() {
    const token = new Token("text", "", 0);

    token.content = this.pending;
    token.level = this.pendingLevel;

    this.tokens.push(token);
    this.pending = "";
  }

  push(type: TokenType, tag: TagType, nesting: number) {
    if (this.pending) {
      this.pushPending();
    }

    const token = new Token(type, tag, nesting);
    let tokens_meta = {}; // ? what is this ?

    if (nesting < 0) {
      this.level--;
      this.delimiters = this._prev_delimiters.pop();
    }

    token.level = this.level;

    if (nesting > 0) {
      this.level++;
      this._prev_delimiters.push(this.delimiters);
      this.delimiters = [];
      tokens_meta = { delimiters: this.delimiters };
    }

    this.pendingLevel = this.level;
    this.tokens.push(token);
    this.tokens_meta.push(tokens_meta);

    return token;
  }
}
