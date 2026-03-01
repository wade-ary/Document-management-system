// "use client"
// import { useState } from "react";
// import FileList from "./ModernFileList";
// import { File } from "../app/types";

// const FileSystem = () => {
//   // Sample file structure with files and folders
//   const initialFiles: File[] = [
//     { id: "1", name: "Documents", isDirectory: true, files: [] },
//     { id: "2", name: "file1.txt", isDirectory: false, content: "File 1 content" },
//     { id: "3", name: "file2.txt", isDirectory: false, content: "File 2 content" },
//     { id: "4", name: "Music", isDirectory: true, files: [] },
//   ];

//   const [currentFiles, setCurrentFiles] = useState<File[]>(initialFiles);
//   const [path, setPath] = useState<string>("Home");

//   // Handle folder click and navigate to its contents
//   const handleFileClick = (file: File) => {
//     if (file.isDirectory) {
//       setPath(path + " > " + file.name);
//       setCurrentFiles(file.files || []);
//     } else {
//       // For files, you can open or show content
//       alert(`Opening file: ${file.name}`);
//     }
//   };

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">File System</h1>
//       <p className="mb-6">Current Path: {path}</p>
//       <FileList files={currentFiles} onFileClick={handleFileClick} />
//     </div>
//   );
// };

// export default FileSystem;
