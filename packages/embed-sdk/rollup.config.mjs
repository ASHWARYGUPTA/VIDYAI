import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

const prod = process.env.NODE_ENV === 'production';

export default [
  // IIFE build — drops VidyAI onto window, for <script> tag use
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/embed.js',
      format: 'iife',
      name: 'VidyAI',
      sourcemap: !prod,
      plugins: prod ? [terser()] : [],
    },
    plugins: [resolve(), typescript({ tsconfig: './tsconfig.json' })],
  },
  // ESM build — for import { VidyAI } from '@vidyai/embed' in bundled apps
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/embed.esm.js',
      format: 'esm',
      sourcemap: !prod,
    },
    plugins: [resolve(), typescript({ tsconfig: './tsconfig.json' })],
  },
];
