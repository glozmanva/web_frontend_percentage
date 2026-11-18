import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { depositMonthApi, errorMessage, serviceUnavailable } from '../api'
import { accessToken, clearTokens, expiredAccessToken, SessionExpiredError } from '../api/tokens'
import type { DtoDepositMonthResponse, DtoDepositMonthWithLikesResponse, DtoLikeResponse, DtoPublishDepositMonthRequest } from '../api/generated/Api'
import { mockDepositMonths } from '../data/deposit_months'
import { authActions, type RequestStatus } from './authSlice'
import type { RootState, AppDispatch } from './store'

export type DepositMonth = DtoDepositMonthWithLikesResponse
type Source = 'api' | 'mock'
interface LoadingState { status: RequestStatus; error: string | null; requestId?: string }
export interface DepositMonthsState {
  list: LoadingState & { items: DepositMonth[]; source: Source | null }
  feed: LoadingState & { item: DepositMonth | null; source: Source | null }
  draft: LoadingState & { value: DtoDepositMonthResponse | null }
  mutation: LoadingState
}
const loading: LoadingState = { status: 'idle', error: null }
const initialState: DepositMonthsState = {
  list: { ...loading, items: [], source: null },
  feed: { ...loading, item: null, source: null },
  draft: { ...loading, value: null }, mutation: { ...loading },
}
const mockMonths: DepositMonth[] = mockDepositMonths.map(month => ({
  ...month, status: 'published', created_at: '2026-01-01T00:00:00Z', is_creator: 0, is_liked: 0,
}))
interface ThunkConfig { state: RootState; dispatch: AppDispatch; rejectValue: string }

function requestParams(state: RootState, signal: AbortSignal) {
  // A stored token alone does NOT authorize the guest interface after F5.
  const token = state.auth.isAuthenticated === 1 ? accessToken() : null
  // Avoid sending a large multipart body with an already expired token.
  // The Go middleware still performs the authoritative signature/blacklist check.
  if (state.auth.isAuthenticated === 1 && (!token || expiredAccessToken(token))) throw new SessionExpiredError()
  return { signal, headers: token ? { Authorization: `Bearer ${token}` } : {} }
}
function requestFailed(error: unknown, dispatch: AppDispatch): string {
  if (error instanceof SessionExpiredError || axios.isAxiosError(error) && error.response?.status === 401) {
    clearTokens()
    dispatch(authActions.loggedOut('Сессия истекла. Войдите снова.'))
  }
  return errorMessage(error)
}

export const getDepositMonths = createAsyncThunk<{ items: DepositMonth[]; source: Source }, void, ThunkConfig>(
  'depositMonths/getDepositMonths', async (_, { getState, signal, rejectWithValue, dispatch }) => {
    const state = getState()
    const { min, max } = state.filters.applied
    try {
      const response = await depositMonthApi.depositMonths.getDepositMonths(
        { min_days_count: min, max_days_count: max }, requestParams(state, signal),
      )
      return { items: response.data, source: 'api' }
    } catch (error) {
      if (state.auth.isAuthenticated === 0 && serviceUnavailable(error)) {
        return { items: mockMonths.filter(month => month.days_count != null && month.days_count >= min && month.days_count <= max), source: 'mock' }
      }
      return rejectWithValue(requestFailed(error, dispatch))
    }
  },
)

export const getDepositMonthFeed = createAsyncThunk<{ item: DepositMonth; source: Source }, { id?: number; next?: boolean }, ThunkConfig>(
  'depositMonths/getDepositMonthFeed', async (query, { getState, signal, rejectWithValue, dispatch }) => {
    const state = getState()
    try {
      const response = await depositMonthApi.depositMonths.getDepositMonthFeed(query, requestParams(state, signal))
      return { item: response.data, source: 'api' }
    } catch (error) {
      if (state.auth.isAuthenticated === 0 && serviceUnavailable(error)) {
        const index = query.id === undefined ? 0 : mockMonths.findIndex(month => month.id === query.id)
        // Match the server: next finds the next published ID, including across gaps.
        const item = query.next && query.id !== undefined
          ? mockMonths.find(month => month.id > query.id!) || mockMonths[0]
          : mockMonths[index]
        if (item) return { item, source: 'mock' }
        return rejectWithValue('Месяц не найден в демонстрационной коллекции.')
      }
      return rejectWithValue(requestFailed(error, dispatch))
    }
  },
)

export const getDepositMonthDraft = createAsyncThunk<DtoDepositMonthResponse | null, void, ThunkConfig>(
  'depositMonths/getDepositMonthDraft', async (_, { getState, signal, rejectWithValue, dispatch }) => {
    try { return (await depositMonthApi.depositMonths.getDepositMonthDraft(requestParams(getState(), signal))).data }
    catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null
      return rejectWithValue(requestFailed(error, dispatch))
    }
  },
)

type CreateDraft = { name: string; image: File; video: File }
export const createDepositMonthDraft = createAsyncThunk<DtoDepositMonthResponse, CreateDraft, ThunkConfig>(
  'depositMonths/createDepositMonthDraft', async (form, { getState, signal, rejectWithValue, dispatch }) => {
    try {
      return (await depositMonthApi.depositMonths.createDepositMonthDraft(form, {
        ...requestParams(getState(), signal), timeout: 120000,
      })).data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) await dispatch(getDepositMonthDraft())
      return rejectWithValue(requestFailed(error, dispatch))
    }
  },
)

