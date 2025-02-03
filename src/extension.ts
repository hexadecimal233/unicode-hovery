import * as vscode from "vscode";
import * as utils from "./utils";

// precompiled regex
const recognitionRegEx =
  /(\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4})|\\x[\dA-Fa-f]{2}|U\+[\dA-F]{1,6})/; // Escaped Unicode | Escaped Hex | Unicode Codepoint
const wholeWordRegEx =
  /(\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4})|\\x[\dA-Fa-f]{2}|U\+[\dA-F]{1,6})+/g; // match long sequences

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
    vscode.window.onDidChangeActiveTextEditor(updateDecorations),
    vscode.workspace.onDidChangeTextDocument(updateDecorations),
    configListener
  );
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

    // start from the position where the cursor is
    let pointer = start;
    let text: string[] = [];

    // get the whole sequence
    while (pointer.isBefore(end)) {
      const range_ = document.getWordRangeAtPosition(pointer, recognitionRegEx);
      if (range_) {
        text.push(document.getText(range_));
        pointer = range_.end.translate(0, 1);
      } else {
        break;
      }
    }

    const result = text.map((t) => utils.escapeUnicode(t)).join("");

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
