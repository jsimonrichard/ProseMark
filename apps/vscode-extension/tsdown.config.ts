import { defineConfig } from 'tsdown';

const unarray = <T>(a: T | T[]) => {
  if (Array.isArray(a)) {
    return a[0];
  } else {
    return a;
  }
};

const defaultConfig = unarray(
  defineConfig({
    outDir: 'dist',
    sourcemap: true,
    external: 'vscode',
  }),
);

export default defineConfig([
  {
    ...defaultConfig,
    name: 'webview',
    entry: 'src/webview/main.ts',
    format: 'iife',
    outputOptions: {
      name: 'webview',
    },
  },
  {
    ...defaultConfig,
    name: 'extension backend',
    entry: 'src/extension.ts',
    platform: 'node',
    format: 'cjs',
  },
]);