export const publishDepositMonthDraft = createAsyncThunk<DtoDepositMonthResponse, DtoPublishDepositMonthRequest, ThunkConfig>(
  'depositMonths/publishDepositMonthDraft', async (form, { getState, signal, rejectWithValue, dispatch }) => {
    try { return (await depositMonthApi.depositMonths.publishDepositMonthDraft(form, requestParams(getState(), signal))).data }
    catch (error) { return rejectWithValue(requestFailed(error, dispatch)) }
  },
)
export const deleteDepositMonth = createAsyncThunk<number, number, ThunkConfig>(
  'depositMonths/deleteDepositMonth', async (id, { getState, signal, rejectWithValue, dispatch }) => {
    try {
      await depositMonthApi.depositMonths.deleteDepositMonth(id, requestParams(getState(), signal))
      return id
    } catch (error) { return rejectWithValue(requestFailed(error, dispatch)) }
  },
)
export const setDepositMonthLike = createAsyncThunk<DtoLikeResponse, { id: number; liked: 0 | 1 }, ThunkConfig>(
  'depositMonths/setDepositMonthLike', async ({ id, liked }, { getState, signal, rejectWithValue, dispatch }) => {
    try { return (await depositMonthApi.depositMonths.setDepositMonthLike(id, { liked }, requestParams(getState(), signal))).data }
    catch (error) { return rejectWithValue(requestFailed(error, dispatch)) }
  },
)

const depositMonthsSlice = createSlice({
  name: 'depositMonths', initialState,
  reducers: { clearMutationError(state) { state.mutation.error = null } },
  extraReducers: builder => {
    builder
      .addCase(authActions.loggedIn, () => initialState)
      .addCase(authActions.loggedOut, () => initialState)
      .addCase(getDepositMonths.pending, (state, action) => {
        state.list.status = 'pending'; state.list.error = null; state.list.requestId = action.meta.requestId
      })
      .addCase(getDepositMonths.fulfilled, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        Object.assign(state.list, action.payload, { status: 'succeeded' })
      })
      .addCase(getDepositMonths.rejected, (state, action) => {
        if (state.list.requestId !== action.meta.requestId) return
        state.list.status = action.meta.aborted ? 'idle' : 'failed'; state.list.error = action.meta.aborted ? null : action.payload || 'Не удалось загрузить месяцы.'
      })
      .addCase(getDepositMonthFeed.pending, (state, action) => {
        state.feed.status = 'pending'; state.feed.error = null; state.feed.requestId = action.meta.requestId
      })
      .addCase(getDepositMonthFeed.fulfilled, (state, action) => {
        if (state.feed.requestId !== action.meta.requestId) return
        Object.assign(state.feed, action.payload, { status: 'succeeded' })
      })
      .addCase(getDepositMonthFeed.rejected, (state, action) => {
        if (state.feed.requestId !== action.meta.requestId) return
        state.feed.status = action.meta.aborted ? 'idle' : 'failed'; state.feed.error = action.meta.aborted ? null : action.payload || 'Не удалось загрузить ленту.'
      })
      .addCase(getDepositMonthDraft.pending, (state, action) => {
        state.draft.status = 'pending'; state.draft.error = null; state.draft.requestId = action.meta.requestId
      })
      .addCase(getDepositMonthDraft.fulfilled, (state, action) => {
        if (state.draft.requestId !== action.meta.requestId) return
        state.draft.value = action.payload; state.draft.status = 'succeeded'
      })
      .addCase(getDepositMonthDraft.rejected, (state, action) => {
        if (state.draft.requestId !== action.meta.requestId) return
        state.draft.status = action.meta.aborted ? 'idle' : 'failed'; state.draft.error = action.meta.aborted ? null : action.payload || 'Не удалось загрузить черновик.'
      })

    // All mutations share a visible loading/error state; stale replies after logout are ignored.
    const mutations = [createDepositMonthDraft, publishDepositMonthDraft, deleteDepositMonth, setDepositMonthLike] as const
    for (const thunk of mutations) {
      builder.addCase(thunk.pending, (state, action) => {
        state.mutation.status = 'pending'; state.mutation.error = null; state.mutation.requestId = action.meta.requestId
      })
    }
    builder
      .addCase(createDepositMonthDraft.fulfilled, (state, action) => {
        if (state.mutation.requestId !== action.meta.requestId) return
        state.draft.value = action.payload; state.draft.status = 'succeeded'; state.mutation.status = 'succeeded'
      })
      .addCase(publishDepositMonthDraft.fulfilled, (state, action) => {
        if (state.mutation.requestId !== action.meta.requestId) return
        state.draft.value = null; state.mutation.status = 'succeeded'
      })
      .addCase(deleteDepositMonth.fulfilled, (state, action) => {
        if (state.mutation.requestId !== action.meta.requestId) return
        state.list.items = state.list.items.filter(month => month.id !== action.payload)
        if (state.feed.item?.id === action.payload) state.feed.item = null
        if (state.draft.value?.id === action.payload) state.draft.value = null
        state.mutation.status = 'succeeded'
      })
      .addCase(setDepositMonthLike.fulfilled, (state, action) => {
        if (state.mutation.requestId !== action.meta.requestId) return
        const { id, liked, likeCount } = action.payload
        for (const month of [...state.list.items, state.feed.item]) {
          if (month?.id === id) { month.is_liked = liked; month.likes_count = likeCount }
        }
        state.mutation.status = 'succeeded'
      })
    for (const thunk of mutations) {
      builder.addCase(thunk.rejected, (state, action) => {
        if (state.mutation.requestId !== action.meta.requestId) return
        state.mutation.status = 'failed'; state.mutation.error = action.payload as string || 'Не удалось сохранить изменения.'
      })
    }
  },
})
export const { clearMutationError } = depositMonthsSlice.actions
export default depositMonthsSlice.reducer
