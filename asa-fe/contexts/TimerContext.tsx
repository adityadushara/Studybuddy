'use client'
import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { aiApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/contexts/NotificationContext'

interface TimerContextType {
    seconds: number
    running: boolean
    mode: 'count' | 'countdown'
    alarmEnabled: boolean
    start: () => void
    pause: () => void
    reset: () => void
    setCountdown: (secs: number) => void
    setAlarmEnabled: (enabled: boolean) => void
    saveSession: (docId?: string, quiet?: boolean) => Promise<void>
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [seconds, setSeconds] = useState(0)
    const [running, setRunning] = useState(false)
    const [mode, setMode] = useState<'count' | 'countdown'>('count')
    const [alarmEnabled, setAlarmEnabled] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const { addNotification } = useNotifications()

    useEffect(() => {
        // Initialize audio on client side
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    }, [])

    const [elapsedSinceLastSave, setElapsedSinceLastSave] = useState(0)

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setElapsedSinceLastSave(e => e + 1)
                setSeconds(s => {
                    const next = mode === 'countdown' ? s - 1 : s + 1

                    if (mode === 'countdown' && s <= 1) {
                        setRunning(false)
                        addNotification('Focus Session Complete!', 'Your study time is up. Take a short break!', 'success')
                        // AUTO-SAVE on completion
                        saveSession()
                        if (alarmEnabled && audioRef.current) {
                            audioRef.current.play().catch(e => console.log('Audio play failed:', e))
                        }
                        return 0
                    }
                    return next
                })
            }, 1000)
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [running, mode, alarmEnabled])

    // Periodic save every 5 minutes if running
    useEffect(() => {
        if (!running) return
        if (elapsedSinceLastSave >= 5 * 60) {
            saveSession()
        }
    }, [running, elapsedSinceLastSave])

    const start = () => setRunning(true)
    const pause = () => {
        setRunning(false)
        saveSession(undefined, true)
    }
    const reset = () => {
        if (running || elapsedSinceLastSave > 0) {
            saveSession(undefined, true)
        }
        setRunning(false)
        setSeconds(0)
        setMode('count')
        setElapsedSinceLastSave(0)
    }
    const setCountdown = (secs: number) => {
        setRunning(false)
        setSeconds(secs)
        setMode('countdown')
        setElapsedSinceLastSave(0)
    }

    const { toast } = useToast()

    const saveSession = async (docId?: string, quiet = false) => {
        // Only save if we have some significant time (e.g. > 5 seconds)
        if (elapsedSinceLastSave < 5) {
            if (!quiet) toast({ title: 'Session too short to save', variant: 'destructive' })
            return
        }

        try {
            await aiApi.createSession({
                document_id: docId,
                session_type: 'focus_timer',
                duration_seconds: elapsedSinceLastSave,
                result_data: { completed_at: new Date().toISOString(), autosave: quiet }
            })
            const savedDuration = Math.floor(elapsedSinceLastSave / 60)
            if (!quiet) {
                toast({ title: 'Study session saved' })
                addNotification('Study Time Saved', `Log: ${savedDuration}m of focus time recorded.`, 'success')
            }
            window.dispatchEvent(new CustomEvent('asa-timer-session-saved'))
            setElapsedSinceLastSave(0)
        } catch (error) {
            if (!quiet) toast({ title: 'Failed to save session', variant: 'destructive' })
            else console.error('Autosave failed:', error)
        }
    }

    // Periodic Autosave (every 60s)
    useEffect(() => {
        let autosaveInterval: NodeJS.Timeout | null = null
        if (running) {
            autosaveInterval = setInterval(() => {
                saveSession(undefined, true)
            }, 60000)
        }
        return () => {
            if (autosaveInterval) clearInterval(autosaveInterval)
        }
    }, [running, seconds, elapsedSinceLastSave])

    // Visibility Change Save
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && (running || elapsedSinceLastSave > 0)) {
                saveSession(undefined, true)
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [running, seconds, elapsedSinceLastSave])

    return (
        <TimerContext.Provider value={{
            seconds, running, mode, alarmEnabled,
            start, pause, reset, setCountdown, setAlarmEnabled, saveSession
        }}>
            {children}
        </TimerContext.Provider>
    )
}

export function useTimer() {
    const context = useContext(TimerContext)
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider')
    }
    return context
}
