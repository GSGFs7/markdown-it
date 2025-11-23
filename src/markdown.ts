import Block from "./parser/block";
import Core from "./parser/core";
import Inline from "./parser/inline";
import Renderer from "./renderer";
import Token from "./token";
import * as mdurl from "mdurl";
import punycode from "punycode";

const BAD_PROTO_RE = /^(vbscript|javascript|file|data):/;
const GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp)/;
const RECODE_HOSTNAME_FOR = ["http:", "https:", "mailto:"];

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
      html: true,
    };
  }

  parse(src: string, env): Token[] {
    const state = new this.core.State(src, this, env);

    this.core.process(state);

    return state.tokens;
  }

  render(src: string, env?) {
    env = env || {};

    return this.renderer.render(this.parse(src, env), this.options, env);
  }

  validateLink(url: string): boolean {
    const str = url.trim().toLowerCase();

    return BAD_PROTO_RE.test(str) ? GOOD_DATA_RE.test(str) : true;
  }

  normalizeLink(url: string): string {
    const parsed = mdurl.parse(url, true);

    if (parsed.hostname) {
      if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) {
        try {
          parsed.hostname = punycode.toASCII(parsed.hostname);
        } catch {
          /* */
        }
      }
    }

    return mdurl.encode(mdurl.format(parsed));
  }

  normalizeLinkText(url: string): string {
    const parsed = mdurl.parse(url, true);

    if (parsed.hostname) {
      // Encode hostname in urls like:
      // `http://host/`. `https://host/`, `mailto:user@host`, `//host/`
      //
      // We don't encode unknow schemas,
      // because it's likely that we encode something we shoultn't
      // (e.g. `skype:name` treated as `skype:host`)
      if (!parsed.protocol || RECODE_HOSTNAME_FOR.includes(parsed.protocol)) {
        try {
          parsed.hostname = punycode.toUnicode(parsed.hostname);
        } catch {
          /* */
        }
      }
    }

    // add '%' to exclude list
    return mdurl.decode(mdurl.format(parsed), mdurl.decode.defaultChars + "%");
  }
}
