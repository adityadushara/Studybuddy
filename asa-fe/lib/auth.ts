const TOKEN_KEY = 'study_buddy_token'
const USER_KEY = 'study_buddy_user'

export interface StoredUser {
    id: string
    email: string
    name: string
    avatar?: string
}

export function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): StoredUser | null {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

export function setStoredUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return Date.now() >= payload.exp * 1000
    } catch {
        return true
    }
}

export function isAuthenticated(): boolean {
    const token = getToken()
    if (!token) return false
    return !isTokenExpired(token)
}
