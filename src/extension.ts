// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ASIChatHandler } from "./chatHandler";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // create participant
  const tutor = vscode.chat.createChatParticipant(
    "chat.ivar-project-assistant",
    ASIChatHandler
  );
  // add icon to participant
  tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, "assistant.jpg");
}

// This method is called when your extension is deactivated
export function deactivate() {}
