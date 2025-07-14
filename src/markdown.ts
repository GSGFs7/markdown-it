import Block from "./parser/block";
import Core from "./parser/core";
import Inline from "./parser/inline";

export default class Markdown {
  core: Core;
  block: Block;
  inline: Inline;

  renderer;
  linkify;
  options;

  constructor() {
    this.core = new Core();
    this.block = new Block();
    this.inline = new Inline();

    this.options = {
      maxNesting: 10,
    };
  }

  parse(src: string, env) {
    if (typeof src !== "string") {
      throw new Error("Input data should be a string");
    }

    const state = new this.core.State(src, this, env);

    this.core.process(state);

    return state.tokens;
  }

  render(src: string, env?) {
    env = env || {};

    return this.renderer.render(this.parse(src, env), this.options, env);
  }
}
