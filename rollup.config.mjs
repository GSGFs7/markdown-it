import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.esm.js",
        format: "esm",
        sourcemap: true,
        plugins: [
          terser({
            format: { ascii_only: true },
            // mangle: false,
            // compress: false,
            // format: {
            //   comments: "all",
            //   beautify: true,
            //   ascii_only: true,
            //   indent_level: 2,
            // },
          }),
        ],
      },
      {
        file: "dist/index.cjs.js",
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
        declaration: true,
        declarationDir: "dist",
      }),
      // https://www.npmjs.com/package/@rollup/plugin-eslint
      // Not maintained for a long time, have some problem
      // `Unexpected constant condition` in `src/rules/block/fence.ts`
      // eslint({ fix: true }),
      //
      // prettier({
      //   parser: "babel",
      //   cwd: process.cwd(),
      // }),
    ],
  },
];
