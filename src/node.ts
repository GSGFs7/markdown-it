export interface Position {
  start: Point;
  end: Point;
}

export interface Point {
  line: number;
  column: number;
  offset: number;
}

export interface ASTNode {
  type: string;
  value?: string;
  children?: ASTNode[];
  position?: Position;
  data?: Record<string, unknown>;
}

export interface RootNode extends ASTNode {
  type: "root";
  children: ASTNode[];
}

export interface ParagraphNode extends ASTNode {
  type: "paragraph";
  children: ASTNode[];
}

export interface HeadingNode extends ASTNode {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: ASTNode[];
}

export interface EmphasisNode extends ASTNode {
  type: "emphasis";
  children: ASTNode[];
}

export interface StrongNode extends ASTNode {
  type: "strong";
  children: ASTNode[];
}

export interface CodeNode extends ASTNode {
  type: "code";
  children: ASTNode[];
}

export interface CodeBlockNode extends ASTNode {
  type: "codeBlock";
  value: string;
  lang?: string;
  mate?: string;
}

export interface TextNode extends ASTNode {
  type: "text";
  value: string;
}

export interface LinkNode extends ASTNode {
  type: "link";
  url: string;
  title?: string;
  children: ASTNode[];
}

export interface ImageNode extends ASTNode {
  type: "image";
  url: string;
  alt?: string;
  title?: string;
}

export interface ListItemNode extends ASTNode {
  type: "listItem";
  checked?: boolean | null;
  spread?: boolean;
  children: ASTNode[];
}

export interface ListNode extends ASTNode {
  type: "list";
  ordered: boolean;
  start: number;
  spread?: boolean;
  children: ListItemNode[];
}

export interface BlockquoteNode extends ASTNode {
  type: "blockquote";
  children: ASTNode[];
}

export interface ThematicBreakNode extends ASTNode {
  type: "thematicBreak";
}

export type Transformer = (
  tree: ASTNode,
  file?: VFile,
) => ASTNode | void | Promise<ASTNode | void>;

// virtual file
export interface VFile {
  content: string;
  path?: string;
  data?: Record<string, unknown>;
  message?: Array<VFileMessage>;
}

export interface VFileMessage {
  message: string;
  line?: number;
  column?: number;
  fatal?: boolean;
}
