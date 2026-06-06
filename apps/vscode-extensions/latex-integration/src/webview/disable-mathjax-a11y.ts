interface MathJaxStartupDocument {
  options: {
    enableSpeech?: boolean;
    enableBraille?: boolean;
    enableEnrichment?: boolean;
  };
}

interface MathJaxWithStartup {
  startup?: {
    promise?: Promise<void>;
    document?: MathJaxStartupDocument;
  };
  config?: {
    options?: {
      enableSpeech?: boolean;
      enableBraille?: boolean;
      enableEnrichment?: boolean;
    };
  };
}

/** Ensure speech worker is not requested before math widgets render. */
export async function disableMathJaxA11y(): Promise<void> {
  const mj = window.MathJax as MathJaxWithStartup | undefined;
  await mj?.startup?.promise;

  const options = mj?.config?.options;
  if (options) {
    options.enableSpeech = false;
    options.enableBraille = false;
    options.enableEnrichment = false;
  }

  const docOptions = mj?.startup?.document?.options;
  if (docOptions) {
    docOptions.enableSpeech = false;
    docOptions.enableBraille = false;
    docOptions.enableEnrichment = false;
  }
}
