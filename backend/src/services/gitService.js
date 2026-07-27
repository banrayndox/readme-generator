import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import { addJobLog } from './jobManager.js';

export const cloneRepository = async (repoUrl, jobId) => {
  const tempWorkspace = path.join(process.cwd(), 'temp', jobId);
  
  if (!repoUrl || !repoUrl.startsWith('http')) {
    throw new Error('Invalid Git repository URL. Must be http/https link.');
  }

  addJobLog(jobId, 'Scan', `Cloning git repository: ${repoUrl}`);
  
  if (!fs.existsSync(path.dirname(tempWorkspace))) {
    fs.mkdirSync(path.dirname(tempWorkspace), { recursive: true });
  }

  const git = simpleGit();
  
  try {
    await git.clone(repoUrl, tempWorkspace, ['--depth', '1']);
    addJobLog(jobId, 'Scan', `Successfully cloned repository into ${tempWorkspace}`);
    return tempWorkspace;
  } catch (error) {
    console.error('Git Clone Error:', error);
    addJobLog(jobId, 'Error', `Failed to clone repository: ${error.message}`);
    throw new Error(`Git clone failed: ${error.message}`);
  }
};
