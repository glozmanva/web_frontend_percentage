import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Form, Nav } from 'react-bootstrap'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import axios from 'axios'
import { authHttp, errorMessage } from './api'
import { accessToken, clearTokens, saveTokens, type TokenPair } from './api/tokens'
import { mediaUrl } from './api/media'
import type { DtoDepositMonthResponse } from './api/generated/Api'
import { authActions } from './state/authSlice'
import { filterActions } from './state/filtersSlice'
import { clearMutationError, createDepositMonthDraft, deleteDepositMonth, getDepositMonthDraft, getDepositMonthFeed, getDepositMonths, publishDepositMonthDraft, setDepositMonthLike, type DepositMonth } from './state/depositMonthsSlice'
import { useAppDispatch, useAppSelector } from './state/hooks'
import { selectBusy } from './state/store'

function fallback(element: HTMLImageElement | HTMLVideoElement, path: string) {
  if (element.getAttribute('src') !== path) element.src = path
}
function dayLabel(count: number | null | undefined) { return count === 31 ? 'день' : 'дней' }

function Description({ text }: { text?: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [long, setLong] = useState(false)
  useEffect(() => {
    const element = ref.current!
    const observer = new ResizeObserver(() => {
      const line = parseFloat(getComputedStyle(element).lineHeight)
      setLong(element.scrollHeight > line * 2 + 2)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [text])
  return <div className="feed-description">
    <div ref={ref} className={'feed-description-text' + (expanded ? ' expanded' : '')}>{text}</div>
    {long && <button className="feed-description-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Свернуть' : 'Ещё'}</button>}
  </div>
}

function ErrorNotice({ message, retry }: { message: string | null; retry?: () => void }) {
  if (!message) return null
  return <div className="notice error-notice" role="alert"><p>{message}</p>{retry && <button type="button" className="text-button" onClick={retry}>Повторить</button>}</div>
}
function MockNotice() { return <p className="notice mock-notice" role="status">Сервис недоступен. Показаны демонстрационные месяцы.</p> }

function LegacyFeedRedirect() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return <Navigate replace to={id ? '/deposit_month?deposit_month_id=' + encodeURIComponent(id) : '/deposit_month'} />
}
function LegacyDetailsRedirect() {
  const { id } = useParams()
  return <Navigate replace to={'/deposit_month?deposit_month_id=' + encodeURIComponent(id || '')} />
}

function Feed() {
  const dispatch = useAppDispatch()
  const [params, setParams] = useSearchParams()
  const rawId = params.get('deposit_month_id')
  const id = rawId === null ? undefined : Number(rawId)
  const valid = id === undefined || Number.isInteger(id) && id > 0
  const feed = useAppSelector(state => state.depositMonths.feed)
  const authenticated = useAppSelector(state => state.auth.isAuthenticated === 1)
  const busy = useAppSelector(selectBusy)
  useEffect(() => {
    if (!valid) return
    // The next-item request has already loaded this ID before updating the URL.
    if (id !== undefined && feed.item?.id === id && feed.status === 'succeeded') return
    const request = dispatch(getDepositMonthFeed({ id }))
    return () => request.abort()
  }, [dispatch, rawId, authenticated])

  const month = feed.item
  const retry = () => { void dispatch(getDepositMonthFeed({ id })) }
  if (!valid || feed.error || !month) return <main className="list-content">
    <h1 className="page-title">Лента</h1>
    <ErrorNotice message={!valid ? 'Некорректный ID месяца.' : feed.error} retry={valid ? retry : undefined} />
    {!month && !feed.error && valid && feed.status !== 'pending' && <p>В ленте пока нет месяцев.</p>}
  </main>

  const next = async () => {
    try {
      const result = await dispatch(getDepositMonthFeed({ id: month.id, next: true })).unwrap()
      setParams({ deposit_month_id: String(result.item.id) }, { replace: true })
    } catch { /* Error is displayed from Redux. */ }
  }
  return <main className="feed">
    <video key={month.id} className="feed-video" autoPlay muted loop playsInline preload="metadata"
      src={mediaUrl(month.video_url) || '/media/default.mp4'} onError={event => fallback(event.currentTarget, '/media/default.mp4')} />
    <div className="feed-overlay" />
    {feed.source === 'mock' && <div className="feed-notice"><MockNotice /></div>}
    <section className="feed-info"><h1 className="feed-month-title">{month.name}</h1><Description key={month.id} text={month.description} /></section>
    <aside className="feed-side">
      <div className="feed-stat"><span className="feed-stat-value">{month.month_number ?? '—'}</span><span className="feed-stat-label">месяц</span></div>
      <div className="feed-stat"><span className="feed-stat-value">{month.days_count ?? '—'}</span><span className="feed-stat-label">{dayLabel(month.days_count)}</span></div>
      <button type="button" className={'feed-like-content like-button' + (month.is_liked === 1 ? ' liked' : '')}
        disabled={!authenticated || busy} aria-label={month.is_liked === 1 ? 'Снять лайк' : 'Поставить лайк'} aria-pressed={month.is_liked === 1}
        title={authenticated ? undefined : 'Войдите, чтобы поставить лайк'}
        onClick={() => { void dispatch(setDepositMonthLike({ id: month.id, liked: month.is_liked === 1 ? 0 : 1 })) }}>
        <span className="feed-heart">{month.is_liked === 1 ? '♥' : '♡'}</span><span className="feed-like-count">{month.likes_count}</span>
      </button>
      <button type="button" className="feed-next" disabled={busy} aria-label="Следующий месяц" onClick={() => { void next() }}>→</button>
    </aside>
  </main>
}

function DaysFilter() {
  const dispatch = useAppDispatch()
  const range = useAppSelector(state => state.filters.selected)
  const busy = useAppSelector(selectBusy)
  const search = (event: FormEvent) => {
    event.preventDefault()
    dispatch(filterActions.applyDays())
    void dispatch(getDepositMonths())
  }
  return <Form className="deposit-month-filter" onSubmit={search}>
    <fieldset disabled={busy}>
      <legend className="filter-title">Количество дней: {range.min}–{range.max}</legend>
      <div className="dual-range">
        <div className="range-track" /><div className="range-selected-track" style={{ left: (range.min - 28) / 3 * 100 + '%', width: (range.max - range.min) / 3 * 100 + '%' }} />
        <input className="range-input" type="range" min="28" max="31" step="1" value={range.min} aria-label="Минимальное количество дней"
          onChange={event => dispatch(filterActions.selectDays({ ...range, min: Math.min(event.target.valueAsNumber, range.max) }))} />
        <input className="range-input" type="range" min="28" max="31" step="1" value={range.max} aria-label="Максимальное количество дней"
          onChange={event => dispatch(filterActions.selectDays({ ...range, max: Math.max(event.target.valueAsNumber, range.min) }))} />
      </div>
      <div className="range-labels">{[28, 29, 30, 31].map(number => <span key={number}>{number}</span>)}</div>
      <button className="filter-button" type="submit">Найти</button>
    </fieldset>
  </Form>
}

function DepositMonthCard({ month }: { month: DepositMonth }) {
  const dispatch = useAppDispatch()
  const authenticated = useAppSelector(state => state.auth.isAuthenticated === 1)
  const busy = useAppSelector(selectBusy)
  return <article className="deposit-month-card">
    <Link className="deposit-month-card-link" to={'/deposit_month?deposit_month_id=' + month.id}>
      <img className="deposit-month-card-image" src={mediaUrl(month.image_url) || '/media/default.jpg'} alt={month.name} onError={event => fallback(event.currentTarget, '/media/default.jpg')} />
      <div className="deposit-month-card-info">
        <div className="deposit-month-card-main-row">
          <div className="deposit-month-card-text"><span className="deposit-month-card-number">{month.month_number ?? '—'}</span><h2>{month.name}</h2></div>
          <div className="deposit-month-card-like"><span className={'deposit-month-card-heart' + (month.is_liked === 1 ? ' liked' : '')}>{month.is_liked === 1 ? '♥' : '♡'}</span><span className="deposit-month-card-like-count">{month.likes_count}</span></div>
        </div>
        <span className="deposit-month-card-days">{month.days_count ?? '—'} {dayLabel(month.days_count)}</span>
      </div>
    </Link>
    {authenticated && month.is_creator === 1 && <button type="button" className="delete-button" disabled={busy} aria-label={'Удалить ' + month.name} onClick={() => { void dispatch(deleteDepositMonth(month.id)) }}>Удалить</button>}
  </article>
}

function Tiles() {
  const dispatch = useAppDispatch()
  const list = useAppSelector(state => state.depositMonths.list)
  const authenticated = useAppSelector(state => state.auth.isAuthenticated === 1)
  useEffect(() => {
    const request = dispatch(getDepositMonths())
    return () => request.abort()
  }, [dispatch, authenticated])
  return <main className="list-content">
    <h1 className="page-title">Расчётные месяцы</h1><DaysFilter />
    {list.source === 'mock' && !list.error && <MockNotice />}
    <ErrorNotice message={list.error} retry={() => { void dispatch(getDepositMonths()) }} />
    {!list.error && <div className="deposit-month-grid">
      {list.items.map(month => <DepositMonthCard key={month.id} month={month} />)}
      {!list.items.length && list.status === 'succeeded' && <p className="empty-result">Месяцы в выбранном диапазоне не найдены.</p>}
    </div>}
  </main>
}

function AuthPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const authenticated = useAppSelector(state => state.auth.isAuthenticated === 1)
  const busy = useAppSelector(selectBusy)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  if (authenticated) return <Navigate replace to="/deposit_month/list" />
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    dispatch(authActions.authStarted())
    try {
      // Manual Axios request; authentication does not use codegen or thunk.
      const response = await authHttp.post<TokenPair>('/users/authentication', { email: email.trim(), password })
      saveTokens(response.data)
      dispatch(authActions.loggedIn({ id: response.data.user_id, email: email.trim() }))
      navigate('/deposit_month/list', { replace: true })
    } catch (error) { dispatch(authActions.authFailed(errorMessage(error))) }
  }
  return <main className="list-content editor-page">
    <h1 className="page-title">Вход</h1>
    <p className="page-intro">Войдите, чтобы публиковать месяцы и ставить лайки.</p>
    <Form onSubmit={event => { void submit(event) }} className="editor-form">
      <fieldset disabled={busy}>
        <label>Электронная почта<input name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" maxLength={255} required /></label>
        <label>Пароль<input name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" maxLength={72} required /></label>
        <button type="submit" className="filter-button">Войти</button>
      </fieldset>
    </Form>
  </main>
}


function useFilePreview(file: File | null) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!file) { setUrl(undefined); return }
    const next = URL.createObjectURL(file); setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

function CreateDraftForm() {
  const dispatch = useAppDispatch()
  const busy = useAppSelector(selectBusy)
  const [name, setName] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const imagePreview = useFilePreview(image)
  const videoPreview = useFilePreview(video)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (image && video) void dispatch(createDepositMonthDraft({ name: name.trim(), image, video }))
  }
  return <Form onSubmit={submit} className="editor-form">
    <p className="page-intro">Шаг 1 из 2. Название и медиа расчётного месяца.</p>
    <fieldset disabled={busy}>
      <label>Название<input name="name" value={name} onChange={event => setName(event.target.value)} maxLength={50} pattern=".*\S.*" required /></label>
      <label>Изображение<input name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={event => setImage(event.target.files?.[0] || null)} required /></label>
      {imagePreview && <img className="media-preview" src={imagePreview} alt="Выбранное изображение месяца" />}
      <label>Видео<input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => setVideo(event.target.files?.[0] || null)} required /></label>
      {videoPreview && <video className="media-preview" src={videoPreview} controls muted playsInline />}
      <button className="filter-button" type="submit">Далее</button>
    </fieldset>
  </Form>
}

