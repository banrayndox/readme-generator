export const generateModuleChunks = (parsedFiles, maxFilesPerChunk = 6) => {
  const groups = {};

  parsedFiles.forEach(file => {
    const parentDir = getParentDirectory(file.relativePath);
    if (!groups[parentDir]) {
      groups[parentDir] = [];
    }
    groups[parentDir].push(file);
  });

  const chunks = [];

  Object.keys(groups).forEach(dirPath => {
    const filesInDir = groups[dirPath];
    for (let i = 0; i < filesInDir.length; i += maxFilesPerChunk) {
      const slice = filesInDir.slice(i, i + maxFilesPerChunk);
      chunks.push({
        moduleName: dirPath === '' ? 'Root' : dirPath,
        filesCount: slice.length,
        files: slice.map(f => ({
          fileName: f.fileName,
          relativePath: f.relativePath,
          imports: f.imports,
          classes: f.classes,
          functions: f.functions,
          routes: f.routes
        }))
      });
    }
  });

  return chunks;
};

const getParentDirectory = (relativePath) => {
  const parts = relativePath.split('/');
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(0, parts.length - 1).join('/');
};
