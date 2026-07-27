import fs from 'fs';
import path from 'path';
import { scanRepository } from './scanner.js';
import { parseSourceFile } from './ast.js';
import { addJobLog } from '../services/jobManager.js';

export const parseRepository = async (rootPath, jobId) => {
  addJobLog(jobId, 'Parser', 'Starting repository architecture parsing...');
  
  const scanResult = await scanRepository(rootPath, jobId);
  const techProfile = analyzeProjectConfigs(scanResult.importantFiles, jobId);
  const langProfile = detectLanguages(scanResult.sourceFiles);
  
  addJobLog(jobId, 'Parser', 'Parsing source files for API routes, class definitions, and internal dependencies...');
  
  const parsedFiles = [];
  const allRoutes = [];
  const fileSummaryLimit = 50;

  const filesToScan = scanResult.sourceFiles.slice(0, fileSummaryLimit);
  
  filesToScan.forEach((file, index) => {
    if (index % 10 === 0 && index > 0) {
      addJobLog(jobId, 'Parser', `Processed ${index}/${filesToScan.length} source code files...`);
    }

    const symbols = parseSourceFile(file.fullPath, file.extension);
    
    parsedFiles.push({
      fileName: file.name,
      relativePath: file.relativePath,
      ...symbols
    });

    if (symbols.routes && symbols.routes.length > 0) {
      allRoutes.push(...symbols.routes);
    }
  });

  if (scanResult.sourceFiles.length > fileSummaryLimit) {
    addJobLog(jobId, 'Parser', `Note: Scanned first ${fileSummaryLimit} files out of ${scanResult.sourceFiles.length} to stay within model token constraints.`);
  }

  addJobLog(jobId, 'Parser', 'Repository structure fully parsed.');

  return {
    projectName: techProfile.projectName || path.basename(rootPath),
    primaryLanguage: langProfile.primary,
    languages: langProfile.all,
    framework: techProfile.framework,
    dependencies: techProfile.dependencies,
    devDependencies: techProfile.devDependencies,
    asciiTree: scanResult.asciiTree,
    routes: [...new Set(allRoutes)],
    files: parsedFiles,
    totalFilesCount: scanResult.sourceFiles.length + scanResult.importantFiles.length,
    rawFilesList: scanResult.sourceFiles.map(f => f.relativePath)
  };
};

const analyzeProjectConfigs = (importantFiles, jobId) => {
  const result = {
    projectName: '',
    framework: 'Vanilla/Unknown',
    dependencies: {},
    devDependencies: {}
  };

  const packageJsonFile = importantFiles.find(f => f.name.toLowerCase() === 'package.json');
  const requirementsFile = importantFiles.find(f => f.name.toLowerCase() === 'requirements.txt');

  if (packageJsonFile) {
    try {
      const data = JSON.parse(fs.readFileSync(packageJsonFile.fullPath, 'utf8'));
      result.projectName = data.name || '';
      result.dependencies = data.dependencies || {};
      result.devDependencies = data.devDependencies || {};

      const allDeps = { ...result.dependencies, ...result.devDependencies };
      if (allDeps['next']) result.framework = 'Next.js';
      else if (allDeps['react'] && allDeps['vite']) result.framework = 'React + Vite';
      else if (allDeps['react']) result.framework = 'React';
      else if (allDeps['vue']) result.framework = 'Vue';
      else if (allDeps['@angular/core']) result.framework = 'Angular';
      else if (allDeps['express']) result.framework = 'Express.js';
      else if (allDeps['@nestjs/core']) result.framework = 'NestJS';
      else if (allDeps['nuxt']) result.framework = 'Nuxt.js';
    } catch (err) {
      console.warn('Failed to parse package.json dependencies', err);
    }
  }

  if (requirementsFile) {
    try {
      const content = fs.readFileSync(requirementsFile.fullPath, 'utf8');
      const lines = content.split('\n');
      const deps = {};
      
      lines.forEach(line => {
        const cleanLine = line.trim().split('==')[0].trim().split('>=')[0].trim();
        if (cleanLine && !cleanLine.startsWith('#')) {
          deps[cleanLine] = 'latest';
        }
      });
      
      result.dependencies = deps;

      if (deps['django'] || deps['Django']) result.framework = 'Django';
      else if (deps['flask'] || deps['Flask']) result.framework = 'Flask';
      else if (deps['fastapi'] || deps['fastapi']) result.framework = 'FastAPI';
    } catch (err) {
      console.warn('Failed to parse requirements.txt dependencies', err);
    }
  }

  return result;
};

const detectLanguages = (sourceFiles) => {
  const counts = {};
  
  sourceFiles.forEach(file => {
    let langName = 'Other';
    switch (file.extension) {
      case '.js':
      case '.jsx':
        langName = 'JavaScript';
        break;
      case '.ts':
      case '.tsx':
        langName = 'TypeScript';
        break;
      case '.py':
        langName = 'Python';
        break;
      case '.rb':
        langName = 'Ruby';
        break;
      case '.go':
        langName = 'Go';
        break;
      case '.rs':
        langName = 'Rust';
        break;
      case '.java':
        langName = 'Java';
        break;
      case '.php':
        langName = 'PHP';
        break;
      case '.cs':
        langName = 'C#';
        break;
    }
    
    counts[langName] = (counts[langName] || 0) + 1;
  });

  const allLangs = Object.keys(counts).map(key => ({
    name: key,
    count: counts[key]
  })).sort((a, b) => b.count - a.count);

  return {
    primary: allLangs.length > 0 ? allLangs[0].name : 'Unknown',
    all: allLangs.map(l => l.name)
  };
};
