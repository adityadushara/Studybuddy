'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { BookOpen, Bell, Menu, CheckCircle2, Info, AlertTriangle, XCircle, Trash2, CheckCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useNotifications, NotificationType } from '@/contexts/NotificationContext'

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { user, logout } = useAuth()
    const router = useRouter()
    const [showDropdown, setShowDropdown] = useState<boolean>(false)
    const [showNotifs, setShowNotifs] = useState<boolean>(false)
    const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification, clearAll } = useNotifications()

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SB'

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case 'error': return <XCircle className="h-4 w-4 text-destructive" />
            default: return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    const formatTime = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        return date.toLocaleDateString()
    }

    return (
        <header className="sticky top-0 z-40 h-16 flex items-center border-b bg-background/80 backdrop-blur-sm px-4 gap-4">
            {onMenuToggle && (
                <button onClick={onMenuToggle} className="lg:hidden p-2 hover:bg-accent rounded-lg">
                    <Menu className="h-5 w-5" />
                </button>
            )}

            <Link href="/dashboard" className="flex items-center gap-2 mr-auto lg:hidden">
                <Avatar className="h-8 w-8 rounded-lg shadow-sm border-0">
                    {user?.avatar && <AvatarImage src={authApi.getAvatarUrl(user.avatar)} alt={user.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-blue-600 text-white text-[10px] font-bold border-0">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <span className="font-bold text-gradient">Study Buddy</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">

                <div className="relative">
                    <button 
                        onClick={() => { setShowNotifs(v => !v); setShowDropdown(false); }}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors relative group"
                    >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full animate-pulse border-2 border-background" />
                        )}
                    </button>

                    {showNotifs && (
                        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border bg-popover shadow-2xl py-0 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                            <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
                                <h3 className="font-bold text-sm">Notifications</h3>
                                <div className="flex items-center gap-3">
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={markAllAsRead}
                                            className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={clearAll}
                                            className="text-[10px] text-muted-foreground hover:text-destructive font-bold uppercase tracking-wider"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-10 text-center flex flex-col items-center">
                                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 opacity-40">
                                            <Bell className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm font-bold text-foreground/60">No new notifications</p>
                                        <p className="text-xs text-muted-foreground mt-1">We'll alert you when something happens.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {notifications.map(n => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => markAsRead(n.id)}
                                                className={cn(
                                                    "p-4 flex gap-3 hover:bg-muted/50 transition-all cursor-pointer group/notif relative",
                                                    !n.read && "bg-primary/[0.03]"
                                                )}
                                            >
                                                {!n.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />}
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {getIcon(n.type)}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className={cn("text-xs font-bold text-foreground mb-0.5", !n.read && "text-primary")}>{n.title}</p>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                                                    <p className="text-[9px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">{formatTime(n.time)}</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                                                    className="opacity-0 group-hover/notif:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all h-fit"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={() => { setShowDropdown(d => !d); setShowNotifs(false); }}
                        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors"
                    >
                        <Avatar className="h-8 w-8">
                            {user?.avatar && <AvatarImage src={authApi.getAvatarUrl(user.avatar)} alt={user.name} />}
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user?.name || 'User'}</span>
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-popover shadow-lg py-1 z-50">
                            <div className="px-3 py-2 border-b">
                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <Link href="/dashboard/profile" onClick={() => setShowDropdown(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors">
                                Profile Settings
                            </Link>
                            <button onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
