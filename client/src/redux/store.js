import { configureStore } from '@reduxjs/toolkit';
import uploadReducer from '../features/uploadSlice.js';
import socketReducer from '../features/socketSlice.js';
import analysisReducer from '../features/analysisSlice.js';

export const store = configureStore({
  reducer: {
    upload: uploadReducer,
    socket: socketReducer,
    analysis: analysisReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // Disable check to allow storing socket clients if necessary
    })
});
