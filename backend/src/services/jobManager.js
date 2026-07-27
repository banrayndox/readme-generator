import { v4 as uuidv4 } from 'uuid';
import { emitJobEvent } from '../socket/index.js';

const jobs = new Map();

export const createJob = () => {
  const jobId = uuidv4();
  const job = {
    jobId,
    status: 'pending',
    progress: 0,
    logs: [],
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(jobId, job);
  addJobLog(jobId, 'Initial', 'Repository analysis job created.');
  return job;
};

export const getJob = (jobId) => {
  return jobs.get(jobId) || null;
};

export const addJobLog = (jobId, stage, message) => {
  const job = jobs.get(jobId);
  if (!job) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    stage,
    message
  };

  job.logs.push(logEntry);
  job.updatedAt = new Date().toISOString();

  let socketEvent = 'upload:progress';
  if (stage === 'Scan') socketEvent = 'repository:scan';
  else if (stage === 'Parser') socketEvent = 'parser:progress';
  else if (stage === 'Chunk') socketEvent = 'chunk:progress';
  else if (stage === 'AI' || stage === 'Groq') socketEvent = 'groq:stream';
  else if (stage === 'Error') socketEvent = 'error';

  emitJobEvent(jobId, socketEvent, {
    jobId,
    stage,
    log: stage === 'Groq' ? message : `[${stage}] ${message}`,
    progress: job.progress
  });
};

export const updateJobProgress = (jobId, progress, status, logMessage = '') => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = Math.min(100, Math.max(0, progress));
  job.status = status;
  job.updatedAt = new Date().toISOString();

  if (logMessage) {
    addJobLog(jobId, status.toUpperCase(), logMessage);
  }
};

export const completeJob = (jobId, result) => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'completed';
  job.progress = 100;
  job.result = result;
  job.updatedAt = new Date().toISOString();

  addJobLog(jobId, 'Finished', 'Repository scanning and analysis finished successfully.');
  
  emitJobEvent(jobId, 'analysis:done', {
    jobId,
    status: 'completed',
    result
  });
};

export const failJob = (jobId, errorMessage) => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'failed';
  job.error = errorMessage;
  job.updatedAt = new Date().toISOString();

  addJobLog(jobId, 'Error', errorMessage);

  emitJobEvent(jobId, 'error', {
    jobId,
    status: 'failed',
    error: errorMessage
  });
};
