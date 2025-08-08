import Token from "./token";
import { escapeHtml } from "./utils";

export type TagType =
  | ""
  | "p"
  | "a"
  | "code"
  | "pre"
  | "em"
  | "img"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

export type RendererRule = (
  self: Renderer,
  tokens: Token[],
  idx: number,
  options,
  env,
) => string;

const default_rules: Record<string, RendererRule> = {
  code_inline: (self, tokens, idx) => {
    return (
      "<code" +
      self.renderAttr(tokens[idx]) +
      ">" +
      escapeHtml(tokens[idx].content) +
      "</code>"
    );
  },
  code_block: (self, tokens, idx) => {
    return (
      "<pre" +
      self.renderAttr(tokens[idx]) +
      "><code>" +
      escapeHtml(tokens[idx].content) +
      "</code></pre>\n"
    );
  },
  text: (_self, tokens, idx) => {
    return escapeHtml(tokens[idx].content);
  },
  image: (self, tokens, idx, options, env) => {
    // "alt" attr MUST be set, even if empty.

    if (tokens[idx].attrs === null) {
      tokens[idx].attrs = [["alt", ""]];
    }
    const attrIndex = tokens[idx].attrIndex("alt");
    tokens[idx].attrs[attrIndex][1] = self.renderInlineAsText(
      tokens[idx].children,
      options,
      env,
    );

    return self.renderToken(tokens, idx, options);
  },
  html_block: (_self, tokens, idx) => {
    return tokens[idx].content;
  },
  html_inline: (_self, tokens, idx) => {
    return tokens[idx].content;
  },
  hard_break: (_self, _token, _idx, options) => {
    return options.xhtmlOut ? "<br/>\n" : "<br>\n";
  },
  soft_break: (_self, _tokens, _idx, options) => {
    return options.breaks ? (options.xhtmlOut ? "<br/>\n" : "<br>\n") : "\n";
  },
  fence: (self, tokens, idx, options) => {
    const token = tokens[idx];
    const info = token.info;
    let langName = "";
    let langAttrs = "";

    if (info) {
      const arr = info.split(/(\s+)/g);
      langName = arr[0];
      langAttrs = arr.slice(2).join("");
    }

    let highlighted: string;
    if (options.highlight) {
      highlighted =
        options.highlight(token.content, langName, langAttrs) ||
        escapeHtml(token.content);
    } else {
      highlighted = escapeHtml(token.content);
    }

    if (highlighted.indexOf("<pre") === 0) {
      return highlighted + "\n";
    }

    if (info) {
      const i = token.attrIndex("class");
      const tmpAttrs = token.attrs ? token.attrs.slice() : [];

      if (i < 0) {
        tmpAttrs.push(["class", options.langPrefix + langName]);
      } else {
        const originalAttr = tmpAttrs[i];
        tmpAttrs[i] = [originalAttr[0], originalAttr[1]]; // copy
        tmpAttrs[i][1] += " " + (options.langPrefix ?? "") + langName;
      }

      const tmpToken = new Token("fence", "code", 0);
      tmpToken.attrs = tmpAttrs;

      return `<pre><code${self.renderAttr(tmpToken)}>${highlighted}</code></pre>\n`;
    }

    return `<pre><code${self.renderAttr(token)}>${highlighted}</code></pre>`;
  },
};

export default class Renderer {
  rules: Record<string, RendererRule>;

  constructor() {
    this.rules = default_rules;
  }

  /**
   * Renders the HTML attributes for a given token as a string.
   *
   * @param token - The token containing the attributes to render.
   * @returns A string of HTML attributes, or an empty string if no attributes are present.
   */
  renderAttr(token: Token): string {
    let result = "";

    if (!token.attrs) {
      return result;
    }

    for (const attr of token.attrs) {
      result += " " + escapeHtml(attr[0]) + '="' + escapeHtml(attr[1]) + '"';
    }

    return result;
  }

