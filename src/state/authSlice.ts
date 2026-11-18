import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type RequestStatus = 'idle' | 'pending' | 'succeeded' | 'failed'
export interface SessionUser { id: number; email: string }
export interface AuthState {
  isAuthenticated: 0 | 1
  user: SessionUser | null
  status: RequestStatus
  error: string | null
}

// F5 always starts as a guest. This slice never reads localStorage.
const initialState: AuthState = { isAuthenticated: 0, user: null, status: 'idle', error: null }
const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    authStarted(state) { state.status = 'pending'; state.error = null },
    authFailed(state, action: PayloadAction<string>) { state.status = 'failed'; state.error = action.payload },
    loggedIn(_state, action: PayloadAction<SessionUser>): AuthState {
      return { isAuthenticated: 1, user: action.payload, status: 'succeeded', error: null }
    },
    loggedOut(_state, action: PayloadAction<string | undefined>): AuthState {
      return { ...initialState, error: action.payload || null }
    },
    clearAuthError(state) { state.error = null },
  },
})
export const authActions = authSlice.actions
export default authSlice.reducer
