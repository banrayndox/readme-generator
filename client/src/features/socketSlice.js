import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connected: false,
  logs: []
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.connected = action.payload;
    },
    addLog: (state, action) => {
      state.logs.push(action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
    }
  }
});

export const { setConnected, addLog, clearLogs } = socketSlice.actions;

export default socketSlice.reducer;
