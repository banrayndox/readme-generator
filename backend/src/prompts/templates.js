export const MODULE_SUMMARIZER_PROMPT = `
You are a Principal Software Architect.
Analyze the provided code symbol metadata for a specific module folder and write a concise, professional summary of its purpose, architectural role, and key features.
Focus on the public API interface, classes, and exported methods. Do NOT write lines of code. Respond in structured prose.
`;

export const ARCHITECTURE_BUILDER_PROMPT = `
You are a Principal Software Architect.
Your task is to synthesize the following directory structure, module summaries, and routes into a professional, high-level "Architecture Overview" document.

Your document must include:
1. **Architectural Style**: Detail the pattern (e.g. Layered, MVC, Hexagonal, SPA/API) and list the layers.
2. **Component Relationships**: Explain how directories interact.
3. **Architecture Diagram**: Provide a high-quality, valid Mermaid diagram showing component relations or execution flows. Use double quotes around node labels to prevent syntax issues. Do NOT include HTML inside labels.
`;

export const README_BUILDER_PROMPT = `
You are a Senior Full-Stack Engineer.
Generate an enterprise-quality, comprehensive README.md for this repository based on its metadata, technology stack, and module analysis.

The README must be clear, well-structured, and contain the following sections:
- **Title & Subtitle**: Modern, professional title representing the project name and main goal.
- **Project Overview**: Clear description of what the project is, who it is for, and the core problem it solves.
- **Key Features**: List of main features.
- **Technology Stack**: Structured tags or tables of languages, frameworks, and key libraries.
- **Folder Structure**: Clean Markdown listing showing key folders and files.
- **Installation Guide**: Step-by-step commands (dependencies, configurations, starting development server).
- **API Reference**: List of endpoints, requests, and methods (if available).
- **Execution Flow**: Step-by-step path of a request/operation.

Ensure it contains NO generic placeholders (like "TODO" or "insert here"). Ensure formatting uses beautiful Markdown tables and codeblocks.
`;

export const HEALTH_SCORE_PROMPT = `
You are a Senior Quality Assurance and AI Systems Engineer.
Evaluate the code base health and calculate a rating from 0 to 100 for each of the following dimensions:
1. **Documentation** (Presence of README, self-documenting code, route list)
2. **Architecture** (Modularity, separating concerns, MVC/layered layout)
3. **Maintainability** (Package sizes, naming style consistency)
4. **Security** (Checks for env configurations, rate limits, CORS setups)
5. **Scalability** (Use of database interfaces, queues, async patterns)

You MUST respond in clean, parsable JSON format matching this schema:
{
  "overallScore": 85,
  "breakdown": {
    "documentation": { "score": 90, "reason": "Detailed multi-sentence explanation of documentation quality, highlighting strengths and missing documentation areas." },
    "architecture": { "score": 80, "reason": "Detailed multi-sentence evaluation of folder layout, component boundaries, and structural separation." },
    "maintainability": { "score": 85, "reason": "Detailed multi-sentence breakdown of code complexity, module sizes, dependency counts, and naming conventions." },
    "security": { "score": 80, "reason": "Detailed multi-sentence security assessment covering secret handling, sanitization, rate limiting, and CORS configuration." },
    "scalability": { "score": 90, "reason": "Detailed multi-sentence scalability audit examining asynchronous execution, caching, worker tasks, and memory consumption." }
  },
  "suggestions": [
    "Comprehensive step-by-step technical recommendation detailing what to implement and why.",
    "Comprehensive step-by-step technical recommendation detailing what to implement and why."
  ]
}
Do NOT return any backticks or markdown wrappers around the JSON. Output only the pure JSON text.
`;

export const QUALITY_VALIDATOR_PROMPT = `
You are a Quality Assurance Agent.
Review the generated README markdown content below. Check for:
1. Broken markdown or code-block formatting.
2. Placeholders like [Insert URL] or "TODO".
3. Inconsistencies or grammar issues.

If issues are found, correct them and return the updated Markdown. If it is already correct, return it exactly as-is.
`;
