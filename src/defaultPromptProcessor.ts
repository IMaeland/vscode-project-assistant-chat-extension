import * as vscode from 'vscode';
import {
  ChatBuilder,
  importPreviousMessages,
  setPrompt,
  getGHPResponse as getGitHubCopilotResponse,
  addResponseToChat,
  buildFullProjectContext,
  setContextPrompt,  
  writeToChat,
  getProjectRelativePath,
  addFileTreeToChat,
} from './chatBuilder';
import { loadEnvFile } from 'process';

const BASE_PROMPT =
  'You are a helpful developer assistant. Your job is to review the project settings, configurations and make files. Then answer developer questions about the project.' +
  'Remember ent, entgo.io/ent, sql, postgres and migration are all related to databases; if asked for provide help how to manage databases. ' +
  'Remember grcp, proto, rpc, service, message are all related to grpc; if asked for provide help how to manage grpc and protos. ' +
  'Remember build, make, compile, test, makefile are all related to building, linting and testing; if asked for provide help on building and testing. ' +
  "Limit reply to 200 words."

export const defaultRequestProcessor = async (b: ChatBuilder) => {
  let prompt = BASE_PROMPT;

  const ctx = await buildFullProjectContext(b);
  prompt += ' ' + b.request.prompt;

  if (isAskingAboutTables(b.request.prompt)) {
    prompt += 'When describing tables also include columns and relationships. ';
    if (b.entSchemaPaths) {
      for (let i = 0; i < b.entSchemaPaths.length; i++) {
        try {
          const file = b.entSchemaPaths[i];
          const c = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
          prompt +=
            '\n File: ' + file + '\n>>>>>\n' + c.toString() + '\n<<<<<\n';
        } catch (error) {
          console.error(`Error reading file ${b.entSchemaPaths[i]}:`, error);
        }
      }
    }
    if (b.sqlMigrationPaths) {
      for (let i = 0; i < b.sqlMigrationPaths.length; i++) {
        try {
          const file = b.sqlMigrationPaths[i];
          const c = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
          prompt +=
            '\n File: ' + file + '\n>>>>>\n' + c.toString() + '\n<<<<<\n';
        } catch (error) {
          console.error(`Error reading file ${b.sqlMigrationPaths[i]}:`, error);
        }
      }
    }
  }

  // limit size of prompt to 1000 characters
  const maxPromptSize = 25000;
  if (prompt.length > maxPromptSize) {
    prompt = prompt.substring(0, maxPromptSize);
  }

  importPreviousMessages(b);
  setContextPrompt(b, ctx);
  setPrompt(b, prompt);
  const chatResponse = await getGitHubCopilotResponse(b);

  await addResponseToChat(b, chatResponse);

  if (isAskingAboutProto(b.request.prompt)) {
    if (b.protoPaths && b.protoPaths.length > 0) {
      await writeToChat(b, '\n## Proto Files');
      const fileTree: vscode.ChatResponseFileTree[] = [];
      const sortedFiles = b.protoPaths.sort();
      for (let i = 0; i < sortedFiles.length; i++) {
        fileTree.push({
          name: getProjectRelativePath(b, sortedFiles[i]),
        });
      }
      await addFileTreeToChat(b, fileTree);
    }
  }

  if (isAskingAboutTables(b.request.prompt)) {
    if (b.entSchemaPaths && b.entSchemaPaths.length > 0) {
      await writeToChat(b, '\n## Ent Schema Files');
      const fileTree: vscode.ChatResponseFileTree[] = [];
      const sortedFiles = b.entSchemaPaths.sort();
      for (let i = 0; i < sortedFiles.length; i++) {
        fileTree.push({
          name: getProjectRelativePath(b, sortedFiles[i]),
        });
      }
      await addFileTreeToChat(b, fileTree);
    }
    if (b.sqlMigrationPaths && b.sqlMigrationPaths.length > 0) {
      await writeToChat(b, '\n## Migration Files');
      const fileTree: vscode.ChatResponseFileTree[] = [];
      const sortedFiles = b.sqlMigrationPaths.sort();
      for (let i = 0; i < sortedFiles.length; i++) {
        fileTree.push({
          name: getProjectRelativePath(b, sortedFiles[i]),
        });
      }
      await addFileTreeToChat(b, fileTree);
    }
  }
};

const isAskingAboutTables = (prompt: string) => {
  const tableWords: string[] = [
    'table',
    'tables',
    'columns',
    'column',
    'schema',
    'schemas',
    'ent',
    'entgo.io/ent',
    'database',
    'migration',
    'migrations',
    'sql',
    'postgres',
  ];
  return tableWords.some((word) => prompt.includes(word));
};

const isAskingAboutProto = (prompt: string) => {
  const protoWords: string[] = ['grpc', 'proto', 'rpc', 'service', 'message'];
  return protoWords.some((word) => prompt.includes(word));
};
