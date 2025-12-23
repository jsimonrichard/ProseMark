import type { ExternalOption, GlobalsFunction, Plugin } from 'rolldown';

export const EXTERNAL_MODULES = ['@codemirror/state', '@codemirror/view'];
const formatExternalModules = (id: string) =>
  `window.proseMark.externalModules["${id}"]`;

export default function proseMarkVSCodeExtensionIntegratorPlugin(): Plugin {
  return {
    name: 'prosemark-vscode-extension-integrator',
    options(opts) {
      // Add external modules
      let external: ExternalOption = opts.external ?? [];
      if (typeof external === 'function') {
        external = (id, parentId, isResolved) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
          (external as Extract<ExternalOption, Function>)(
            id,
            parentId,
            isResolved,
          ) ?? (EXTERNAL_MODULES.includes(id) ? false : true);
      } else if (Array.isArray(external)) {
        external = [...external, ...EXTERNAL_MODULES];
      } else if (typeof external === 'string') {
        external = [external, ...EXTERNAL_MODULES];
      }

      return {
        ...opts,
        external,
      };
    },

    outputOptions(opts) {
      let globals = opts.globals ?? {};
      if (typeof globals === 'function') {
        globals = (id) => {
          if (EXTERNAL_MODULES.includes(id)) {
            return formatExternalModules(id);
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
          return (globals as Extract<GlobalsFunction, Function>)(id);
        };
      } else {
        globals = {
          ...globals,
          ...Object.fromEntries(
            EXTERNAL_MODULES.map((id) => [id, formatExternalModules(id)]),
          ),
        };
      }
      return {
        ...opts,
        globals,
      };
    },
  };
}
