import * as vscode from 'vscode';
import {
  ChatBuilder,
  getProjectName,
  setPrompt,
  getProjectRelativePath,
  getGHPResponse as getGitHubCopilotResponse,
  addResponseToChat,
  buildProjectContext,
  setContextPrompt,
  writeToChat,
  addFileTreeToChat,
  coreProjectFiles,
  addPrompt,
} from './chatBuilder';

const BASE_PROMPT =
  'Given the go.mod below file or package.json file, analyze the contents and generate a brief summary of the project dependencies, categorized by their purpose. \n' +
  'Please ensure the summary is concise and easy to understand.\n';

export const describeProject = async (b: ChatBuilder) => {
  const ctx = await buildProjectContext(b);
  //setContextPrompt(b, ctx);
  setPrompt(b, BASE_PROMPT);
  addPrompt(b, ctx);  
  addPrompt(b, "after the summary of project depdendencies, create a list of learning reources for the project.");  
  const chatResponse = await getGitHubCopilotResponse(b);

  await addResponseToChat(b, chatResponse);

  const projectFiles = coreProjectFiles(b);
  const fileTree: vscode.ChatResponseFileTree[] = [];
  projectFiles.forEach(async (file) => {
    fileTree.push({
      name: getProjectRelativePath(b, file),
    });
  });
  await addFileTreeToChat(b, fileTree);
};
