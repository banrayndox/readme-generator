import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle',
  progress: 0,
  result: null,
  error: null
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
      if (action.payload === 'idle') {
        state.progress = 0;
        state.result = null;
        state.error = null;
      }
    },
    setProgress: (state, action) => {
      state.progress = action.payload;
    },
    setResult: (state, action) => {
      state.result = action.payload;
      state.status = 'completed';
      state.progress = 100;
    },
    updateReadmeStream: (state, action) => {
      if (!state.result) {
        state.result = { readme: '' };
      }
      state.result.readme = (state.result.readme || '') + action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.status = 'failed';
    },
    resetAnalysis: (state) => {
      state.status = 'idle';
      state.progress = 0;
      state.result = null;
      state.error = null;
    }
  }
});

export const {
  setStatus,
  setProgress,
  setResult,
  updateReadmeStream,
  setError,
  resetAnalysis
} = analysisSlice.actions;

export default analysisSlice.reducer;
