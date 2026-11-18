// Written manually: login is not part of the generated service client.
export interface TokenPair {
  user_id: number
  access_token: string
  refresh_token: string
}

export class SessionExpiredError extends Error {
  constructor() { super('Сессия истекла. Войдите снова.') }
}

export function expiredAccessToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    // Only the backend validates JWT signatures and malformed tokens.
    return false
  }
}

export function accessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function saveTokens(pair: TokenPair): void {
  try {
    localStorage.setItem('access_token', pair.access_token)
    localStorage.setItem('refresh_token', pair.refresh_token)
  } catch {
    clearTokens()
    throw new Error('Браузер не разрешает сохранить JWT. Разрешите локальное хранилище для входа.')
  }
}
