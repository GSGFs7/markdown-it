import typescript from "@rollup/plugin-typescript";
import eslint from "@rollup/plugin-eslint";
import prettier from "rollup-plugin-prettier";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/esm/index.js",
        format: "esm",
        sourcemap: true,
      },
      {
        file: "dist/cjs/index.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        // cacheDir: ".cache",
        outputToFilesystem: true,
        incremental: true,
        sourceMap: true,
      }),
      eslint({ fix: true }),
      prettier({
        parser: "babel",
        cwd: process.cwd(),
      }),
    ],
  },
];
