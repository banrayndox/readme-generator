import fs from 'fs';
import path from 'path';
import { extractZipFile } from '../services/zipService.js';
import { cloneRepository } from '../services/gitService.js';
import { parseRepository } from '../parser/index.js';
import { runRepositoryAnalysis } from '../langgraph/index.js';
import { 
  updateJobProgress, 
  completeJob, 
  failJob, 
  addJobLog 
} from '../services/jobManager.js';

export const startAnalysisJob = async (jobId, type, source) => {
  let workspacePath = '';
  
  try {
    updateJobProgress(jobId, 10, 'ingesting', 'Downloading repository content...');
    
    if (type === 'zip') {
      workspacePath = await extractZipFile(source, jobId);
    } else if (type === 'github') {
      workspacePath = await cloneRepository(source, jobId);
    } else {
      throw new Error(`Unsupported ingestion type: ${type}`);
    }

    updateJobProgress(jobId, 30, 'parsing', 'Repository content loaded. Scanning folders and file symbols...');
    
    const metadata = await parseRepository(workspacePath, jobId);

    updateJobProgress(jobId, 60, 'analyzing', 'Metadata extracted successfully. Contacting AI engine...');
    
    const finalResult = await runRepositoryAnalysis(jobId, metadata);

    updateJobProgress(jobId, 95, 'completing', 'Saving results and cleaning workspace...');
    
    cleanTempWorkspace(workspacePath);
    completeJob(jobId, finalResult);

  } catch (error) {
    console.error(`Analysis failed for job ${jobId}:`, error);
    if (workspacePath) {
      cleanTempWorkspace(workspacePath);
    }
    failJob(jobId, error.message || 'An unexpected error occurred during processing.');
  }
};

const cleanTempWorkspace = (workspacePath) => {
  try {
    const resolvedPath = path.resolve(workspacePath);
    const tempRoot = path.resolve(process.cwd(), 'temp');
    if (resolvedPath.startsWith(tempRoot) && resolvedPath !== tempRoot) {
      if (fs.existsSync(resolvedPath)) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
        console.log(`Cleaned up temporary workspace: ${resolvedPath}`);
      }
    }
  } catch (err) {
    console.warn(`Failed to clean workspace directory ${workspacePath}:`, err);
  }
};
