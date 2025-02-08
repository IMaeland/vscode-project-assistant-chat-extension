// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { describeProject } from './describeProject';
import { visualizeDatabase } from './visualizeDatabase';
import { searchConfluence } from './searchConfluence';
import {
  ChatBuilder,
  setPrompt,
  getGHPResponse as getGitHubCopilotResponse,
  addResponseToChat,
  writeToChat,
} from './chatBuilder';
import { defaultRequestProcessor } from './defaultPromptProcessor';
import { describeGRPcProtos } from './describeGRPcProtos';
import path from 'path';
import { describeMigrationFolder } from './describeMigrationFolder';
import { listAllRPCs } from './listAllRPCs';

export const ASIChatHandler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  const builder: ChatBuilder = {
    request: request,
    context: context,
    stream: stream,
    token: token,
    messages: [],
    projectRootPath: '',
    projectReadmePath: undefined,
    serviceConfigPath: undefined,
    projectMainPath: undefined,
    projectMakePath: undefined,
    projectSettingsPath: undefined,
    projectDockerfile: undefined,
    entSchemaPaths: [],
    sqlMigrationPaths: [],
    protoPaths: [],
    gitIgnoreLines: undefined,
  };

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    builder.projectRootPath = workspaceFolders[0].uri.fsPath;
  }

  if (request.command === 'describeMigrationFolder') {
    const prompt = await describeMigrationFolder();
    console.log(`PROMPT`, prompt);
    setPrompt(builder, prompt);
    const chatResponse = await getGitHubCopilotResponse(builder);
    await addResponseToChat(builder, chatResponse);
    return;
  }

  if (request.command === 'listAllRPCs') {
    try {
      const prompts = await listAllRPCs();
      for (let [protoNameAsKey, prompt] of prompts) {
        setPrompt(builder, prompt);
        const chatResponse = await getGitHubCopilotResponse(builder);
        const pathInString =
          'http://gitlab.com/appliedsystems/products/policy-works/services/' +
          path.basename(builder.projectRootPath) +
          '/-/blob/main/pkg/grpc/v1/proto/' +
          protoNameAsKey;
        const symbolLocation: vscode.Uri = vscode.Uri.parse(pathInString);
        // Render an inline anchor to a symbol in the workspace
        await writeToChat(builder, '\n\n');
        stream.anchor(symbolLocation, protoNameAsKey);
        await addResponseToChat(builder, chatResponse);
      }
      return;
    } catch (error) {}
  }
  if (request.command === 'describeGRPcProtos') {
    try {
      const prompts = await describeGRPcProtos(context);
      for (let [protoNameAsKey, prompt] of prompts) {
        setPrompt(builder, prompt);
        const chatResponse = await getGitHubCopilotResponse(builder);
        const pathInString =
          'http://gitlab.com/appliedsystems/products/policy-works/services/' +
          path.basename(builder.projectRootPath) +
          '/-/blob/main/pkg/grpc/v1/proto/' +
          protoNameAsKey;
        const symbolLocation: vscode.Uri = vscode.Uri.parse(pathInString);
        // Render an inline anchor to a symbol in the
        await writeToChat(builder, '\n\n');
        stream.anchor(symbolLocation, protoNameAsKey);
        await addResponseToChat(builder, chatResponse);
      }
      return;
    } catch (error) {}
  }

  if (request.command === 'describeProject') {
    await describeProject(builder);
    return;
  }

  if (request.command === 'visualizeDatabase') {
    await visualizeDatabase(context, builder);
    return;
  }

  if (request.command === 'searchConfluence') {
    const searchParam = request.prompt;
    await searchConfluence(context, builder, searchParam);
    return;
  }

  // default prompt for when user to not specify a command e.g. @pioneer
  await defaultRequestProcessor(builder);
  return;
};
