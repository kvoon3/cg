import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: './src/index.ts',
    dts: true,
    exports: true,
  },
  {
    entry: './src/cli.ts',
    dts: true,
    outDir: './dist',
    format: 'esm',
    platform: 'node',
    shims: true,
  },
  {
    entry: './src/run.ts',
    outDir: './dist',
    format: 'esm',
    platform: 'node',
    shims: true,
  },
])
