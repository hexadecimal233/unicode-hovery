import * as vscode from "vscode";

const recognitionRegEx =
  /(\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4}))|(\\x[\dA-Fa-f]{2})|(U+[\dA-F]{1-6})/; // Escaped Unicode | Escaped Hex | Unicode Codepoint
const wholeWordRegEx =
  /((\\u(?:\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4}))|(\\x[\dA-Fa-f]{2})|(U+[\dA-F]{1-6}))+/; // Escaped Unicode | Escaped Hex | Unicode Codepoint
const extractRegEx = /[\dA-Fa-f]+/;

let languages = vscode.workspace
  .getConfiguration("unicode-hovery")
  .get<string[]>("languages", ["*"]);

export function activate(context: vscode.ExtensionContext) {
  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("unicode-hovery")) {
      languages = vscode.workspace
        .getConfiguration("unicode-hovery")
        .get<string[]>("languages", ["*"]);
      vscode.window.showInformationMessage("Unicode Hovery reloaded");
    }
  });

  const hoverProvider = vscode.languages.registerHoverProvider(["*"], {
    provideHover: unescapedHover,
  });

  context.subscriptions.push(hoverProvider);
  context.subscriptions.push(configListener);
}

export function deactivate() {}

function unescapedHover(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  if (document.languageId !== "*" && !languages.includes("*")) {
    return;
  }

  const range = document.getWordRangeAtPosition(position, wholeWordRegEx);
  if (range) {
    // Start from the position where the cursor is
    let pointer = range.start;
    let text: string[] = [];

    while (pointer.character < range.end.character) {
      const range_ = document.getWordRangeAtPosition(pointer, recognitionRegEx);
      if (range_) {
        text.push(document.getText(range_));
        pointer = range_.end.translate(0, 1); // move to the next character
      } else {
        break;
      }
    }

    let result = text.map((t) => escapeUnicode(t)).join("");

    return new vscode.Hover(`Unescaped: ${result}`);
  }
}

// unescape into readable text
function escapeUnicode(str: string) {
  const unescaped = extractRegEx.exec(str);
  if (unescaped) {
    const codePoint = parseInt(unescaped[0], 16);
    // valid?
    if (0x0 <= codePoint && codePoint <= 0x10ffff) {
      return String.fromCodePoint(codePoint); // convert from hex
    }
  }

  return str; // fallback
}
