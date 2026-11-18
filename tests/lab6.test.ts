import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { depositMonthApi } from '../src/api'
import { mediaUrl } from '../src/api/media'
import { authActions } from '../src/state/authSlice'
import { filterActions } from '../src/state/filtersSlice'
import { createDepositMonthDraft, deleteDepositMonth, getDepositMonthDraft, getDepositMonthFeed, getDepositMonths, setDepositMonthLike } from '../src/state/depositMonthsSlice'
import { makeStore, selectBusy } from '../src/state/store'
import type { DtoDepositMonthWithLikesResponse } from '../src/api/generated/Api'

const month: DtoDepositMonthWithLikesResponse = {
  id: 41, name: 'Январь', status: 'published', created_at: '2026-01-01T00:00:00Z',
  days_count: 31, month_number: 1, description: 'Расчётный месяц', image_url: null, video_url: null,
  is_creator: 1, is_liked: 0, likes_count: 0,
}
const user = { id: 7, email: 'test@example.com' }
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  config, data, status, statusText: String(status), headers: {},
})
function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown = { error: 'Ошибка сервиса' }): never {
  throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response(config, data, status))
}

beforeEach(() => {
  const values = new Map<string, string>([['access_token', 'saved-access'], ['refresh_token', 'saved-refresh']])
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('ЛР6: Redux и сгенерированный Axios-клиент', () => {
  it('содержит ровно семь сгенерированных методов услуг и не содержит users', () => {
    expect(Object.keys(depositMonthApi.depositMonths).sort()).toEqual([
      'getDepositMonths', 'getDepositMonthFeed', 'getDepositMonthDraft',
      'createDepositMonthDraft', 'publishDepositMonthDraft', 'deleteDepositMonth', 'setDepositMonthLike',
    ].sort())
    expect(depositMonthApi).not.toHaveProperty('users')
  })

  it('хранит состояние гостя и пользователя в Redux как числовые 0 и 1', () => {
    const store = makeStore()
    expect(store.getState().auth.isAuthenticated).toBe(0)
    store.dispatch(authActions.loggedIn(user))
    expect(store.getState().auth.isAuthenticated).toBe(1)
    store.dispatch(authActions.loggedOut(undefined))
    expect(store.getState().auth.isAuthenticated).toBe(0)
  })

  it('после F5 начинает с гостя и не прикладывает сохранённый JWT; фильтр попадает в query', async () => {
    const store = makeStore()
    let seen: InternalAxiosRequestConfig | undefined
    depositMonthApi.instance.defaults.adapter = async config => { seen = config; return response(config, []) }
    store.dispatch(filterActions.selectDays({ min: 28, max: 30 }))
    store.dispatch(filterActions.applyDays())
    await store.dispatch(getDepositMonths()).unwrap()
    expect(store.getState().auth.isAuthenticated).toBe(0)
    expect(localStorage.getItem('access_token')).toBe('saved-access')
    expect(seen?.headers.get('Authorization')).toBeUndefined()
    expect(seen?.params).toEqual({ min_days_count: 28, max_days_count: 30 })
    expect(seen?.baseURL).toBe('/api')
    expect(seen?.url).toBe('/deposit-months')
    expect(store.getState().depositMonths.list.source).toBe('api')
  })

  it('использует отфильтрованный mock только при сетевом сбое у гостя', async () => {
    depositMonthApi.instance.defaults.adapter = async config => { throw new AxiosError('offline', 'ERR_NETWORK', config) }
    const store = makeStore()
    store.dispatch(filterActions.selectDays({ min: 28, max: 30 })); store.dispatch(filterActions.applyDays())
    await store.dispatch(getDepositMonths()).unwrap()
    const { items, source } = store.getState().depositMonths.list
    expect(source).toBe('mock')
    expect(items.map(item => item.name)).toEqual(['Февраль', 'Апрель', 'Июнь'])
    expect(items.every(item => item.is_creator === 0 && item.is_liked === 0)).toBe(true)
    store.dispatch(authActions.loggedIn(user))
    await store.dispatch(getDepositMonths())
    expect(store.getState().depositMonths.list.status).toBe('failed')
    expect(store.getState().depositMonths.list.items).toEqual([])
    expect(store.getState().depositMonths.list.source).toBeNull()
  })

  it.each([400, 401, 403, 404, 500])('не подменяет HTTP %s с сообщением сервера mock-успехом', async status => {
    depositMonthApi.instance.defaults.adapter = async config => httpError(config, status)
    const store = makeStore()
    await store.dispatch(getDepositMonths())
    expect(store.getState().depositMonths.list.source).toBeNull()
    expect(store.getState().depositMonths.list.items).toEqual([])
  })

  it('при выключенном target Vite (500 без тела) показывает mock, но не выдаёт его за API', async () => {
    depositMonthApi.instance.defaults.adapter = async config => httpError(config, 500, '')
    const store = makeStore()
    await store.dispatch(getDepositMonths()).unwrap()
    expect(store.getState().depositMonths.list.source).toBe('mock')
  })

  it('лента mock открывает выбранную карточку и оборачивается после последней', async () => {
    depositMonthApi.instance.defaults.adapter = async config => { throw new AxiosError('offline', 'ERR_NETWORK', config) }
    const store = makeStore()
    await store.dispatch(getDepositMonthFeed({ id: 2 })).unwrap()
    expect(store.getState().depositMonths.feed.item?.name).toBe('Февраль')
    await store.dispatch(getDepositMonthFeed({ id: 8, next: true })).unwrap()
    expect(store.getState().depositMonths.feed.item?.name).toBe('Январь')
    await store.dispatch(getDepositMonthFeed({ id: 999 }))
    expect(store.getState().depositMonths.feed.status).toBe('failed')
  })

  it('считает 404 черновика нормальной пустой формой, а 503 — ошибкой', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    depositMonthApi.instance.defaults.adapter = async config => httpError(config, 404)
    await store.dispatch(getDepositMonthDraft()).unwrap()
    expect(store.getState().depositMonths.draft).toMatchObject({ status: 'succeeded', value: null, error: null })
    depositMonthApi.instance.defaults.adapter = async config => httpError(config, 503)
    await store.dispatch(getDepositMonthDraft())
    expect(store.getState().depositMonths.draft.status).toBe('failed')
  })

  it('отправляет файлы как multipart и сохраняет в Redux только ответ черновика', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    let sent: FormData | undefined
    depositMonthApi.instance.defaults.adapter = async config => { sent = config.data; return response(config, { ...month, status: 'draft' }, 201) }
    await store.dispatch(createDepositMonthDraft({ name: 'Январь', image: new File(['jpg'], 'month.jpg'), video: new File(['mp4'], 'month.mp4') })).unwrap()
    expect(sent).toBeInstanceOf(FormData)
    expect(sent?.get('name')).toBe('Январь')
    expect((sent?.get('image') as File).name).toBe('month.jpg')
    expect((sent?.get('video') as File).name).toBe('month.mp4')
    expect(store.getState().depositMonths.draft.value?.id).toBe(month.id)
  })

  it('согласует likeCount/liked с полями плитки и ленты, затем удаляет карточку', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    depositMonthApi.instance.defaults.adapter = async config => {
      expect(config.headers.get('Authorization')).toBe('Bearer saved-access')
      if (config.method === 'delete') return response(config, { id: month.id, status: 'deleted' })
      if (config.url?.endsWith('/like')) return response(config, { id: month.id, liked: 1, likeCount: 3 })
      return response(config, config.url?.endsWith('/feed') ? month : [month])
    }
    await store.dispatch(getDepositMonths()).unwrap(); await store.dispatch(getDepositMonthFeed({ id: month.id })).unwrap()
    await store.dispatch(setDepositMonthLike({ id: month.id, liked: 1 })).unwrap()
    expect(store.getState().depositMonths.list.items[0]).toMatchObject({ is_liked: 1, likes_count: 3 })
    expect(store.getState().depositMonths.feed.item).toMatchObject({ is_liked: 1, likes_count: 3 })
    await store.dispatch(deleteDepositMonth(month.id)).unwrap()
    expect(store.getState().depositMonths.list.items).toEqual([])
    expect(store.getState().depositMonths.feed.item).toBeNull()
  })

  it('выход сбрасывает оба состояния фильтра и не принимает запоздалые персональные ответы', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    store.dispatch(filterActions.selectDays({ min: 30, max: 30 })); store.dispatch(filterActions.applyDays())
    let finish!: () => void
    depositMonthApi.instance.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, [month])) })
    const request = store.dispatch(getDepositMonths())
    expect(selectBusy(store.getState())).toBe(true)
    store.dispatch(authActions.loggedOut(undefined))
    finish(); await request
    expect(store.getState().filters).toEqual({ selected: { min: 28, max: 31 }, applied: { min: 28, max: 31 } })
    expect(store.getState().depositMonths.list.items).toEqual([])
    expect(store.getState().auth.user).toBeNull()
    expect(selectBusy(store.getState())).toBe(false)
  })

  it('401 отзывает интерфейс пользователя, очищает JWT и снимает блокировку кнопок', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    depositMonthApi.instance.defaults.adapter = async config => httpError(config, 401)
    await store.dispatch(setDepositMonthLike({ id: month.id, liked: 1 }))
    expect(store.getState().auth.isAuthenticated).toBe(0)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(selectBusy(store.getState())).toBe(false)
  })

  it('не начинает загрузку файлов с истёкшим JWT и предлагает войти снова', async () => {
    const store = makeStore(); store.dispatch(authActions.loggedIn(user))
    localStorage.setItem('access_token', `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`)
    const send = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, month))
    depositMonthApi.instance.defaults.adapter = send
    await store.dispatch(createDepositMonthDraft({ name: 'Январь', image: new File(['jpg'], 'month.jpg'), video: new File(['mp4'], 'month.mp4') }))
    expect(send).not.toHaveBeenCalled()
    expect(store.getState().auth.isAuthenticated).toBe(0)
    expect(store.getState().auth.error).toContain('Сессия истекла')
    expect(selectBusy(store.getState())).toBe(false)
  })

  it('проксирует bucket и имя S3-объекта без потери кодировки, не меняет локальные заглушки', () => {
    expect(mediaUrl('http://localhost:9000/deposit-month-assets/january.jpg')).toBe('/s3/deposit-month-assets/january.jpg')
    expect(mediaUrl('http://127.0.0.1:9000/bucket/hello%20world.mp4?versionId=1')).toBe('/s3/bucket/hello%20world.mp4?versionId=1')
    expect(mediaUrl('/media/default.jpg')).toBe('/media/default.jpg')
    expect(mediaUrl(null)).toBeUndefined()
  })
})
