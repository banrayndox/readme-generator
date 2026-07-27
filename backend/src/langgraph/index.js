import { StateGraph, Annotation } from '@langchain/langgraph';
import { generateText, streamCompletion } from '../services/groqService.js';
import { generateModuleChunks } from '../chunker/index.js';
import { addJobLog } from '../services/jobManager.js';
import * as Prompts from '../prompts/templates.js';

const GraphState = Annotation.Root({
  jobId: Annotation(),
  metadata: Annotation(),
  chunks: Annotation(),
  moduleSummaries: Annotation(),
  architecture: Annotation(),
  readme: Annotation(),
  healthScore: Annotation(),
  suggestions: Annotation()
});

const scanDependenciesNode = async (state) => {
  const { jobId, metadata } = state;
  addJobLog(jobId, 'Scan', `Analyzing external dependencies list: ${Object.keys(metadata.dependencies || {}).length} modules found.`);
  return { ...state };
};

const directoryAnalysisNode = async (state) => {
  const { jobId, metadata } = state;
  addJobLog(jobId, 'Scan', 'Mapping codebase modules and grouping directories...');
  
  const chunks = generateModuleChunks(metadata.files);
  addJobLog(jobId, 'Chunk', `Created ${chunks.length} modular package chunks for parsing.`);
  
  return {
    ...state,
    chunks
  };
};

const parallelModuleAnalysisNode = async (state) => {
  const { jobId, chunks } = state;
  addJobLog(jobId, 'Parser', `Starting parallel module summarization for ${chunks.length} directories...`);

  const moduleSummaries = [];

  for (const chunk of chunks) {
    addJobLog(jobId, 'Parser', `Summarizing directory module: ${chunk.moduleName}`);
    
    const prompt = `
Module Name: ${chunk.moduleName}
Files in module: ${chunk.filesCount}
Files metadata:
${JSON.stringify(chunk.files, null, 2)}
    `;

    try {
      const summary = await generateText(prompt, Prompts.MODULE_SUMMARIZER_PROMPT);
      moduleSummaries.push({
        moduleName: chunk.moduleName,
        summary
      });
      addJobLog(jobId, 'Parser', `Summary complete for ${chunk.moduleName}`);
    } catch (err) {
      console.error(`Failed to summarize module ${chunk.moduleName}:`, err);
      moduleSummaries.push({
        moduleName: chunk.moduleName,
        summary: 'No details available.'
      });
    }
  }

  return {
    ...state,
    moduleSummaries
  };
};

const architectureBuilderNode = async (state) => {
  const { jobId, metadata, moduleSummaries } = state;
  addJobLog(jobId, 'Groq', 'Synthesizing project structural components to generate System Architecture Overview...');

  const prompt = `
Project Name: ${metadata.projectName}
Framework: ${metadata.framework}
Primary Language: ${metadata.primaryLanguage}
ASCII Directory Tree:
\`\`\`text
${metadata.asciiTree}
\`\`\`
Routes catalog:
${JSON.stringify(metadata.routes, null, 2)}

Module Summaries:
${moduleSummaries.map(m => `### Module: ${m.moduleName}\n${m.summary}`).join('\n\n')}
  `;

  const architecture = await generateText(prompt, Prompts.ARCHITECTURE_BUILDER_PROMPT);
  addJobLog(jobId, 'Groq', 'System Architecture successfully built with Mermaid flows.');

  return {
    ...state,
    architecture
  };
};

const readmeBuilderNode = async (state) => {
  const { jobId, metadata, moduleSummaries, architecture } = state;
  addJobLog(jobId, 'Groq', 'Initializing streaming Markdown README generator...');

  const prompt = `
Project: ${metadata.projectName}
Framework: ${metadata.framework}
Primary Language: ${metadata.primaryLanguage}
Dependencies: ${JSON.stringify(metadata.dependencies, null, 2)}
ASCII Directory Tree:
\`\`\`text
${metadata.asciiTree}
\`\`\`
API Routes:
${JSON.stringify(metadata.routes, null, 2)}

Module Summaries:
${moduleSummaries.map(m => `* **${m.moduleName}**: ${m.summary}`).join('\n')}

Architecture summary outline:
${architecture.slice(0, 1000)}...
  `;

  const readme = await streamCompletion(prompt, Prompts.README_BUILDER_PROMPT, (token) => {
    addJobLog(jobId, 'Groq', token);
  });

  addJobLog(jobId, 'Groq', 'README.md generation completed.');

  return {
    ...state,
    readme
  };
};

