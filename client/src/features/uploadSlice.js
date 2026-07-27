import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  file: null,
  githubUrl: '',
  loading: false,
  jobId: null,
  error: null
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    setFile: (state, action) => {
      state.file = action.payload;
      state.error = null;
    },
    setGithubUrl: (state, action) => {
      state.githubUrl = action.payload;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setJobId: (state, action) => {
      state.jobId = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    resetUpload: (state) => {
      state.file = null;
      state.githubUrl = '';
      state.loading = false;
      state.jobId = null;
      state.error = null;
    }
  }
});

export const {
  setFile,
  setGithubUrl,
  setLoading,
  setJobId,
  setError,
  resetUpload
} = uploadSlice.actions;

export default uploadSlice.reducer;
