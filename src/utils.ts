import * as vscode from "vscode";

const defaultDecoType = vscode.window.createTextEditorDecorationType({});

class Configuration {
  languages: string[] = [];
  underlineDecoType: vscode.TextEditorDecorationType = defaultDecoType;
  constructor() {
    this.update();
  }

  checkLanguages(languageId: string) {
    return this.languages.includes(languageId) || this.languages.includes("*");
  }

  update() {
    const hovery = vscode.workspace.getConfiguration("unicodeHovery");
    this.languages = hovery.get<string[]>("languages", ["*"]);

    if (this.underlineDecoType !== defaultDecoType) {
      this.underlineDecoType.dispose(); // prevent memory leak
    }

    this.underlineDecoType = hovery.get<boolean>("underline")
      ? vscode.window.createTextEditorDecorationType({
          textDecoration: `underline var(--vscode-unicodeHovery-underline)`,
        })
      : defaultDecoType;
  }
}

export const config: Configuration = new Configuration();

const extractRegEx = /[\dA-Fa-f]+/;
// unescape into readable text
export function escapeUnicode(str: string) {
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
