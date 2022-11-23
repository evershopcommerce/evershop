import { configureStore } from '@reduxjs/toolkit';
import pageDataReducer from './pageDataSlice';

export const store = configureStore({
  reducer: {
    pageData: pageDataReducer,
  },
})