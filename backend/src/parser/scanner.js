import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { addJobLog } from '../services/jobManager.js';

const DEFAULT_IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'coverage', 
  '.next', '.cache', 'venv', '__pycache__', '.vscode', 
  '.idea', 'bin', 'obj', 'tmp', 'temp', 'out', '.expo'
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf',
  '.zip', '.gz', '.tar', '.rar', '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.eot', '.ttf', '.mp3', '.mp4', '.mov', '.avi',
  '.flv', '.db', '.sqlite', '.ds_store', '.apk', '.dmg'
]);

const IMPORTANT_FILE_NAMES = new Set([
  'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'requirements.txt', 'pipfile', 'gemfile', 'cargo.toml', 'go.mod',
  'dockerfile', 'docker-compose.yml', 'readme.md', '.env.example',
  'vite.config.js', 'vite.config.ts', 'next.config.js', 'next.config.mjs',
  'server.js', 'app.js', 'main.py', 'app.py', 'app.jsx', 'main.jsx',
  'tsconfig.json', 'angular.json', 'webpack.config.js'
]);

export const scanRepository = async (rootPath, jobId) => {
  addJobLog(jobId, 'Scan', 'Initializing repository file scanner...');

  const ig = ignore();
  ig.add(DEFAULT_IGNORED_DIRS);

  const gitignorePath = path.join(rootPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
      addJobLog(jobId, 'Scan', 'Loaded project-specific .gitignore rules.');
    } catch (err) {
      console.warn('Failed to parse .gitignore:', err);
    }
  }

  const importantFiles = [];
  const sourceFiles = [];
  
  const isIgnored = (relativePath, isDirectory) => {
    if (ig.ignores(relativePath)) return true;
    const baseName = path.basename(relativePath);
    if (isDirectory) {
      return DEFAULT_IGNORED_DIRS.includes(baseName);
    }
    const ext = path.extname(baseName).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return true;
    return false;
  };

  const walk = (dir, depth = 0) => {
    const list = fs.readdirSync(dir);
    const results = [];

    for (const file of list) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      const isDirectory = stat.isDirectory();

      if (isIgnored(relativePath, isDirectory)) {
        continue;
      }

      if (isDirectory) {
        results.push({
          name: file,
          type: 'directory',
          relativePath,
          children: walk(fullPath, depth + 1)
        });
      } else {
        const ext = path.extname(file).toLowerCase();
        
        if (IMPORTANT_FILE_NAMES.has(file.toLowerCase())) {
          importantFiles.push({
            name: file,
            relativePath,
            fullPath
          });
        }

        if (['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.php', '.cs'].includes(ext)) {
          sourceFiles.push({
            name: file,
            relativePath,
            fullPath,
            extension: ext
          });
        }

        results.push({
          name: file,
          type: 'file',
          relativePath,
          size: stat.size
        });
      }
    }

    return results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  addJobLog(jobId, 'Scan', 'Crawling files and directory hierarchies...');
  const fileTree = walk(rootPath);

  addJobLog(jobId, 'Scan', 'Generating ASCII directory layout diagram...');
  const asciiTree = generateAsciiTree(fileTree);

  addJobLog(jobId, 'Scan', `Scan complete. Found ${sourceFiles.length} parseable source files and ${importantFiles.length} config file structures.`);

  return {
    asciiTree,
    fileTree,
    importantFiles,
    sourceFiles
  };
};

const generateAsciiTree = (treeNodes, prefix = '', depth = 0, maxDepth = 6) => {
  if (depth > maxDepth) {
    return `${prefix}└── [Max depth reached...]\n`;
  }

  let ascii = '';
  treeNodes.forEach((node, index) => {
    const isLast = index === treeNodes.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (node.type === 'directory') {
      ascii += `${prefix}${connector}${node.name}/\n`;
      if (node.children && node.children.length > 0) {
        ascii += generateAsciiTree(node.children, childPrefix, depth + 1, maxDepth);
      }
    } else {
      ascii += `${prefix}${connector}${node.name}\n`;
    }
  });

  return ascii;
};
