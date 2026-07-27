import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { 
  FaGithub, 
  FaFolderOpen, 
  FaTerminal, 
  FaFileAlt, 
  FaSitemap, 
  FaNetworkWired, 
  FaShieldAlt, 
  FaCopy, 
  FaDownload, 
  FaCode, 
  FaRedoAlt 
} from 'react-icons/fa';
import { useSocket } from './hooks/useSocket.js';
import { 
  setFile, 
  setGithubUrl, 
  setLoading, 
  setJobId, 
  setError as setUploadError,
  resetUpload 
} from './features/uploadSlice.js';
import { 
  setStatus, 
  setProgress, 
  setResult, 
  setError as setAnalysisError, 
  resetAnalysis,
  updateReadmeStream
} from './features/analysisSlice.js';
import { clearLogs, addLog } from './features/socketSlice.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  // Connect Socket Client hook
  useSocket();

  const dispatch = useDispatch();
  const uploadState = useSelector((state) => state.upload);
  const analysisState = useSelector((state) => state.analysis);
  const socketState = useSelector((state) => state.socket);

  const [activeTab, setActiveTab] = useState('readme'); // 'readme' | 'architecture' | 'tree'
  const [uploadMode, setUploadMode] = useState('github'); // 'github' | 'zip'
  const [localUrl, setLocalUrl] = useState('');

  const terminalEndRef = useRef(null);

  // Auto-scroll terminal console
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [socketState.logs]);

  // Dropzone config for ZIP uploads
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      dispatch(setFile(acceptedFiles[0]));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'File',
        message: `Selected ZIP file: ${acceptedFiles[0].name} (${(acceptedFiles[0].size / (1024 * 1024)).toFixed(2)} MB)`
      }));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    multiple: false
  });

  // Handle GitHub Input Trigger
  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    if (!localUrl) return;

    dispatch(resetAnalysis());
    dispatch(clearLogs());
    dispatch(setGithubUrl(localUrl));
    dispatch(setLoading(true));

    try {
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Request',
        message: `Initiating GitHub analysis for: ${localUrl}`
      }));

      const res = await axios.post(`${BACKEND_URL}/api/github`, { url: localUrl });
      
      if (res.data.success) {
        const { jobId } = res.data.data;
        dispatch(setJobId(jobId));
        dispatch(addLog({
          timestamp: new Date().toISOString(),
          stage: 'Request',
          message: `Job queued successfully. Registered ID: ${jobId}`
        }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.details || err.message;
      dispatch(setUploadError(errMsg));
      dispatch(setAnalysisError(errMsg));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Error',
        message: `Request failed: ${errMsg}`
      }));
    }
  };

  // Handle Local ZIP upload submit
  const handleZipSubmit = async () => {
    if (!uploadState.file) return;

    dispatch(resetAnalysis());
    dispatch(clearLogs());
    dispatch(setLoading(true));

    const formData = new FormData();
    formData.append('file', uploadState.file);

    try {
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Request',
        message: `Uploading ZIP archive: ${uploadState.file.name}...`
      }));

      const res = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const { jobId } = res.data.data;
        dispatch(setJobId(jobId));
        dispatch(addLog({
          timestamp: new Date().toISOString(),
          stage: 'Request',
          message: `ZIP upload complete. Enqueued Job: ${jobId}`
        }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.details || err.message;
      dispatch(setUploadError(errMsg));
      dispatch(setAnalysisError(errMsg));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Error',
        message: `Upload failed: ${errMsg}`
      }));
    }
  };

  // Copy active tab content to clipboard
  const handleCopyContent = () => {
    let textToCopy = '';
    let label = '';

    if (activeTab === 'readme' && analysisState.result?.readme) {
      textToCopy = analysisState.result.readme;
      label = 'README.md';
    } else if (activeTab === 'architecture' && analysisState.result?.architecture) {
      textToCopy = analysisState.result.architecture;
      label = 'Architecture spec';
    } else if (activeTab === 'tree' && analysisState.result?.folderStructure) {
      textToCopy = analysisState.result.folderStructure;
      label = 'File tree';
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      alert(`${label} copied to clipboard!`);
    }
  };

  // Download active tab content as file
  const handleDownloadContent = () => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain;charset=utf-8';

    if (activeTab === 'readme' && analysisState.result?.readme) {
      content = analysisState.result.readme;
      filename = 'README.md';
      mimeType = 'text/markdown;charset=utf-8';
    } else if (activeTab === 'architecture' && analysisState.result?.architecture) {
      content = analysisState.result.architecture;
      filename = 'Architecture.md';
      mimeType = 'text/markdown;charset=utf-8';
    } else if (activeTab === 'tree' && analysisState.result?.folderStructure) {
      content = analysisState.result.folderStructure;
      filename = 'FileTree.txt';
      mimeType = 'text/plain;charset=utf-8';
    }

    if (content && filename) {
      const element = document.createElement('a');
      const file = new Blob([content], { type: mimeType });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Reset Application to Initial state
  const handleResetAll = () => {
    dispatch(resetUpload());
    dispatch(resetAnalysis());
    dispatch(clearLogs());
    setLocalUrl('');
  };

  return (
    <div className="h-screen max-h-screen bg-base-200 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER BANNER */}
      <header className="h-16 shrink-0 border-b border-slate-800 bg-base-100 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
            CR
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              CodeReady AI
              <span className="badge badge-primary badge-sm font-semibold">Repo Intel</span>
            </h1>
            <p className="text-xs text-slate-400">Enterprise Repository Architect & Intelligence Engine</p>
          </div>
        </div>

        {/* Pipeline indicators */}
        <div className="flex items-center gap-4">
          {socketState.connected ? (
            <span className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-glow-indicator"></span>
              Live Pipeline Connected
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Server Offline
            </span>
          )}

          {analysisState.status !== 'idle' && (
            <button className="btn btn-sm btn-outline btn-error gap-2" onClick={handleResetAll}>
              <FaRedoAlt /> Reset
            </button>
          )}
        </div>
      </header>

      {/* DASHBOARD COLUMN WRAPPER */}
      <main className="flex-1 h-[calc(100vh-4rem)] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: UPLOAD PANEL & TERMINAL (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          
          {/* UPLOAD PANEL CARD */}
          <div className="shrink-0 card bg-base-100 border border-slate-800 shadow-xl overflow-hidden">
            <div className="card-body p-5">
              <h2 className="card-title text-sm font-bold tracking-wider text-slate-300 uppercase mb-2">
                Repository Ingestion
              </h2>

              {/* Mode switch tabs */}
              <div className="join w-full grid grid-cols-2 bg-slate-900/60 p-1 rounded-lg border border-slate-800 mb-4">
                <button 
                  className={`btn btn-sm join-item border-none text-xs ${uploadMode === 'github' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
                  onClick={() => setUploadMode('github')}
                  disabled={uploadState.loading}
                >
                  <FaGithub className="text-sm mr-2" /> GitHub URL
                </button>
                <button 
                  className={`btn btn-sm join-item border-none text-xs ${uploadMode === 'zip' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
                  onClick={() => setUploadMode('zip')}
                  disabled={uploadState.loading}
                >
                  <FaFolderOpen className="text-sm mr-2" /> Upload ZIP
                </button>
              </div>

              {/* GitHub Input Mode */}
              {uploadMode === 'github' && (
                <form onSubmit={handleGithubSubmit} className="flex flex-col gap-3">
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs text-slate-400">Target Git URL</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://github.com/user/repo" 
                      className="input input-bordered input-sm bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500 w-full"
                      value={localUrl}
                      onChange={(e) => setLocalUrl(e.target.value)}
                      disabled={uploadState.loading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className={`btn btn-sm btn-primary w-full ${uploadState.loading ? 'loading' : ''}`}
                    disabled={!localUrl || uploadState.loading}
                  >
                    Scan Repository
                  </button>
                </form>
              )}

              {/* ZIP Archive Upload Mode */}
              {uploadMode === 'zip' && (
                <div className="flex flex-col gap-3">
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200 ${
                      isDragActive ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <FaFolderOpen className="text-3xl text-slate-500 mx-auto mb-2" />
                    {uploadState.file ? (
                      <p className="text-xs text-sky-400 font-semibold">{uploadState.file.name}</p>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-300">Drag & Drop ZIP file here</p>
                        <p className="text-[10px] text-slate-500 mt-1">Accepts only valid .zip archives</p>
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn btn-sm btn-primary w-full"
                    onClick={handleZipSubmit}
                    disabled={!uploadState.file || uploadState.loading}
                  >
                    Upload & Extract
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* REALTIME LOGS TERMINAL CARD */}
          <div className="flex-1 card bg-slate-950 border border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-[350px]">
            {/* Header console tab */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaTerminal className="text-sky-400 text-xs" />
                <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">Console Terminal logs</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              </div>
            </div>

            {/* Console Screen */}
            <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto terminal-scroll flex flex-col gap-1.5 text-emerald-400 leading-relaxed bg-black/85">
              {socketState.logs.length === 0 ? (
                <div className="text-slate-500 italic">Terminal idle. Feed a repository to witness live processing cycles...</div>
              ) : (
                socketState.logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-1">
                    <span className="text-slate-600 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-sky-500 font-bold select-none">[{log.stage}]</span>
                    <span className="break-all whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Bottom Progress Bar */}
            {analysisState.status !== 'idle' && (
              <div className="bg-slate-900 border-t border-slate-800 p-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                  <span className="capitalize">Stage: {analysisState.status}</span>
                  <span>{analysisState.progress}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full h-1.5" 
                  value={analysisState.progress} 
                  max="100"
                ></progress>
              </div>
            )}
          </div>
        </section>

        {/* CENTER COLUMN: PREVIEW PANEL (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
          
          <div className="flex-1 card bg-base-100 border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full min-h-0">
            
            {/* View Selection Tabs */}
            <div className="bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
              <div className="tabs tabs-boxed bg-transparent p-1 gap-1 border-none">
                <button 
                  className={`tab tab-sm gap-2 text-xs font-semibold ${activeTab === 'readme' ? 'tab-active bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab('readme')}
                >
                  <FaFileAlt className="text-xs" /> README.md
                </button>
                <button 
                  className={`tab tab-sm gap-2 text-xs font-semibold ${activeTab === 'architecture' ? 'tab-active bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab('architecture')}
                  disabled={!analysisState.result}
                >
                  <FaNetworkWired className="text-xs" /> Architecture
                </button>
                <button 
                  className={`tab tab-sm gap-2 text-xs font-semibold ${activeTab === 'tree' ? 'tab-active bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab('tree')}
                  disabled={!analysisState.result}
                >
                  <FaSitemap className="text-xs" /> File Tree
                </button>
              </div>

              {/* Status Loader */}
              {uploadState.loading && analysisState.status !== 'completed' && (
                <span className="loading loading-spinner loading-xs text-sky-400"></span>
              )}
            </div>

            {/* Content Display viewport */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/20 h-full">
              
              {/* Tab: README Markdown */}
              {activeTab === 'readme' && (
                <div className="github-markdown-body">
                  {analysisState.result?.readme ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisState.result.readme}</ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-500 gap-2">
                      <FaFileAlt className="text-4xl opacity-20" />
                      <p className="text-xs">No README analysis compiled yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Architecture Mermaid Diagram & Spec */}
              {activeTab === 'architecture' && (
                <div className="github-markdown-body">
                  {analysisState.result?.architecture ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisState.result.architecture}</ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-500 gap-2">
                      <FaNetworkWired className="text-4xl opacity-20" />
                      <p className="text-xs">System Architecture is not built yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: ASCII Folder Tree Structure */}
              {activeTab === 'tree' && (
                <div className="h-full">
                  {analysisState.result?.folderStructure ? (
                    <pre className="font-mono text-xs text-sky-300 bg-slate-950 border border-slate-900 p-4 rounded-xl overflow-x-auto leading-relaxed shadow-inner">
                      {analysisState.result.folderStructure}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-slate-500 gap-2">
                      <FaSitemap className="text-4xl opacity-20" />
                      <p className="text-xs">No folder tree generated.</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Actions footer - Copy & Download active tab content */}
            {analysisState.status === 'completed' && analysisState.result && !uploadState.loading && (
              <div className="bg-slate-900/60 border-t border-slate-800 p-4 flex items-center justify-end gap-3 shrink-0">
                <button className="btn btn-sm btn-outline btn-primary gap-2" onClick={handleCopyContent}>
                  <FaCopy /> 
                  {activeTab === 'readme' && 'Copy Raw README'}
                  {activeTab === 'architecture' && 'Copy Architecture Spec'}
                  {activeTab === 'tree' && 'Copy File Tree'}
                </button>
                <button className="btn btn-sm btn-primary gap-2" onClick={handleDownloadContent}>
                  <FaDownload /> 
                  {activeTab === 'readme' && 'Download Raw README'}
                  {activeTab === 'architecture' && 'Download Architecture.md'}
                  {activeTab === 'tree' && 'Download FileTree.txt'}
                </button>
              </div>
            )}

          </div>
        </section>

        {/* RIGHT COLUMN: METRICS & SUGGESTIONS (3 cols) */}
        <section className="lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
          
          {/* PROJECT PROFILE CARD */}
          <div className="shrink-0 card bg-base-100 border border-slate-800 shadow-xl overflow-hidden">
            <div className="card-body p-5">
              <h2 className="card-title text-sm font-bold tracking-wider text-slate-300 uppercase mb-2">
                Project Profile
              </h2>

              {analysisState.result ? (
                <div className="flex flex-col gap-3 font-sans">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Project Name</label>
                    <span className="text-sm font-bold text-white break-all">
                      {analysisState.result.projectName && analysisState.result.projectName !== 'Repository'
                        ? analysisState.result.projectName
                        : (uploadState.githubUrl ? uploadState.githubUrl.split('/').pop().replace('.git', '') : (uploadState.file?.name ? uploadState.file.name.replace('.zip', '') : 'Target Repository'))}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="badge badge-info badge-sm font-semibold py-2.5">
                      {analysisState.result.techStack?.framework || 'Vanilla'}
                    </span>
                    <span className="badge badge-secondary badge-sm font-semibold py-2.5">
                      {analysisState.result.techStack?.primaryLanguage || 'JavaScript'}
                    </span>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Dependencies</label>
                    <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1.5">
                      {Object.keys(analysisState.result.techStack?.dependencies || {}).length === 0 ? (
                        <span className="text-xs text-slate-500 italic">None found in manifest file.</span>
                      ) : (
                        Object.keys(analysisState.result.techStack.dependencies).map((dep, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded">
                            <span className="font-mono text-slate-300 truncate mr-2">{dep}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{analysisState.result.techStack.dependencies[dep]}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic text-center py-4">Waiting for analysis...</div>
              )}
            </div>
          </div>

          {/* HEALTH SCORE GAUGE */}
          <div className="card bg-base-100 border border-slate-800 shadow-xl overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="card-body p-5 flex flex-col gap-4 overflow-y-auto h-full">
              <h2 className="card-title text-sm font-bold tracking-wider text-slate-300 uppercase">
                Health Dashboard
              </h2>

              {analysisState.result?.healthScore?.overallScore !== undefined ? (
                <div className="flex flex-col gap-5 flex-1 justify-between">
                  
                  {/* Gauge Graphic */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="radial-progress text-sky-400 font-extrabold text-lg bg-sky-950/20 border-4 border-slate-800 shadow" 
                      style={{ 
                        "--value": analysisState.result.healthScore.overallScore, 
                        "--size": "5.5rem", 
                        "--thickness": "6px" 
                      }} 
                      role="progressbar"
                    >
                      {analysisState.result.healthScore.overallScore}%
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Overall Rating</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Codebase quality vector</div>
                    </div>
                  </div>

                  {/* Breakdown Bars */}
                  <div className="flex flex-col gap-2.5 border-t border-slate-800 pt-4">
                    {Object.keys(analysisState.result.healthScore.breakdown || {}).map((key) => {
                      const item = analysisState.result.healthScore.breakdown[key];
                      return (
                        <div key={key} className="collapse collapse-arrow bg-slate-900 border border-slate-800/80 rounded-lg p-0">
                          <input type="checkbox" className="min-h-0 py-2.5 px-4" defaultChecked /> 
                          <div className="collapse-title min-h-0 py-2 px-4 flex items-center justify-between text-xs font-semibold text-slate-300">
                            <span className="capitalize">{key}</span>
                            <span className="text-sky-400 font-bold mr-6">{item.score}/100</span>
                          </div>
                          <div className="collapse-content px-4 pb-3">
                            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-2">{item.reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Improvement Checklist */}
                  <div className="border-t border-slate-800 pt-4">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2 font-bold">Key Recommendations</label>
                    <div className="flex flex-col gap-2.5 max-h-[180px] overflow-y-auto">
                      {analysisState.result.suggestions?.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-200 leading-relaxed">
                          <FaShieldAlt className="text-sky-400 text-xs mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-xs text-slate-500 italic text-center py-8 my-auto">Waiting for metrics analysis...</div>
              )}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}
