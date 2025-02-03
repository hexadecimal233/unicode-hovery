import * as vscode from "vscode";
import * as utils from "./utils";

// precompiled regex
const recognitionRegEx =
  /\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4})|\\x[\dA-Fa-f]{2}|U\+[\dA-F]{1,6}/g; // Escaped Unicode | Escaped Hex | Unicode Codepoint
const wholeWordRegEx =
  /(\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4})|\\x[\dA-Fa-f]{2}|U\+[\dA-F]{1,6})+/g; // match long sequences

let timer: NodeJS.Timeout | null = null;

// TODO: Add a command to convert hexadecimal bits to unicode

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

  context.subscriptions.push(
    // update decos when tab / content changes
    vscode.window.onDidChangeActiveTextEditor(triggerUpdate),
    vscode.workspace.onDidChangeTextDocument(triggerUpdate),
    configListener
  );
}

// refresh ratelimit
function triggerUpdate() {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(updateDecorations, 200);
}

function updateDecorations() {
  console.log("updateDecorations");
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