function PublishDraftForm({ draft }: { draft: DtoDepositMonthResponse }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const busy = useAppSelector(selectBusy)
  const [name, setName] = useState(draft.name)
  const [description, setDescription] = useState(draft.description || '')
  const [monthNumber, setMonthNumber] = useState(draft.month_number || 1)
  const [daysCount, setDaysCount] = useState(draft.days_count || 31)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await dispatch(publishDepositMonthDraft({ name: name.trim(), description: description.trim(), month_number: monthNumber, days_count: daysCount })).unwrap()
      navigate('/deposit_month/list')
    } catch { /* Error is displayed from Redux. */ }
  }
  return <Form onSubmit={event => { void submit(event) }} className="editor-form">
    <p className="page-intro">Шаг 2 из 2. Заполните сведения и опубликуйте месяц.</p>
    <img className="media-preview" src={mediaUrl(draft.image_url) || '/media/default.jpg'} alt="Изображение черновика" onError={event => fallback(event.currentTarget, '/media/default.jpg')} />
    <video className="media-preview" src={mediaUrl(draft.video_url) || '/media/default.mp4'} controls muted playsInline preload="metadata" onError={event => fallback(event.currentTarget, '/media/default.mp4')} />
    <fieldset disabled={busy}>
      <label>Название месяца<input name="name" value={name} onChange={event => setName(event.target.value)} maxLength={50} pattern=".*\S.*" required /></label>
      <label>Описание<textarea name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} rows={4} required /></label>
      <label>Номер месяца<input name="month_number" type="number" min={1} max={12} step={1} value={monthNumber} onChange={event => setMonthNumber(event.target.valueAsNumber)} required /></label>
      <label>Количество дней<input name="days_count" type="number" min={28} max={31} step={1} value={daysCount} onChange={event => setDaysCount(event.target.valueAsNumber)} required /></label>
      <button type="submit" className="filter-button">Опубликовать</button>
      <button type="button" className="delete-button delete-draft" onClick={() => { void dispatch(deleteDepositMonth(draft.id)) }}>Удалить черновик</button>
    </fieldset>
  </Form>
}

