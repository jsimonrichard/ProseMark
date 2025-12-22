import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const buildTypeDocEntry = (
  pkg: string,
  pkgDir: string,
  entryPoint?: string,
  tsConfig?: string,
) => {
  const [pluginGenerator, sidebarGroup] = createStarlightTypeDocPlugin();
  const entryPointFull = pkgDir + '/' + (entryPoint ?? 'lib/main.ts');
  const tsConfigFull = pkgDir + '/' + (tsConfig ?? 'tsconfig.json');

  return {
    name: pkg,
    plugin: pluginGenerator({
      entryPoints: [entryPointFull],
      tsconfig: tsConfigFull,
      output: 'api/' + pkg,
      sidebar: {
        label: pkg,
      },
      typeDoc: {
        githubPages: false,
        // disableGit: true, // needed when running jujutsu locally
        // sourceLinkExternal: true,
        // sourceLinkTemplate:
        //   'https://github.com/jsimonrichard/ProseMark/blob/main/packages/core/lib/{path}#L{line}',
      },
    }),
    sidebarGroup,
  };
};

const core = buildTypeDocEntry('@prosemark/core', '../../packages/core');
const renderHtml = buildTypeDocEntry(
  '@prosemark/render-html',
  '../../packages/render-html',
);
const pasteRichText = buildTypeDocEntry(
  '@prosemark/paste-rich-text',
  '../../packages/paste-rich-text',
);

// https://astro.build/config
export default defineConfig({
  site: 'https://prosemark.com',
  vite: {
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        buffer: 'buffer',
      },
    },
  },
  integrations: [
    starlight({
      title: 'ProseMark Docs',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/jsimonrichard/ProseMark',
        },
      ],
      sidebar: [
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
        {
          label: 'API',
          items: [
            core.sidebarGroup,
            renderHtml.sidebarGroup,
            pasteRichText.sidebarGroup,
          ],
        },
      ],
      plugins: [core.plugin, renderHtml.plugin, pasteRichText.plugin],

      editLink: {
        baseUrl:
          process.env.NODE_ENV === 'development'
            ? `vscode://file/${import.meta.dirname}`
            : 'https://github.com/jsimonrichard/ProseMark/edit/main',
      },
    }),
  ],
});
