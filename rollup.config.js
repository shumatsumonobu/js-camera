import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import pkg from './package.json' with {type: 'json'};

export default {
  input: './src/index.ts',
  plugins: [
    // Inline CSS imports as injected <style> tags.
    postcss(),

    // Compile TypeScript and emit declaration files to types/.
    typescript({
      tsconfig: 'tsconfig.json',
      useTsconfigDeclarationDir: true,
    }),

    // Minify output bundles.
    terser(),

    // Resolve bare module specifiers for bundling.
    nodeResolve({
      mainFields: ['module', 'main'],
    }),
  ],
  output: [
    // ESM — for modern bundlers (webpack, vite, rollup).
    {
      format: 'esm',
      file: pkg.module,
    },
    // UMD — for <script> tags and legacy bundlers.
    {
      format: 'umd',
      file: pkg.browser,
      // Convert "js-camera" → "jsCamera" for the global variable name.
      name: pkg.name
        .replace(/^.*\/|\.js$/g, '')
        .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', '')),
    },
  ],
  watch: {
    exclude: 'node_modules/**',
    include: 'src/**',
  },
};
