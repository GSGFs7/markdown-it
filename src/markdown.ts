import Block from "./parser/block";
import Core from "./parser/core";
import Inline from "./parser/inline";
import Renderer from "./renderer";

export default class Markdown {
  core: Core;
  block: Block;
  inline: Inline;

  renderer: Renderer;
  linkify;
  options;

  constructor() {
    this.core = new Core();
    this.block = new Block();
    this.inline = new Inline();

    this.renderer = new Renderer();

    this.options = {
      maxNesting: 10,
      langPrefix: "language-",
    };
  }

  parse(src: string, env) {
    const state = new this.core.State(src, this, env);

    this.core.process(state);

    return state.tokens;
  }

  render(src: string, env?) {
    env = env || {};

    return this.renderer.render(this.parse(src, env), this.options, env);
  }
}
