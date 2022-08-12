import { createSlice } from '@reduxjs/toolkit'

const initialState = window.eContext

export const pageDataSlice = createSlice({
  name: 'pageData',
  initialState,
  reducers: {
    hotUpdate: (state, action) => {
      // Replace the pageData with new response from the server
      // This action will be triggered everytime the server is reloaded
      // This is only for development
      return action.payload.eContext;
    }
  },
})

export const { hotUpdate } = pageDataSlice.actions

export default pageDataSlice.reducer