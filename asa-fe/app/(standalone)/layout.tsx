'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { BookOpen } from 'lucide-react'

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) router.replace('/login')
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center animate-pulse">
                        <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <TimerProvider>
            <div className="min-h-screen bg-background">
                {children}
            </div>
        </TimerProvider>
    )
}
