import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { authActions } from './authSlice'

export interface DaysRange { min: number; max: number }
export interface FiltersState { selected: DaysRange; applied: DaysRange }
const allDays: DaysRange = { min: 28, max: 31 }
const initialState: FiltersState = { selected: { ...allDays }, applied: { ...allDays } }
const filtersSlice = createSlice({
  name: 'depositMonthFilters', initialState,
  reducers: {
    selectDays(state, action: PayloadAction<DaysRange>) { state.selected = action.payload },
    applyDays(state) { state.applied = { ...state.selected } },
  },
  extraReducers: builder => builder.addCase(authActions.loggedOut, () => initialState),
})
export const filterActions = filtersSlice.actions
export default filtersSlice.reducer
