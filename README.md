# CodeReady AI - Repository Intelligence Platform ( I used antigravity to build this  for 3rd ITM Summit).

CodeReady AI is an enterprise-quality AI application designed to ingest local code archives (ZIP) or clone remote git repositories, parse their Abstract Syntax Trees (AST), map architectural layers, compute quality scores, and automatically compile high-quality documentation.

---

## 🏗️ System Architecture & Execution Path

The application divides ingestion, parsing, chunking, and AI pipeline orchestration into isolated layers:

1. **Ingestion**: The client submits a local ZIP or remote GitHub URL. The Express server registers a background job and starts execution asynchronously in a background worker thread.
2. **Scanner Filtering**: Recursive crawl skips node modules, build targets, lock files, and images based on `.gitignore` definitions.
3. **AST Symbol Extractor**: Opens parseable code files and scans them via custom regex-based parser layers to identify imports, class hierarchies, public methods, and REST controller routes.
4. **LangGraph Pipeline**:
   - Compiles external dependencies list.
   - Chunks files metadata by folder layers to control prompt context limits.
   - Triggers pseudo-parallel Groq summaries (`llama-3.3-70b-versatile`) for each codebase directory.
   - Synthesizes folder summaries into a unified architectural spec detailing component relations and builds a **Mermaid sequence diagram**.
   - Streams the final formatted **README.md** back to the client.
   - Calculates a multi-dimensional **Health Score** and improvement checklist.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Groq API Key (Retrieve one at [console.groq.com](https://console.groq.com/))

### 1. Environment Configurations
Create `.env` file inside `backend/` and configure:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key_here
MAX_UPLOAD_SIZE=52428800
```

### 2. Start the Backend Server
Open a terminal in the `backend/` folder and run:
```bash
# Start development hot-reload server
npm run dev
```
The server will start listening on port `5000` and stream logs dynamically.

### 3. Start the Client Dashboard
Open a secondary terminal in the `client/` folder and run:
```bash
# Start Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to access the CodeReady dashboard.

---

## 🛠️ Tech Stack & Key Libraries

### Backend
- **Express.js & Node.js**: Main API Server
- **Socket.io**: Real-time log streams & streaming LLM tokens
- **LangChain & LangGraph JS**: Directed graph code analysis state machine
- **Groq SDK**: llama-3.3-70b integration
- **Adm-Zip & Simple-Git**: Archive extraction and remote cloning
- **Ignore**: `.gitignore` parsing matcher

### Client
- **Vite & React 19**: Frontend UI build
- **Redux Toolkit**: Centralized state management
- **Tailwind CSS & DaisyUI**: Sleek night mode dashboards and glass panel design
- **React Markdown**: Secure markdown documentation renderer
- **React Dropzone**: Drag and drop zip uploader
