import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength) + '...'
}

export function getFileType(filename: string): 'pdf' | 'txt' | 'doc' | 'other' {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'txt') return 'txt'
    if (ext === 'doc' || ext === 'docx') return 'doc'
    return 'other'
}

/**
 * Safely extracts a human-readable error message from an API response.
 * Handles Axios errors, structured Pydantic/FastAPI validation errors, and standard error objects.
 */
export function getErrorMessage(error: any, fallback = 'Something went wrong'): string {
    if (!error) return fallback

    // If it's a string, return it
    if (typeof error === 'string') return error

    // Handle Axios error response
    const detail = error?.response?.data?.detail

    if (detail) {
        // If detail is an array (Pydantic validation error)
        if (Array.isArray(detail)) {
            // Pick the first error msg if available
            return detail[0]?.msg || JSON.stringify(detail[0]) || fallback
        }
        // If detail is an object (unexpected)
        if (typeof detail === 'object') {
            return detail.msg || detail.message || JSON.stringify(detail) || fallback
        }
        // If detail is already a string
        return detail
    }

    // Standard Error object or message property
    return error.message || fallback
}
