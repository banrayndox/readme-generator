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
  updateReadmeStream, 
  setError 
} from '../features/analysisSlice.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useSocket = () => {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const { jobId } = useSelector((state) => state.upload);

  useEffect(() => {
    // 1. Initialize Socket Connection
    const socket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch(setConnected(true));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: 'Socket connection established with backend.'
      }));

      // Join job room if jobId is active
      if (jobId) {
        socket.emit('join-job', { jobId });
      }
    });

    socket.on('joined', (data) => {
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: `Registered room channel: ${data.jobId}`
      }));
    });

    socket.on('disconnect', () => {
      dispatch(setConnected(false));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Socket',
        message: 'Socket connection closed.'
      }));
    });

    // 2. Register job scanners listeners
    socket.on('upload:progress', (data) => handleProgressEvent(data, 'Ingestion'));
    socket.on('repository:scan', (data) => handleProgressEvent(data, 'Scanner'));
    socket.on('parser:progress', (data) => handleProgressEvent(data, 'Parser'));
    socket.on('chunk:progress', (data) => handleProgressEvent(data, 'Chunk'));

    // Streaming token from Groq stage
    socket.on('groq:stream', (data) => {
      // Stream raw character to markdown preview
      dispatch(updateReadmeStream(data.log));
    });

    // Analysis successfully finished
    socket.on('analysis:done', (data) => {
      dispatch(setResult(data.result));
      dispatch(setLoading(false));
      dispatch(setProgress(100));
      dispatch(setStatus('completed'));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Finished',
        message: 'Repository intelligence report compilation success.'
      }));
    });

    // Error event
    socket.on('error', (data) => {
      dispatch(setError(data.error));
      dispatch(setLoading(false));
      dispatch(addLog({
        timestamp: new Date().toISOString(),
        stage: 'Error',
        message: `Pipeline halted: ${data.error}`
      }));
    });

    const handleProgressEvent = (data, stage) => {
      dispatch(addLog({
        timestamp: data.timestamp || new Date().toISOString(),
        stage,
        message: data.log
      }));
      dispatch(setProgress(data.progress));
      dispatch(setStatus(data.stage.toLowerCase()));
    };

    // Clean up connections on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
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
        // status polling fallback error handler
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, dispatch]);

  return socketRef.current;
};
