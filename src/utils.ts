import exp from "constants";
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

const extractRegEx = /[0-9A-Fa-f]+/;

// unicode into characters
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

function utf8Encode(cpArray: number[]) {
  let bytes: number[] = [];

  for (let cp of cpArray) {
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6));
      bytes.push(0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    } else if (cp < 0x110000) {
      bytes.push(0xf0 | (cp >> 18));
      bytes.push(0x80 | ((cp >> 12) & 0x3f));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    }
  }
  return bytes;
}

export function toUnicode(
  cpArray: number[],
  ignoreAscii: boolean,
  utf8: boolean
) {
  let result: string[];

  if (utf8) {
    result = utf8Encode(cpArray).map((cp) => {
      if (cp < 0x7f && ignoreAscii) {
        return String.fromCharCode(cp);
      }

      return `\\x${cp.toString(16).padStart(2, "0")}`;
    });
  } else {
    result = cpArray.map((cp) => {
      if (cp < 0x7f && ignoreAscii) {
        return String.fromCharCode(cp);
      }

      if (cp > 0xffff) {
        return `\\u{${cp.toString(16)}}`;
      } else {
        return `\\u${cp.toString(16).padStart(4, "0")}`;
      }
    });
  }

  return result.join("");
}

export function toUnicodeArray(str: string, includeSurrogate: boolean) {
  let result: number[] = [];

  let idx = 0;
  while (idx < str.length) {
    if (includeSurrogate) {
      const cp = str.codePointAt(idx);
      if (!cp) {
        throw new Error("Failed to get code point:" + str);
      }

      result.push(cp);
      idx += cp > 0xffff ? 2 : 1; // 3 or 4 bytes (surrogate pair)
    } else {
      result.push(str.charCodeAt(idx));
      idx++;
    }
  }

  return result;
}
