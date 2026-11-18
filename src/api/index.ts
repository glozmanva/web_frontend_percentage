import axios from 'axios'
import { Api } from './generated/Api'

export const depositMonthApi = new Api({ baseURL: '/api', timeout: 6000 })

// Authentication is deliberately separate: ordinary Axios, no codegen or thunk.
export const authHttp = axios.create({ baseURL: '/api', timeout: 8000 })

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error
    if (typeof message === 'string') return message
    if (!error.response) return 'Сервис недоступен. Проверьте подключение и повторите попытку.'
    return `Ошибка запроса (${error.response.status}). Повторите попытку.`
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос.'
}

export function serviceUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) return false
  return !error.response || [502, 503, 504].includes(error.response.status) ||
    (error.response.status === 500 && !error.response.data)
}
