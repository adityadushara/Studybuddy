'use client'
import { useRouter } from 'next/navigation'
import { FileText, MessageCircle, Radio, Layers, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotesSidebar({ docName, activeSection }: {
    docName: string
    activeSection: string
}) {
    const router = useRouter()
    const navItems = [
        { id: 'document', label: 'Summaries', icon: FileText, route: `/notes/${docName}` },
        { id: 'chat', label: 'Chat Bot', icon: MessageCircle, route: `/notes/${docName}/chat` },
        { id: 'flashcards', label: 'Flashcards', icon: Layers, route: `/notes/${docName}/flashcards` },
        { id: 'quiz', label: 'Quiz', icon: BookOpen, route: `/notes/${docName}/quiz` },
    ]

    return (
        <div className="w-[140px] flex-shrink-0 flex flex-col bg-background/50 backdrop-blur-xl border-r border-white/5 h-full z-10">
            {/* Logo */}
            <button 
                onClick={() => router.push('/dashboard')}
                className="px-3 pt-6 pb-5 border-b border-white/5 flex flex-col items-center gap-3 w-full hover:bg-white/5 transition-colors cursor-pointer outline-none"
            >
                <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <BookOpen className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-gradient text-center leading-tight">Study Buddy</span>
            </button>
            {/* Nav items */}
            <nav className="flex-1 p-2 space-y-1">
                {navItems.map(({ id, label, icon: Icon, route }) => (
                    <button
                        key={id}
                        onClick={() => router.push(route)}
                        className={cn(
                            'w-full flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-semibold transition-all',
                            activeSection === id
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </nav>
        </div>
    )
}
