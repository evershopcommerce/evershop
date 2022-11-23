import { configureStore } from '@reduxjs/toolkit';
import { pageDataSliceSSR } from './pageDataSliceSSR';

export const createStoreSSR = (initialState) => configureStore({
  reducer: {
    pageData: pageDataSliceSSR(initialState).reducer,
  },
})