"use strict";

import md from "../dist/esm/index.js";

const markdown = new md();
console.log(markdown.parse("abc", {}));
