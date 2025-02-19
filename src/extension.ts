import * as vscode from "vscode";
import * as utils from "./utils";

// precompiled regex
const recognitionRegEx =
  /\\u(?:\{[0-9A-Fa-f]{1,6}\}|[0-9A-Fa-f]{4})|\\x[0-9A-Fa-f]{2}|U\+[0-9A-F]{1,6}/g; // Escaped Unicode | Escaped Hex | Unicode Codepoint
const wholeWordRegEx =
  /(\\u(?:\{[0-9A-Fa-f]{1,6}\}|[0-9A-Fa-f]{4})|\\x[0-9A-Fa-f]{2}|U\+[0-9A-F]{1,6})+/g; // match long sequences

let timer: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
  // init
  utils.config.update();
  updateDecorations();

  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("unicodeHovery")) {
      utils.config.update();
      updateDecorations();
    }
  });

  // Commands section

  let commands = [
    vscode.commands.registerCommand("unicodeHovery.toCharacters", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      let edits: { range: vscode.Range; result?: string }[] = [];

      for (let selection of editor.selections) {
        const range = editor.document.getWordRangeAtPosition(
          selection.start,
          wholeWordRegEx
        );

        if (range) {
          const text = editor.document.getText(range);
          const result = text
            .match(recognitionRegEx)
            ?.map((t) => utils.escapeUnicode(t))
            .join("");

          edits.push({ range, result });
        }
      }

      editor.edit((edit) => {
        edits.forEach(({ range, result }) => {
          edit.replace(range, `${result}`);
        });
      });
    }),

    vscode.commands.registerCommand("unicodeHovery.convertDocument", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      let edits: { range: vscode.Range; result?: string }[] = [];

      const document = editor.document;
      const text = editor.document.getText();

      let match;
      while ((match = wholeWordRegEx.exec(text)) !== null) {
        const start = document.positionAt(match.index);
        const end = document.positionAt(match.index + match[0].length);

        // get all subcharacters
        const result = match[0]
          .match(recognitionRegEx)
          ?.map((t) => utils.escapeUnicode(t))
          .join("");

        edits.push({
          range: new vscode.Range(start, end),
          result,
        });
      }

      editor.edit((edit) => {
        edits.forEach(({ range, result }) => {
          edit.replace(range, `${result}`);
        });
      });
    }),

    vscode.commands.registerCommand(
      "unicodeHovery.toUnicode",
      genCommand(false, true, false)
    ),
    vscode.commands.registerCommand(
      "unicodeHovery.toUnicodeWOAscii",
      genCommand(true, true, false)
    ),
    vscode.commands.registerCommand(
      "unicodeHovery.toUnicodeNoSurrogate",
      genCommand(false, false, false)
    ),
    vscode.commands.registerCommand(
      "unicodeHovery.toUnicodeWOAsciiNoSurrogate",
      genCommand(true, false, false)
    ),
    vscode.commands.registerCommand(
      "unicodeHovery.toUtf8",
      genCommand(true, true, true)
    ),
  ];

  // Register commands
  commands.forEach((c) => context.subscriptions.push(c));

  context.subscriptions.push(
    // update decos when tab / content changes
    vscode.window.onDidChangeActiveTextEditor(triggerUpdate),
    vscode.workspace.onDidChangeTextDocument(triggerUpdate),
    configListener
  );
}

function genCommand(
  ignoreAscii: boolean,
  includeSurrogate: boolean,
  utf8: boolean
) {
  return () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    let edits: { range: vscode.Range; result?: string }[] = [];

    for (let selection of editor.selections) {
      const range = new vscode.Range(selection.start, selection.end);

      const text = editor.document.getText(range);
      const result = utils.toUnicode(
        utils.toUnicodeArray(text, includeSurrogate),
        ignoreAscii,
        utf8
      );
      edits.push({ range, result });
    }

    editor.edit((edit) => {
      edits.forEach(({ range, result }) => {
        edit.replace(range, `${result}`);
      });
    });
  };
}

// refresh ratelimit
function triggerUpdate() {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(updateDecorations, 200);
}

function updateDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;

  // clear if languages does not match
  if (!utils.config.checkLanguages(document.languageId)) {
    editor.setDecorations(utils.config.underlineDecoType, []);
    return;
  }

  const text = document.getText();
  const decoOptions: vscode.DecorationOptions[] = [];

  let match;
  while ((match = wholeWordRegEx.exec(text)) !== null) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);

    // get all subcharacters
    const result = match[0]
      .match(recognitionRegEx)
      ?.map((t) => utils.escapeUnicode(t))
      .join("");

    decoOptions.push({
      range: new vscode.Range(start, end),
      hoverMessage: `Unescaped: ${result}`,
    });
  }

  editor.setDecorations(utils.config.underlineDecoType, decoOptions);
}

export function deactivate() {
  // ...
}
