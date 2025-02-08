import path from "path";
import * as vscode from "vscode";
import * as fs from 'fs';


export const describeMigrationFolder = async () => {
  console.log("ARE YOU HERE!!!!!!!!!!");
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let projectDescription = "Following are table names in migration folder for the given service ";
  let projectDescriptions = new Map<String,String[]>();
  if (workspaceFolders) {
     const rootPath = workspaceFolders[0].uri.fsPath;
    // Regular expression to exclude files with .down.sql extension
    const files = await vscode.workspace.findFiles("**/*.up.sql");
    projectDescription += path.basename(rootPath) + " are :" ;
    // Read and process all .sql files in the directory
         for(let i = 0; i < files.length; i++) {
            const file = files[i]; 
                  let content = fs.readFileSync(file.path, 'utf-8');
                  if (content.includes("CREATE TABLE")) {
                        content =  content.replaceAll("IF NOT EXISTS","");
                       const createTableRegex = /CREATE TABLE\s+(\w+)\s*\(([^;]+)\)/gi;
                    const columnRegex = /(\w+)\s+[\w\(\)]+/gi;
                        let match;
                         while ((match = createTableRegex.exec(content)) !== null) {
                            if (match.input !== null) {
                                const tableDescInstring = match;
                                const tableName = tableDescInstring[1];
                                const columnsString = tableDescInstring[2];
                                const columns: String[] = [];
                                const foreignKeyReference: String[] = [];
                                const constraints: String[] = [];
                                let columnMatch = columnRegex.exec(columnsString);
                                if (columnMatch !== null && columnMatch.input !== null) {
                                    columnMatch.input.split(",").forEach((column) => {
                                        
                                        if (column.trim().startsWith("FOREIGN KEY")) {
                                            foreignKeyReference.push(column.trim()+ `\n\n`);
                                        }
                                          if (column.trim().startsWith("CONSTRAINT")) {
                                            constraints.push(column.trim() + `\n\n`);
                                        }else {
                                             columns.push(column.trim() + `\n\n`);
                                        }

                                    });
                                }
                                projectDescriptions.set(tableName, columns.concat(foreignKeyReference).concat(constraints));
                                 }
                                }
                        };
                    
        };
} else {
    vscode.window.showInformationMessage("No workspace folder is open");
  }
  for (let [tableName, columns] of projectDescriptions) { 
     projectDescription += "\n\n"; 
    projectDescription += "TABLE_NAME   :  "+ tableName + "\n\n COLUMNS  :   " + columns.join("");
    projectDescription += "-----------------------------------------";
}

 return projectDescription ;
};