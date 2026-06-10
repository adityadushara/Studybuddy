import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { TimerProvider } from '@/contexts/TimerContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import FloatingTimer from '@/components/FloatingTimer'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Study Buddy – AI-Powered Learning',
    description: 'Upload documents, get AI summaries, flashcards, quizzes and chat with your study materials.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <AuthProvider>
                    <NotificationProvider>
                        <TimerProvider>
                            {children}
                            <FloatingTimer />
                        </TimerProvider>
                        <Toaster />
                    </NotificationProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