function AddPage() {
  const dispatch = useAppDispatch()
  const draft = useAppSelector(state => state.depositMonths.draft)
  useEffect(() => {
    dispatch(clearMutationError())
    const request = dispatch(getDepositMonthDraft())
    return () => request.abort()
  }, [dispatch])
  return <main className="list-content editor-page">
    <h1 className="page-title">Добавление месяца</h1>
    <ErrorNotice message={draft.error} retry={() => { void dispatch(getDepositMonthDraft()) }} />
    {draft.status === 'succeeded' && (draft.value ? <PublishDraftForm key={draft.value.id} draft={draft.value} /> : <CreateDraftForm />)}
  </main>
}

function RequireUser({ children }: { children: ReactNode }) {
  const authenticated = useAppSelector(state => state.auth.isAuthenticated === 1)
  return authenticated ? children : <Navigate replace to="/login" />
}

export default function App() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user, error: authError } = useAppSelector(state => state.auth)
  const mutationError = useAppSelector(state => state.depositMonths.mutation.error)
  const busy = useAppSelector(selectBusy)
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => { content.current?.toggleAttribute('inert', busy) }, [busy])

  const logout = async () => {
    dispatch(authActions.authStarted())
    try {
      try { await authHttp.post('/users/deauthentication', undefined, { headers: { Authorization: `Bearer ${accessToken() || ''}` } }) }
      catch (error) { if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error }
      clearTokens()
      dispatch(authActions.loggedOut(undefined))
      navigate('/deposit_month/list', { replace: true })
    } catch (error) { dispatch(authActions.authFailed(errorMessage(error))) }
  }
  return <div className="app" aria-busy={busy}>
    <div className="app-content" ref={content}>
      {(authError || mutationError) && <div className="global-notice" role="alert"><span>{authError || mutationError}</span><button type="button" aria-label="Закрыть сообщение" onClick={() => { dispatch(authActions.clearAuthError()); dispatch(clearMutationError()) }}>×</button></div>}
      <Routes>
        <Route path="/" element={<LegacyFeedRedirect />} />
        <Route path="/deposit_month" element={<Feed />} />
        <Route path="/deposit_month/list" element={<Tiles />} />
        <Route path="/deposit_month/draft" element={<RequireUser><AddPage /></RequireUser>} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/months" element={<Navigate replace to="/deposit_month/list" />} />
        <Route path="/months/:id" element={<LegacyDetailsRedirect />} />
        <Route path="*" element={<Navigate replace to="/deposit_month/list" />} />
      </Routes>
      <Nav as="nav" className="bottom-nav" aria-label="Основная навигация">
        <NavLink end to="/deposit_month" className="nav-item"><span className="nav-icon">⌂</span>Лента</NavLink>
        {isAuthenticated === 1 ? <NavLink to="/deposit_month/draft" className="nav-item"><span className="nav-icon">＋</span>Добавление</NavLink> : <span className="nav-item" aria-disabled="true"><span className="nav-icon">＋</span>Добавление</span>}
        <NavLink to="/deposit_month/list" className="nav-item"><span className="nav-icon">▦</span>Плитка</NavLink>
        {isAuthenticated === 1 ? <button type="button" className="nav-item nav-button" disabled={busy} title={user?.email} onClick={() => { void logout() }}><span className="nav-icon">⇤</span>Выход</button> : <NavLink to="/login" className="nav-item"><span className="nav-icon">⇥</span>Вход</NavLink>}
      </Nav>
    </div>
    {busy && <div className="busy-overlay" role="status" aria-live="polite"><span className="loading-spinner" /><span>Загрузка…</span></div>}
  </div>
}
