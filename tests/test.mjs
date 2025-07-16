"use strict";

import md from "../dist/esm/index.js";
import fs from "fs";

const src = fs.readFileSync("./tests/test.md");

const markdown = new md();
console.log(JSON.stringify(markdown.parse(src.toString(), {}), null, 2));
