"use strict";

import md from "../dist/index.esm.js";
import fs from "fs";

const src = fs.readFileSync("./tests/test.md");

const markdown = new md();
// console.log(JSON.stringify(markdown.parse(src.toString(), {}), null, 2));

const html = markdown.render(src.toString(), {});
// eslint-disable-next-line no-undef
console.log(html);
fs.writeFileSync(
  "./tests/test.html",
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
` +
    html +
    `  </body>
</html>
`,
  "utf-8",
);
