import Markdown from "../Markdown";
import Token from "../token";

/**
 * StateCore: the state object of core parser
 */
export default class StateCore {
  /** raw Markdown string */
  src: string;

  /** env sandbox used to pass data between rules */
  env: Record<string, unknown>;

  /** parsed Token array */
  tokens: Token[];

  /**
   * A flag indicating whether the parser is in inline mode.
   */
  inlineMode: boolean;

  /** link to parser instance */
  md: Markdown;

  constructor(src: string, md: Markdown, env: Record<string, unknown>) {
    this.src = src;
    this.md = md;
    this.tokens = [];
    this.env = env;
    this.inlineMode = false;
  }
}
