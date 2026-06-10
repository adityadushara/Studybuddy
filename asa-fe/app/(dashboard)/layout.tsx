'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { BookOpen, LayoutDashboard, Timer, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/goal', label: 'Set Goal', icon: Target },
    { href: '/dashboard/timer', label: 'Focus Timer', icon: Timer },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/20">
                        <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm animate-pulse">Loading study space...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="h-screen bg-[#f8fafc] flex overflow-hidden">
            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-4 left-4 h-[calc(100vh-2rem)] w-64 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl z-50 flex flex-col transition-all duration-300 shadow-xl shadow-slate-200/50 overflow-hidden",
                sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)] lg:translate-x-0',
                "lg:relative lg:top-0 lg:left-0 lg:h-full lg:rounded-none lg:border-0 lg:border-r lg:shadow-none lg:bg-white"
            )}>
                {/* Logo */}
                <Link href="/dashboard" className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 flex-shrink-0 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Study Buddy</span>
                </Link>

                {/* Nav Items */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    'sidebar-item group py-3 px-4 flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden',
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-1 border border-transparent'
                                )}
                            >
                                <Icon className={cn(
                                    "h-5 w-5 flex-shrink-0 transition-colors",
                                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"
                                )} />
                                <span className="flex-1">{label}</span>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse shadow-sm shadow-indigo-500/50" />}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar onMenuToggle={() => setSidebarOpen(o => !o)} />
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto animate-slide-up custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
