import axios, { AxiosError } from 'axios'
import { getToken, removeToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            removeToken()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
    email: string
    password: string
    name?: string
    full_name?: string
    username?: string
}
export interface AuthResponse { access_token: string; token_type: string; user: UserProfile }
export interface UserProfile { id: string; email: string; name: string; full_name?: string; avatar?: string; avatar_url?: string; created_at?: string }

const mapUser = (user: any): UserProfile => ({
    ...user,
    name: user.full_name || user.name || '',
    avatar: user.avatar_url || user.avatar || '',
})

export const authApi = {
    getAvatarUrl: (avatar: string | undefined | null) => {
        if (!avatar) return ''
        if (avatar.startsWith('http')) return avatar
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const normalizedAvatar = avatar.startsWith('/') ? avatar : `/${avatar}`
        return `${baseUrl}${normalizedAvatar}?t=${Date.now()}`
    },
    login: (data: LoginPayload) =>
        api.post<AuthResponse>('/api/auth/login', data).then(r => ({ ...r.data, user: mapUser(r.data.user) })),
    register: (data: RegisterPayload) =>
        api.post<AuthResponse>('/api/auth/register', data).then(r => ({ ...r.data, user: mapUser(r.data.user) })),
    me: () =>
        api.get<any>('/api/auth/me').then(r => mapUser(r.data)),
    updateProfile: (data: Partial<UserProfile>) => {
        const payload = { ...data, full_name: data.name, avatar_url: data.avatar }
        return api.patch<any>('/api/auth/me', payload).then(r => mapUser(r.data))
    },
    changePassword: (data: any) =>
        api.put<any>('/api/auth/me/password', data).then(r => r.data),
    uploadAvatar: (file: File) => {
        const form = new FormData()
        form.append('file', file)
        return api.post<any>('/api/auth/me/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => mapUser(r.data))
    },
    deleteAccount: () =>
        api.delete('/api/auth/me').then(r => r.data),
    forgotPassword: (data: { email: string }) =>
        api.post<{ message: string }>('/api/auth/forgot-password', data).then(r => r.data),
    resetPassword: (data: { token: string; new_password: string }) =>
        api.post<{ message: string }>('/api/auth/reset-password', data).then(r => r.data),
}

// ─────────────────────────────────────────
// Documents
// ─────────────────────────────────────────
export interface Document {
    id: string
    filename: string
    title: string
    file_size: number
    file_type: string
    folder_id?: string
    created_at: string
    updated_at?: string
    page_count?: number
    mime_type?: string
    extracted_text?: string
}

export const documentsApi = {
    list: (folderId?: string) =>
        api.get<Document[]>('/api/documents', { params: { folder_id: folderId } }).then(r => r.data),
    upload: (file: File, folderId?: string) => {
        const form = new FormData()
        form.append('file', file)
        if (folderId) form.append('folder_id', folderId)
        return api.post<Document>('/api/documents/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data)
    },
    get: (id: string) =>
        api.get<Document>(`/api/documents/${id}`).then(r => r.data),
    delete: (id: string) =>
        api.delete(`/api/documents/${id}`).then(r => r.data),
    rename: (id: string, title: string) =>
        api.put<Document>(`/api/documents/${id}`, { title }).then(r => r.data),
    move: (id: string, folderId: string | null) =>
        api.patch<Document>(`/api/documents/${id}/move`, { folder_id: folderId }).then(r => r.data),
    getUrl: (id: string) => {
        const token = getToken()
        return `${API_URL}/api/documents/${id}/view${token ? `?token=${token}` : ''}`
    },
}

// ─────────────────────────────────────────
// Folders
// ─────────────────────────────────────────
export interface Folder {
    id: string
    name: string
    color?: string
    document_count: number
    created_at: string
}

export const foldersApi = {
    list: () =>
        api.get<Folder[]>('/api/folders').then(r => r.data),
    create: (name: string, color?: string) =>
        api.post<Folder>('/api/folders', { name, color }).then(r => r.data),
    update: (id: string, data: { name?: string; color?: string }) =>
        api.patch<Folder>(`/api/folders/${id}`, data).then(r => r.data),
    delete: (id: string) =>
        api.delete(`/api/folders/${id}`).then(r => r.data),
}

// ─────────────────────────────────────────
// AI Study Tools
// ─────────────────────────────────────────
export interface SummarySubsection { title: string; bullets: string[] }
export interface Summary { 
    document_id: string; 
    topic_name: string;
    content: string;
    word_count: number; 
    session_id?: string;
}
export interface Flashcard { id?: string; front: string; back: string; difficulty?: string; topic?: string }
export interface QuizQuestion { id: string; question: string; options: { id: string; text: string }[]; correct_answer: string; explanation?: string; topic?: string }
export interface ChatAttachment { filename: string; content_type: string; data: string }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; image_url?: string; timestamp?: string }

export const aiApi = {
    getSummary: (documentId: string, length: 'short' | 'medium' | 'detailed' = 'medium') =>
        api.post<Summary>('/api/ai/summary', { document_id: documentId, length }).then(r => r.data),
    getFlashcards: (documentId: string, count: number = 10, mode?: string, special_instructions?: string) =>
        api.post<{ flashcards: Flashcard[]; session_id?: string }>('/api/ai/flashcards', { document_id: documentId, count, mode, special_instructions }).then(r => r.data),
    getQuiz: (documentId: string, count: number = 10) =>
        api.post<{ questions: QuizQuestion[]; session_id?: string }>('/api/ai/quiz', { document_id: documentId, question_count: count }).then(r => r.data),
    chat: (documentId: string, message: string, history: ChatMessage[] = [], image_url?: string, extra_attachment?: ChatAttachment) =>
        api.post<{ answer: string; session_id: string }>('/api/ai/chat', { document_id: documentId, message, history, image_url, extra_attachment }).then(r => r.data),
    updateSession: (sessionId: string, data: { duration_seconds?: number; score?: number; result_data?: any }) =>
        api.patch<{ id: string }>(`/api/ai/sessions/${sessionId}`, data).then(r => r.data),
    createSession: (data: { document_id?: string; session_type: string; duration_seconds?: number; result_data?: any }) =>
        api.post<{ id: string }>('/api/ai/sessions', data).then(r => r.data),
    generalChat: (messages: ChatMessage[], extra_attachment?: ChatAttachment) =>
        api.post<{ message: string }>('/api/ai/chat', { messages, extra_attachment }).then(r => r.data),
}

// ─────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────
export interface DashboardStats {
    total_documents: number
    total_folders: number
    study_sessions: number
    total_study_time: number
    recent_documents: Document[]
}

export const dashboardApi = {
    getStats: () =>
        api.get<DashboardStats>('/api/dashboard/stats').then(r => r.data),
}

export default api