  /**
   * Renders a single token as an HTML tag string.
   *
   * @param tokens - The list of tokens to render from.
   * @param idx - The index of the token to render.
   * @param options - Options from the parser instance.
   * @returns The rendered HTML string for the token.
   */
  renderToken(tokens: Token[], idx: number, options) {
    const token = tokens[idx];
    let result = "";

    // Tight list paragraphs
    if (token.hidden) {
      return result;
    }

    // insert a new line between hidden paragraph and subsequent opening block-level tag.
    //
    // For example, here we should insert a new line before blockquote:
    //  - a
    //    >
    if (token.block && token.nesting !== -1 && idx && tokens[idx - 1].hidden) {
      result += "\n";
    }

    // Add token name, e.g. `<img`
    result += (token.nesting === -1 ? "</" : "<") + token.tag;

    // Encode attributes, e.g. `<img src="foo"`
    result += this.renderAttr(token);

    // Add a slash for self-closing tags, e.g. `<img src="foo" /`
    if (token.nesting === 0 && options.xhtmlOut) {
      result += " /";
    }

    // Check is need to add a new line after this tag
    let needLf = false;
    if (token.block) {
      needLf = true;

      if (token.nesting === 1) {
        if (idx + 1 < tokens.length) {
          const nextToken = tokens[idx + 1];

          if (nextToken.type === "inline" || nextToken.hidden) {
            // Block-level tag containing an inline tag.
            // e.g. <h1>Heading</h1>
            needLf = false;
          } else if (nextToken.nesting === -1 && nextToken.tag === token.tag) {
            // opening tag + closing tag of the same type. e.g. `<li></li>`
            // e.g.
            // <ul>
            // <li>A list</li> <- same line
            // </ul>
            needLf = false;
          }
        }
      }
    }

    result += needLf ? ">\n" : ">";
    return result;
  }

  /**
   * Renders a list of block tokens to HTML.
   *
   * @param tokens - The list of block tokens to render.
   * @param options - Options from the parser instance.
   * @param env - Environment sandbox or custom data.
   * @returns The rendered HTML string for the block tokens.
   */
  renderInline(tokens: Token[], options, env): string {
    let result = "";
    const rules = this.rules;

    for (let i = 0, len = tokens.length; i < len; i++) {
      const type = tokens[i].type;

      if (typeof rules[type] !== "undefined") {
        result += rules[type](this, tokens, i, options, env);
      } else {
        result += this.renderToken(tokens, i, options);
      }
    }

    return result;
  }

  /**
   * Renders inline tokens as plain text, stripping all markup.
   *
   * This is primarily used for generating the `alt` attribute for images,
   * conforming to the CommonMark specification, which requires the `alt`
   * content to be rendered as plain text without any markup.
   *
   * @param tokens - The list of inline tokens to render as text.
   * @param options - Options from the parser instance.
   * @param env - Environment sandbox or custom data.
   * @returns The concatenated plain text content of the tokens.
   */
  renderInlineAsText(tokens: Token[], options, env): string {
    let result = "";

    for (const token of tokens) {
      switch (token.type) {
        case "text":
          result += token.content;
          break;
        case "image":
          result += this.renderInlineAsText(token.children, options, env);
          break;
        case "html_inline":
        case "html_block":
          result += token.content;
          break;
        case "soft_break":
        case "hard_break":
          result += "\n";
          break;
        default:
        // skip other tokens
      }
    }

    return result;
  }

  render(tokens: Token[], options, env): string {
    let result = "";
    const rules = this.rules;

    for (let i = 0, len = tokens.length; i < len; i++) {
      const type = tokens[i].type;

      if (type === "inline") {
        result += this.renderInline(tokens[i].children, options, env);
      } else if (typeof rules[type] !== "undefined") {
        result += rules[type](this, tokens, i, options, env);
      } else {
        result += this.renderToken(tokens, i, options);
      }
    }

    return result;
  }
}
