import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice'
import filters from './filtersSlice'
import depositMonths from './depositMonthsSlice'

export const makeStore = () => configureStore({ reducer: { auth, filters, depositMonths } })
// configureStore includes thunk middleware and Redux DevTools support by default.
export const store = makeStore()
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const selectBusy = (state: RootState) => state.auth.status === 'pending' ||
  [state.depositMonths.list, state.depositMonths.feed, state.depositMonths.draft, state.depositMonths.mutation]
    .some(request => request.status === 'pending')
