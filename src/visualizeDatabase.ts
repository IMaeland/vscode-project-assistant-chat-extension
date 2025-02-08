import * as vscode from 'vscode';
import {
  ChatBuilder,
  importPreviousMessages,
  setPrompt,
  getGHPResponse as getGitHubCopilotResponse,
  addResponseToChat,
  replacePrompt,
  writeToChat,
} from './chatBuilder';

export const visualizeDatabase = async (
  context: vscode.ChatContext,
  builder: ChatBuilder
) => {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  importPreviousMessages(builder);

  let projectDescription =
    'You are a ent.go expert. For each of the provided schema files as text, convert the schema file to a .puml file: ';

  if (workspaceFolders) {
    const files = await vscode.workspace.findFiles('**/ent/schema/*.go');

    if (files.length === 0) {
      await writeToChat(builder, 'No Ent schema files found');
      vscode.window.showInformationMessage('No Ent schema files found');
      return;
    }

    // Read the contents of the schema files
    let schemaContents: string[] = [];
    for (const file of files) {
      const content = await vscode.workspace.fs.readFile(file);
      schemaContents.push(`File: ${file}\n${content}`);
    }

    // Append the schema contents to the project description
    projectDescription += `\n\n${schemaContents.join('\n\n')}`;

    // Set the prompt and get the chat response
    setPrompt(builder, projectDescription);
    let chatResponse = await getGitHubCopilotResponse(builder);

    // Convert the chat response to string
    const chatResponseText = await convertAsyncIterableToString(
      chatResponse.text
    );

    // Extract .puml files from chatResponseText and create visulization links
    let pumlFileHexLinks: string[][] = [];
    const pumlFiles = extractPumlFiles(chatResponseText);
    for (const [fileName, content] of Object.entries(pumlFiles)) {
      // Create a .puml file in the workspace folder
      // const pumlFilePath = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${fileName}`);
      // await vscode.workspace.fs.writeFile(pumlFilePath, Buffer.from(content));
      pumlFileHexLinks.push([
        fileName,
        'https://www.plantuml.com/plantuml/uml/~h' +
          Buffer.from(content).toString('hex'),
      ]);
    }

    // Create a new prompt with the contents of the .puml files and their associated hex links
    let newPrompt =
      'Here are the contents of the .puml files and their associated visualization links:\n\n';
    for (const [fileName, hexLink] of pumlFileHexLinks) {
      const content = pumlFiles[fileName];
      newPrompt += `File: ${fileName}\n\n${content}\n\nVisualization Link: [${fileName}](${hexLink})\n\n`;
    }

    // Set the new prompt and get the chat response
    replacePrompt(builder, newPrompt);
    chatResponse = await getGitHubCopilotResponse(builder);

    // Add introduction message to the chat
    await writeToChat(builder,`All ent schema files have been converted to PlantUML (.puml) files.\nSee https://plantuml.com/ for more information on PlantUML.\n\n`);

    await addResponseToChat(builder, chatResponse);
  } else {
    vscode.window.showInformationMessage('No workspace folder is open');
  }
};

// Function to extract .puml files from chat response
const extractPumlFiles = (response: string): { [fileName: string]: string } => {
  const pumlFiles: { [fileName: string]: string } = {};
  const regex = /@startuml([\s\S]+?)@enduml/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    const content = `@startuml${match[1]}@enduml`;
    const classNameMatch = match[1].match(/entity\s+(\w+)/);
    const fileName = classNameMatch
      ? `${classNameMatch[1]}.puml`
      : `schema${Object.keys(pumlFiles).length + 1}.puml`;
    pumlFiles[fileName] = content;
  }
  return pumlFiles;
};

// Helper function to convert AsyncIterable<string> to string
const convertAsyncIterableToString = async (
  asyncIterable: AsyncIterable<string>
): Promise<string> => {
  let result = '';
  for await (const chunk of asyncIterable) {
    result += chunk;
  }
  return result;
};
