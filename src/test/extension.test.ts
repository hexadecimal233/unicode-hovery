import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as utils from "../utils";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("C2U", () => {
    const exampleText = "啊啊ff啊啊🀄ww🀄1122wwww";
    const genCommand = (
      includeSurrogate: boolean,
      ignoreAscii: boolean,
      utf8: boolean
    ) => {
      return utils.toUnicode(
        utils.toUnicodeArray(exampleText, includeSurrogate),
        ignoreAscii,
        utf8
      );
    };
  });
});
