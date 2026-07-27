import fs from 'fs';

export const parseSourceFile = (filePath, ext) => {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return parseJavaScriptSymbols(code);
    } else if (ext === '.py') {
      return parsePythonSymbols(code);
    }
    
    return { imports: [], exports: [], classes: [], functions: [], routes: [] };
  } catch (error) {
    console.error(`Failed to parse file AST: ${filePath}`, error);
    return { imports: [], exports: [], classes: [], functions: [], routes: [] };
  }
};

const parseJavaScriptSymbols = (code) => {
  const imports = [];
  const exports = [];
  const classes = [];
  const functions = [];
  const routes = [];

  const importRegex = /import\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /(?:const|let|var)\s+[\w\s{},*]+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    if (match[1]) imports.push(match[1]);
  }
  while ((match = requireRegex.exec(code)) !== null) {
    if (match[1]) imports.push(match[1]);
  }

  const classRegex = /class\s+([A-Za-z0-9_$]+)/g;
  while ((match = classRegex.exec(code)) !== null) {
    classes.push(match[1]);
  }

  const functionRegex = /function\s+([A-Za-z0-9_$]+)\s*\(/g;
  const arrowFunctionRegex = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  const methodRegex = /^\s*(?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/gm;

  while ((match = functionRegex.exec(code)) !== null) {
    functions.push(match[1]);
  }
  while ((match = arrowFunctionRegex.exec(code)) !== null) {
    functions.push(match[1]);
  }
  
  const reservedWords = new Set(['if', 'for', 'while', 'switch', 'catch', 'constructor']);
  while ((match = methodRegex.exec(code)) !== null) {
    if (!reservedWords.has(match[1]) && !functions.includes(match[1])) {
      functions.push(match[1]);
    }
  }

  const routeRegex = /(?:app|router|route)\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]/gi;
  while ((match = routeRegex.exec(code)) !== null) {
    routes.push(`${match[1].toUpperCase()} ${match[2]}`);
  }

  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)?\s*([A-Za-z0-9_$]+)?/g;
  while ((match = exportRegex.exec(code)) !== null) {
    if (match[1]) exports.push(match[1]);
  }

  const moduleExportsRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
  const moduleExportMatch = moduleExportsRegex.exec(code);
  if (moduleExportMatch && moduleExportMatch[1]) {
    const list = moduleExportMatch[1].split(',').map(s => s.trim().split(':')[0].trim());
    exports.push(...list.filter(item => /^[A-Za-z0-9_$]+$/.test(item)));
  }

  return {
    imports: [...new Set(imports)],
    exports: [...new Set(exports)],
    classes: [...new Set(classes)],
    functions: [...new Set(functions)],
    routes: [...new Set(routes)]
  };
};

const parsePythonSymbols = (code) => {
  const imports = [];
  const classes = [];
  const functions = [];

  const importRegex = /^\s*import\s+([A-Za-z0-9_.,\s]+)/gm;
  const fromImportRegex = /^\s*from\s+([A-Za-z0-9_.]+)\s+import/gm;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const modules = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    imports.push(...modules);
  }
  while ((match = fromImportRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  const classRegex = /^\s*class\s+([A-Za-z0-9_]+)/gm;
  while ((match = classRegex.exec(code)) !== null) {
    classes.push(match[1]);
  }

  const defRegex = /^\s*def\s+([A-Za-z0-9_]+)\s*\(/gm;
  while ((match = defRegex.exec(code)) !== null) {
    const funcName = match[1];
    if (funcName !== '__init__') {
      functions.push(funcName);
    }
  }

  return {
    imports: [...new Set(imports)],
    exports: [],
    classes: [...new Set(classes)],
    functions: [...new Set(functions)],
    routes: []
  };
};
