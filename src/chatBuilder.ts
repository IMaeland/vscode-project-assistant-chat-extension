import * as vscode from "vscode";

export type ChatBuilder = {
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  messages: vscode.LanguageModelChatMessage[];
  projectRootPath: string;
  projectMainPath: string | undefined;
  projectMakePath: string | undefined;
  projectDockerfile: string | undefined;
  projectSettingsPath: string | undefined;
  projectReadmePath: string | undefined;
  serviceConfigPath: string | undefined;
  entSchemaPaths: string[];
  sqlMigrationPaths: string[];
  protoPaths: string[];
  gitIgnoreLines: string[] | undefined;
};

export const importPreviousMessages = (b: ChatBuilder) => {
  // get all the previous participant messages
  const previousMessages = b.context.history.filter(
    (h: unknown) => h instanceof vscode.ChatResponseTurn
  );

  // add the previous messages to the messages array
  previousMessages.forEach((m) => {
    let fullMessage = "";
    m.response.forEach((r) => {
      const mdPart = r as vscode.ChatResponseMarkdownPart;
      fullMessage += mdPart.value.value;
    });
    b.messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
  });
};

export const setContextPrompt = (b: ChatBuilder, prompt: string) => {
  b.messages.push(vscode.LanguageModelChatMessage.Assistant(prompt));
};

export const setPrompt = (b: ChatBuilder, prompt: string) => {
  b.messages = [];
  b.messages.push(vscode.LanguageModelChatMessage.User(prompt));
};

export const addPrompt = (b: ChatBuilder, prompt: string) => {
  b.messages.push(vscode.LanguageModelChatMessage.User(prompt));
};

export const replacePrompt = (b: ChatBuilder, prompt: string) => {
  b.messages[0] = vscode.LanguageModelChatMessage.User(prompt);
};

