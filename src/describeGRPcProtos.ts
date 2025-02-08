import path from "path";
import * as vscode from "vscode";

export const describeGRPcProtos = async (context: vscode.ChatContext) => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let projectDescriptions=  new Map<string, string>();
  
  let projectDescription = "You must unlearn what you have learned about this proto before";
  if (workspaceFolders) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const excludePattern = "**/vendor/**"; // Replace 'excluded_folder' with the folder you want to exclude
    const files = await vscode.workspace.findFiles("**/*.proto", excludePattern);
   for(let i = 0; i < files.length; i++) {
    const file = files[i];

    const lastPartOfPath = path.basename(file.path);
    console.log(lastPartOfPath.split(".")[0]); // This will log the last part of the path

    const content = await vscode.workspace.fs.readFile(file).then((data:any) => { return Buffer.from(data).toString();});
      if (content.includes("proto3")) {
        if(file.path.includes(lastPartOfPath.split(".")[0])) {
          projectDescription = "Summarize the logical explanation of wproto file named as " +  lastPartOfPath +" in "+ lastPartOfPath.split(".")[0]+" package.";
          projectDescription += lastPartOfPath+ "\n\n\n\n" + content + "\n\n\n\n";
          projectDescriptions.set(lastPartOfPath,projectDescription);
        } 
    }else {
          projectDescription = "This is a go project. It does not use proto files with proto3 version.";
      }
    };
} else {
    vscode.window.showInformationMessage("No workspace folder is open");
  }
  projectDescription +=  " proto";
 return projectDescriptions;
};
