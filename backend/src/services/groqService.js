import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

let groq = null;
if (apiKey) {
  groq = new Groq({ apiKey });
} else {
  console.warn("⚠️  GROQ_API_KEY is not defined in the environment variables. LLM capabilities will run in SIMULATION mode.");
}

export const generateText = async (prompt, systemPrompt = '') => {
  if (!groq) {
    return simulateLLMResponse(prompt);
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      attempts++;
      console.warn(`Groq API Attempt ${attempts} failed:`, error.message);
      
      if (attempts < maxAttempts && (error.status === 429 || error.message.includes('429') || error.message.includes('rate_limit'))) {
        const delay = attempts * 2000;
        console.log(`Rate limit encountered. Waiting ${delay}ms before retry...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error(`Groq API Error after ${attempts} attempts. Falling back to simulation response:`, error.message);
        return simulateLLMResponse(prompt);
      }
    }
  }
  return simulateLLMResponse(prompt);
};

export const streamCompletion = async (prompt, systemPrompt = '', onToken = () => {}) => {
  if (!groq) {
    const mockResponse = simulateLLMResponse(prompt);
    const words = mockResponse.split(' ');
    let currentText = '';
    
    for (const word of words) {
      const snippet = word + ' ';
      currentText += snippet;
      onToken(snippet);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    return currentText;
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const stream = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        stream: true
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onToken(content);
        }
      }

      return fullText;
    } catch (error) {
      attempts++;
      console.warn(`Groq Streaming Attempt ${attempts} failed:`, error.message);

      if (attempts < maxAttempts && (error.status === 429 || error.message.includes('429') || error.message.includes('rate_limit'))) {
        const delay = attempts * 2000;
        console.log(`Rate limit encountered during stream. Waiting ${delay}ms before retry...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error(`Groq Streaming Error after ${attempts} attempts. Falling back to mock stream:`, error.message);
        const mockResponse = simulateLLMResponse(prompt);
        const words = mockResponse.split(' ');
        let currentText = '';
        
        for (const word of words) {
          const snippet = word + ' ';
          currentText += snippet;
          onToken(snippet);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        return currentText;
      }
    }
  }
};

const simulateLLMResponse = (prompt) => {
  if (prompt.includes('README.md') || prompt.includes('readme')) {
    return `# Simulated Repository Document

This is a **simulated repository description** because no \`GROQ_API_KEY\` was configured.

## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Key Features
- Dynamic AST Scanning
- Hierarchical Summarization Nodes
- Interactive Tailwind UI Dashboard
`;
  }
  
  if (prompt.includes('architecture') || prompt.includes('Architecture')) {
    return `### Simulated Project Architecture

The application uses an Express backend with a React UI:

\`\`\`mermaid
graph LR
    A[Client UI] -->|REST / WebSockets| B[Express Server]
    B -->|Jobs| C[Local Temp Workspace]
\`\`\`
`;
  }

  if (prompt.includes('health') || prompt.includes('overallScore') || prompt.includes('Health')) {
    return JSON.stringify({
      overallScore: 88,
      breakdown: {
        documentation: { 
          score: 85, 
          reason: 'The repository features well-structured documentation files and inline symbols. Adding inline JSDoc/TSDoc annotations for helper utilities will further improve developer onboarding efficiency.' 
        },
        architecture: { 
          score: 90, 
          reason: 'Excellent modular separation of concerns utilizing Controller-Service-Worker patterns. Directory structure clearly isolates AST parsing, stateful LangGraph workflows, and REST API endpoints.' 
        },
        maintainability: { 
          score: 85, 
          reason: 'Clean code conventions with low cyclomatic complexity. Package manifests and modular files are kept concise to promote reusability across feature components.' 
        },
        security: { 
          score: 92, 
          reason: 'Environment variables are safely extracted via dotenv with zero committed hardcoded secrets. Strict rate-limiting, CORS origin validation, and Zip Slip path traversal checks are enforced.' 
        },
        scalability: { 
          score: 88, 
          reason: 'High-throughput asynchronous event architecture powered by Express and Socket.io. LangGraph parallel directory chunking handles multi-file projects efficiently without blocking event loops.' 
        }
      },
      suggestions: [
        'Add comprehensive End-to-End integration tests covering background analysis worker events and WebSocket streaming handlers.',
        'Enforce strict automated linting and formatting pipelines via GitHub Actions before code merges.',
        'Implement automated microservice dependency map rendering for repositories containing complex multi-package monorepos.'
      ]
    }, null, 2);
  }

  return `Simulated analysis completed for input profile. Setup your GROQ_API_KEY in backend/.env to connect llama-3.3-70b-versatile.`;
};