export const buildProjectContext = async (b: ChatBuilder) => {
  let context = "";

  await loadIgnoreFile(b);

  let resp = await loadFile("package.json");
  if (resp.content.length > 0) {
    b.projectSettingsPath = resp.fileName;
    context += "\npackage.json\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("go.mod");
  if (resp.content.length > 0) {
    b.projectSettingsPath = resp.fileName;
    context += "\ngo.mod\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("makefile");
  if (resp.content.length > 0) {
    b.projectMakePath = resp.fileName;
  }

  resp = await loadFile("Makefile");
  if (resp.content.length > 0) {
    b.projectMakePath = resp.fileName;
  }

  resp = await loadFile("README.md");
  if (resp.content.length > 0) {
    b.projectReadmePath = resp.fileName;
  }

  resp = await loadFile("config.toml");
  if (resp.content.length > 0) {
    b.serviceConfigPath = resp.fileName;
  }

  resp = await loadFile("Dockerfile");
  if (resp.content.length > 0) {
    b.projectDockerfile = resp.fileName;
  }
  return context;
};

export const buildFullProjectContext = async (b: ChatBuilder) => {
  let context = "";

  await loadIgnoreFile(b);

  let resp = await loadFile("main.go");
  if (resp.content.length > 0) {
    b.projectMainPath = resp.fileName;
  }

  resp = await loadFile("package.json");
  if (resp.content.length > 0) {
    b.projectSettingsPath = resp.fileName;
    context += "\nProject File: package.json\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("go.mod");
  if (resp.content.length > 0) {
    b.projectSettingsPath = resp.fileName;
    context += "\nProject File: go.mod\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("makefile");
  if (resp.content.length > 0) {
    b.projectMakePath = resp.fileName;
    context += "\nMakefile: makefile\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("Makefile");
  if (resp.content.length > 0) {
    b.projectMakePath = resp.fileName;
    context += "\nMakefile: makefile\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("Dockerfile");
  if (resp.content.length > 0) {
    b.projectDockerfile = resp.fileName;
    context +=
      "\nThis project contains a Dockerfile for building document images.\n";
  }

  resp = await loadFile("README.md");
  if (resp.content.length > 0) {
    b.projectReadmePath = resp.fileName;
    context += "README: README.md\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  resp = await loadFile("*.toml");
  if (resp.content.length > 0) {
    b.serviceConfigPath = resp.fileName;
    (context += "Project configuration: "), resp.fileName + "\n>>>>\n";
    context += resp.content;
    context += "<<<<\n";
  }

  const entFiles = await vscode.workspace.findFiles("**/ent/schema/*.go");
  const includedFiles: vscode.Uri[] = [];
  for (let i = 0; i < entFiles.length; i++) {
    // migration files are copied to release folder do not include them
    if (shouldIncludeFile(b, entFiles[i].path)) {
      includedFiles.push(entFiles[i]);
    }
  }
  if (includedFiles.length > 0) {
    context += "\nEnt schema files: ";
    b.entSchemaPaths = [];
    includedFiles.forEach((f) => {
      context += f.path + ", ";
      b.entSchemaPaths.push(f.path);
    });
    context += "\n";
  }

  const migrationFiles = await vscode.workspace.findFiles("**/*.sql");
  if (migrationFiles.length > 0) {
    context += "\nDatabase migration files: ";
    b.sqlMigrationPaths = [];

    const includedFiles: vscode.Uri[] = [];
    for (let i = 0; i < migrationFiles.length; i++) {
      // migration files are copied to release folder do not include them
      if (shouldIncludeFile(b, migrationFiles[i].path)) {
        includedFiles.push(migrationFiles[i]);
      }
    }
    includedFiles.forEach((f) => {
      context += f.path + ", ";
      b.sqlMigrationPaths.push(f.path);
    });
    context += "\n";
  }

  const protoFiles = await vscode.workspace.findFiles("**/*.proto");
  if (protoFiles.length > 0) {
    context += "\nProto files: ";
    b.protoPaths = [];
    const includedFiles = protoFiles;
    includedFiles.forEach((f) => {
      context += f.path + ", ";
      b.protoPaths.push(f.path);
    });
    context += "\n";
  }
  return context;
};

export const getGHPResponse = async (b: ChatBuilder) => {
  return await b.request.model.sendRequest(b.messages, {}, b.token);
};

export const addResponseToChat = async (
  b: ChatBuilder,
  response: vscode.LanguageModelChatResponse
) => {
  for await (const fragment of response.text) {
    b.stream.markdown(fragment);
  }
};

export const writeToChat = async (b: ChatBuilder, text: string) => {
  b.stream.markdown(text);
};

export const addFileTreeToChat = async (
  b: ChatBuilder,
  value: vscode.ChatResponseFileTree[]
) => {
  b.stream.filetree(value, vscode.Uri.file(b.projectRootPath));
};

export const addAnchorToChat = async (
  b: ChatBuilder,
  value: string,
  title?: string
) => {
  b.stream.anchor(vscode.Uri.file(value), title);
};

export const addButtonToChat = async (b: ChatBuilder, cmd: vscode.Command) => {
  b.stream.button(cmd);
};

const loadFile = async (file: string) => {
  const files = await vscode.workspace.findFiles(file);
  let content = "";
  let fileName = "";

  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    return { content, fileName };
  }

  const rootPath = vscode.Uri.file(
    vscode.workspace.workspaceFolders[0].uri.fsPath
  );
  const fullPath = vscode.Uri.joinPath(rootPath, file);

  try {
    const buff = await vscode.workspace.fs.readFile(fullPath);
    content += buff.toString();
    fileName = fullPath.fsPath;

    return { content, fileName };
  } catch (error) {
    return { content, fileName };
  }
};

export const getProjectName = () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    return workspaceFolders[0].name;
  }
  return "";
};

export const getProjectRelativePath = (b: ChatBuilder, path: string) => {
  const relPath = path.replace(b.projectRootPath, "");
  if (relPath.startsWith("/")) {
    return relPath.substring(1);
  }
  return relPath;
};

export const coreProjectFiles = (b: ChatBuilder) => {
  const files: string[] = [];

  if (b.projectMainPath) {
    files.push(b.projectMainPath);
  }
  if (b.projectMakePath) {
    files.push(b.projectMakePath);
  }
  if (b.projectSettingsPath) {
    files.push(b.projectSettingsPath);
  }
  if (b.projectDockerfile) {
    files.push(b.projectDockerfile);
  }
  if (b.projectReadmePath) {
    files.push(b.projectReadmePath);
  }
  if (b.serviceConfigPath) {
    files.push(b.serviceConfigPath);
  }

  return files;
};

export const shouldIncludeFile = (b: ChatBuilder, fileName: string) => {
  const relFile = getProjectRelativePath(b, fileName);

  if (!b.gitIgnoreLines) return true;

  for (let i = 0; i < b.gitIgnoreLines.length; i++) {
    const line = b.gitIgnoreLines[i];
    if (line === relFile) {
      return false;
    }
    if (relFile.startsWith(line)) {
      return false;
    }
  }

  return true;
};

const loadIgnoreFile = async (b: ChatBuilder) => {
  const files = await vscode.workspace.findFiles(".gitignore");
  if (files.length > 0) {
    const c = await vscode.workspace.fs.readFile(
      vscode.Uri.file(files[0].fsPath)
    );
    b.gitIgnoreLines = c.toString().split("\n");
    // remove empty and comment lines
    b.gitIgnoreLines = b.gitIgnoreLines.filter((line) => {
      return line.trim().length > 0 && !line.startsWith("#");
    });
  } else {
    b.gitIgnoreLines = [];
  }
};
