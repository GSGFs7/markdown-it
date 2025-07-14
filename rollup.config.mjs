import typescript from "@rollup/plugin-typescript";
import eslint from "@rollup/plugin-eslint";
import prettier from "rollup-plugin-prettier";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/esm/index.js",
        format: "esm",
        sourcemap: true,
        plugins: [
          terser({
            // format: { ascii_only: true },
            mangle: false,
            compress: false,
            format: {
              comments: "all",
              beautify: true,
              ascii_only: true,
              indent_level: 2,
            },
          }),
        ],
      },
      {
        file: "dist/cjs/index.js",
        format: "cjs",
        sourcemap: true,
        plugins: [
          terser({
            format: { ascii_only: true },
          }),
        ],
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
