import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { addJobLog } from './jobManager.js';

export const extractZipFile = async (zipFilePath, jobId) => {
  const tempWorkspace = path.join(process.cwd(), 'temp', jobId);

  addJobLog(jobId, 'Scan', `Extracting repository ZIP file...`);

  if (!fs.existsSync(zipFilePath)) {
    throw new Error('Upload file does not exist on the server.');
  }

  if (!fs.existsSync(tempWorkspace)) {
    fs.mkdirSync(tempWorkspace, { recursive: true });
  }

  try {
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      const entryName = entry.entryName;
      const targetPath = path.resolve(tempWorkspace, entryName);
      if (!targetPath.startsWith(path.resolve(tempWorkspace))) {
        throw new Error(`Security breach detected: ZIP contains invalid path traversal file '${entryName}'`);
      }
    }

    zip.extractAllTo(tempWorkspace, true);
    addJobLog(jobId, 'Scan', `ZIP extraction completed successfully.`);
    
    const actualRoot = getActualProjectRoot(tempWorkspace);
    return actualRoot;
  } catch (error) {
    console.error('ZIP Extraction Error:', error);
    addJobLog(jobId, 'Error', `Failed to extract zip file: ${error.message}`);
    throw new Error(`ZIP extraction failed: ${error.message}`);
  }
};

const getActualProjectRoot = (rootPath) => {
  const files = fs.readdirSync(rootPath);
  if (files.length === 1) {
    const singlePath = path.join(rootPath, files[0]);
    if (fs.statSync(singlePath).isDirectory()) {
      return singlePath;
    }
  }
  return rootPath;
};
