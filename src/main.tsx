import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { Form, Nav } from 'react-bootstrap'
import { useEffect, useRef, useState } from 'react'
import { mockDepositMonths, type GuestDepositMonth } from './data/deposit_months'
import './deposit_month.css'

function fallback(element: HTMLImageElement | HTMLVideoElement, path: string) {
  if (element.getAttribute('src') !== path) element.src = path
}

function Description({ text }: { text: string | null }) {
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
  }, [])
  return <div className="feed-description">
    <div ref={ref} className={'feed-description-text' + (expanded ? ' expanded' : '')}>{text}</div>
    {long && <button className="feed-description-toggle" aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)}>{expanded ? 'Свернуть' : 'Ещё'}</button>}
  </div>
}

function dayLabel(count: number | null) {
  if (count === null) return ''
  // Число дней в расчётном месяце лежит в диапазоне 28–31.
  return count === 31 ? 'день' : 'дней'
}

function LegacyFeedRedirect() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return <Navigate replace to={id ? '/deposit_month?deposit_month_id=' + encodeURIComponent(id) : '/deposit_month'} />
}

function Feed() {
  const [params, setParams] = useSearchParams()
  const id = params.get('deposit_month_id')
  const index = Math.max(0, mockDepositMonths.findIndex(item => String(item.id) === id))
  const nextDepositMonth = mockDepositMonths[(index + 1) % mockDepositMonths.length]
  const depositMonth = mockDepositMonths[index]
  return <main className="feed">
    <video key={depositMonth.id} className="feed-video" autoPlay muted loop playsInline preload="auto"
      src={depositMonth.video_url || '/media/default.mp4'} onError={e => fallback(e.currentTarget, '/media/default.mp4')} />
    <div className="feed-overlay" />
    <section className="feed-info">
      <h1 className="feed-month-title">{depositMonth.name}</h1>
      <Description key={depositMonth.id} text={depositMonth.description} />
    </section>
    <aside className="feed-side">
      <div className="feed-stat"><span className="feed-stat-value">{depositMonth.month_number}</span><span className="feed-stat-label">месяц</span></div>
      <div className="feed-stat"><span className="feed-stat-value">{depositMonth.days_count}</span><span className="feed-stat-label">{dayLabel(depositMonth.days_count)}</span></div>
      <div className="feed-like-content"><span className="feed-heart">♡</span><span className="feed-like-count">{depositMonth.likes_count}</span></div>
      <button type="button" className="feed-next" aria-label="Следующий месяц" onClick={() => setParams({ deposit_month_id: String(nextDepositMonth.id) }, { replace: true })}>→</button>
    </aside>
  </main>
}

type Range = { min: number; max: number }
const allDays: Range = { min: 28, max: 31 }

function DaysFilter({ onApply }: { onApply: (range: Range) => void }) {
  const [range, setRange] = useState(allDays)
  return <Form className="deposit-month-filter" onSubmit={event => { event.preventDefault(); onApply(range) }}>
    <div className="filter-title">Количество дней</div>
    <div className="dual-range">
      <div className="range-track" />
      <div className="range-selected-track" style={{ left: (range.min - 28) / 3 * 100 + '%', width: (range.max - range.min) / 3 * 100 + '%' }} />
      <input className="range-input" type="range" min="28" max="31" step="1" value={range.min} aria-label="Минимальное количество дней"
        onChange={e => setRange({ ...range, min: Math.min(e.target.valueAsNumber, range.max) })} />
      <input className="range-input" type="range" min="28" max="31" step="1" value={range.max} aria-label="Максимальное количество дней"
        onChange={e => setRange({ ...range, max: Math.max(e.target.valueAsNumber, range.min) })} />
    </div>
    <div className="range-labels">{[28, 29, 30, 31].map(n => <span key={n}>{n}</span>)}</div>
    <button className="filter-button" type="submit">Найти</button>
  </Form>
}

function DepositMonthCard({ depositMonth }: { depositMonth: GuestDepositMonth }) {
  return <Link className="deposit-month-card" to={'/deposit_month?deposit_month_id=' + depositMonth.id}>
    <img className="deposit-month-card-image" src={depositMonth.image_url || '/media/default.jpg'} alt={depositMonth.name}
      onError={e => fallback(e.currentTarget, '/media/default.jpg')} />
    <div className="deposit-month-card-info">
      <div className="deposit-month-card-main-row">
        <div className="deposit-month-card-text"><span className="deposit-month-card-number">{depositMonth.month_number}</span><h2>{depositMonth.name}</h2></div>
        <div className="deposit-month-card-like"><span className="deposit-month-card-heart">♡</span><span className="deposit-month-card-like-count">{depositMonth.likes_count}</span></div>
      </div>
      <span className="deposit-month-card-days">{depositMonth.days_count} {dayLabel(depositMonth.days_count)}</span>
    </div>
  </Link>
}

function Tiles() {
  const [range, setRange] = useState(allDays)
  const filteredDepositMonths = mockDepositMonths.filter(({ days_count }) => days_count !== null && days_count >= range.min && days_count <= range.max)
  return <main className="list-content">
    <h1 className="page-title">Расчётные месяцы</h1>
    <DaysFilter onApply={setRange} />
    <div className="deposit-month-grid">
      {filteredDepositMonths.map(depositMonth => <DepositMonthCard key={depositMonth.id} depositMonth={depositMonth} />)}
      {!filteredDepositMonths.length && <p className="empty-result">Месяцы в выбранном диапазоне не найдены.</p>}
    </div>
  </main>
}

function Details() {
  const { id } = useParams()
  const depositMonth = mockDepositMonths.find(item => String(item.id) === id)
  return <main className="list-content">
    <h1 className="page-title">{depositMonth?.name ?? 'Месяц не найден'}</h1>
    {depositMonth && <><p>{depositMonth.description}</p><p>{depositMonth.days_count} {dayLabel(depositMonth.days_count)}</p></>}
    <Link to="/deposit_month/list">К плитке</Link>
  </main>
}

function App() {
  return <div className="app">
    <Routes>
      <Route path="/" element={<LegacyFeedRedirect />} />
      <Route path="/deposit_month" element={<Feed />} />
      <Route path="/months" element={<Navigate replace to="/deposit_month/list" />} />
      <Route path="/deposit_month/list" element={<Tiles />} />
      <Route path="/months/:id" element={<Details />} />
    </Routes>
    <Nav as="nav" className="bottom-nav" aria-label="Основная навигация">
      <NavLink end to="/deposit_month" className="nav-item"><span className="nav-icon">⌂</span>Лента</NavLink>
      <span className="nav-item" aria-disabled="true"><span className="nav-icon">＋</span>Добавление</span>
      <NavLink to="/deposit_month/list" className="nav-item"><span className="nav-icon">▦</span>Плитка</NavLink>
      <span className="nav-item" aria-disabled="true"><span className="nav-icon">⇥</span>Вход</span>
    </Nav>
  </div>
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)





















