'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'

export type NotificationType = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
    id: string
    title: string
    message: string
    time: Date
    read: boolean
    type: NotificationType
}

interface NotificationContextType {
    notifications: Notification[]
    addNotification: (title: string, message: string, type?: NotificationType) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    deleteNotification: (id: string) => void
    clearAll: () => void
    unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('study_buddy_notifications')
        if (saved) {
            try {
                const parsed = JSON.parse(saved).map((n: any) => ({
                    ...n,
                    time: new Date(n.time)
                }))
                // Add some initial mock notifications if empty and first time
                if (parsed.length === 0) {
                     setNotifications([
                        {
                            id: 'welcome',
                            title: 'Welcome to Study Buddy!',
                            message: 'Upload your first document to start generating AI insights.',
                            time: new Date(),
                            read: false,
                            type: 'info'
                        }
                    ])
                } else {
                    setNotifications(parsed)
                }
            } catch (e) {
                console.error("Failed to parse notifications", e)
            }
        } else {
            // First time use
            setNotifications([
                {
                    id: 'welcome',
                    title: 'Welcome to Study Buddy!',
                    message: 'Upload your first document to start generating AI insights.',
                    time: new Date(),
                    read: false,
                    type: 'info'
                }
            ])
        }
    }, [])

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('study_buddy_notifications', JSON.stringify(notifications))
    }, [notifications])

    const addNotification = (title: string, message: string, type: NotificationType = 'info') => {
        const newNotif: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            title,
            message,
            time: new Date(),
            read: false,
            type
        }
        setNotifications(prev => [newNotif, ...prev].slice(0, 50)) // Keep last 50
    }

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAll = () => {
        setNotifications([])
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <NotificationContext.Provider value={{
            notifications,
            addNotification,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            clearAll,
            unreadCount
        }}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