const qualityValidatorNode = async (state) => {
  const { jobId, readme } = state;
  addJobLog(jobId, 'Groq', 'Verifying Markdown formatting and stripping empty placeholders...');

  const prompt = `
Please validate this README content:
${readme}
  `;

  const validatedReadme = await generateText(prompt, Prompts.QUALITY_VALIDATOR_PROMPT);
  
  return {
    ...state,
    readme: validatedReadme
  };
};

const healthCalculatorNode = async (state) => {
  const { jobId, metadata, readme } = state;
  addJobLog(jobId, 'Groq', 'Evaluating documentation quality and calculating Health Score matrix...');

  const prompt = `
Evaluate the health metrics of this project:
Project Name: ${metadata.projectName}
Framework: ${metadata.framework}
Source Files Count: ${metadata.files.length}
Primary Language: ${metadata.primaryLanguage}
API Routes found: ${metadata.routes.length}
README file length: ${readme.length} chars
  `;

  let healthScore = {
    overallScore: 75,
    breakdown: {
      documentation: { score: 70, reason: 'LLM calculation unavailable' },
      architecture: { score: 70, reason: 'LLM calculation unavailable' },
      maintainability: { score: 70, reason: 'LLM calculation unavailable' },
      security: { score: 70, reason: 'LLM calculation unavailable' },
      scalability: { score: 70, reason: 'LLM calculation unavailable' }
    }
  };
  let suggestions = ['Enable complete project validations.'];

  try {
    const rawJson = await generateText(prompt, Prompts.HEALTH_SCORE_PROMPT);
    const cleanedJson = cleanJsonResponse(rawJson);
    const parsed = JSON.parse(cleanedJson);
    if (parsed.overallScore) healthScore = parsed;
    if (parsed.suggestions) suggestions = parsed.suggestions;
  } catch (err) {
    console.error('Failed to parse health score JSON, mapping fallbacks:', err);
  }

  return {
    ...state,
    healthScore,
    suggestions
  };
};

const cleanJsonResponse = (str) => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
};

const workflow = new StateGraph(GraphState)
  .addNode('scan_dependencies', scanDependenciesNode)
  .addNode('directory_analysis', directoryAnalysisNode)
  .addNode('parallel_module_analysis', parallelModuleAnalysisNode)
  .addNode('architecture_builder', architectureBuilderNode)
  .addNode('readme_builder', readmeBuilderNode)
  .addNode('quality_validator', qualityValidatorNode)
  .addNode('health_calculator', healthCalculatorNode)
  
  .addEdge('__start__', 'scan_dependencies')
  .addEdge('scan_dependencies', 'directory_analysis')
  .addEdge('directory_analysis', 'parallel_module_analysis')
  .addEdge('parallel_module_analysis', 'architecture_builder')
  .addEdge('architecture_builder', 'readme_builder')
  .addEdge('readme_builder', 'quality_validator')
  .addEdge('quality_validator', 'health_calculator')
  .addEdge('health_calculator', '__end__');

const compiledGraph = workflow.compile();

export const runRepositoryAnalysis = async (jobId, metadata) => {
  const initialState = {
    jobId,
    metadata,
    chunks: [],
    moduleSummaries: [],
    architecture: '',
    readme: '',
    healthScore: {},
    suggestions: []
  };

  const finalState = await compiledGraph.invoke(initialState);
  
  return {
    projectName: finalState.metadata.projectName || 'Repository',
    readme: finalState.readme,
    architecture: finalState.architecture,
    summary: `This is a ${finalState.metadata.primaryLanguage} repository powered by ${finalState.metadata.framework}. Built with ${finalState.metadata.files.length} modules, providing ${finalState.metadata.routes.length} REST endpoints.`,
    techStack: {
      primaryLanguage: finalState.metadata.primaryLanguage,
      languages: finalState.metadata.languages,
      framework: finalState.metadata.framework,
      dependencies: finalState.metadata.dependencies
    },
    folderStructure: finalState.metadata.asciiTree,
    healthScore: finalState.healthScore,
    suggestions: finalState.suggestions
  };
};
