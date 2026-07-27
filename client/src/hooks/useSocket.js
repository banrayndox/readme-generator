import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import axios from 'axios';
import { setConnected, addLog } from '../features/socketSlice.js';
import { setLoading } from '../features/uploadSlice.js';
import { 
  setStatus, 
  setProgress, 
  setResult, 
  setError 
} from '../features/analysisSlice.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Singleton survives React StrictMode remounts without tearing down mid-handshake
let sharedSocket = null;

const getSharedSocket = () => {
  if (!sharedSocket) {
    sharedSocket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
  }
  return sharedSocket;
};

export const useSocket = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const jobIdRef = useRef(null);
  const { jobId } = useSelector((state) => state.upload);

  jobIdRef.current = jobId;

  useEffect(() => {
    const socket = getSharedSocket();
    socketRef.current = socket;

    const onConnect = () => {
      dispatch(setConnected(true));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: 'Socket connection established with backend.'
      }));

      if (jobIdRef.current) {
        socket.emit('join-job', { jobId: jobIdRef.current });
      }
    };

    const onJoined = (data) => {
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: `Registered room channel: ${data.jobId}`
      }));
    };

    const onDisconnect = () => {
      dispatch(setConnected(false));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: 'Socket connection closed.'
      }));
    };

    const handleProgressEvent = (data, stage) => {
      dispatch(addLog({
        timestamp: data.timestamp || new Date().toISOString(),
        stage,
        message: data.log
      }));
      dispatch(setProgress(data.progress));
      dispatch(setStatus(data.stage.toLowerCase()));
    };

    const onUploadProgress = (data) => handleProgressEvent(data, 'Ingestion');
    const onRepositoryScan = (data) => handleProgressEvent(data, 'Scanner');
    const onParserProgress = (data) => handleProgressEvent(data, 'Parser');
    const onChunkProgress = (data) => handleProgressEvent(data, 'Chunk');

    const onAnalysisDone = (data) => {
      dispatch(setResult(data.result));
      dispatch(setLoading(false));
      dispatch(setProgress(100));
      dispatch(setStatus('completed'));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Finished',
        message: 'Repository intelligence report compilation success.'
      }));
    };

    const onError = (data) => {
      dispatch(setError(data.error));
      dispatch(setLoading(false));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Error',
        message: `Pipeline halted: ${data.error}`
      }));
    };

    socket.on('connect', onConnect);
    socket.on('joined', onJoined);
    socket.on('disconnect', onDisconnect);
    socket.on('upload:progress', onUploadProgress);
    socket.on('repository:scan', onRepositoryScan);
    socket.on('parser:progress', onParserProgress);
    socket.on('chunk:progress', onChunkProgress);
    socket.on('analysis:done', onAnalysisDone);
    socket.on('error', onError);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('joined', onJoined);
      socket.off('disconnect', onDisconnect);
      socket.off('upload:progress', onUploadProgress);
      socket.off('repository:scan', onRepositoryScan);
      socket.off('parser:progress', onParserProgress);
      socket.off('chunk:progress', onChunkProgress);
      socket.off('analysis:done', onAnalysisDone);
      socket.off('error', onError);
    };
  }, [dispatch]);

  // Handle joining & polling backup when a new jobId is active
  useEffect(() => {
    if (!jobId) return;

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-job', { jobId });
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/status/${jobId}`);
        if (res.data.success && res.data.data) {
          const { status, progress } = res.data.data;
          dispatch(setProgress(progress));
          dispatch(setStatus(status));

          if (status === 'completed') {
            clearInterval(pollInterval);
            dispatch(setLoading(false));
            const resultRes = await axios.get(`${BACKEND_URL}/api/result/${jobId}`);
            if (resultRes.data.success && resultRes.data.data) {
              dispatch(setResult(resultRes.data.data));
            }
          } else if (status === 'error' || status === 'failed') {
            clearInterval(pollInterval);
            dispatch(setLoading(false));
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          clearInterval(pollInterval);
          dispatch(setLoading(false));
          dispatch(setError('Job not found. The server may have restarted — please submit the repository again.'));
          dispatch(addLog({
            timestamp: new Date().toISOString(),
            stage: 'Error',
            message: 'Job lost — backend restarted or job expired. Please scan again.'
          }));
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, dispatch]);

  return socketRef.current;
};
