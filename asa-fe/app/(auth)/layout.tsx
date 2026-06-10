import { BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left: Branding Panel */}
            <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-12 justify-between relative overflow-hidden shadow-2xl z-10">
                <div className="absolute inset-0 bg-black/5" />
                {/* Decorative circles */}
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
                            <BookOpen className="h-6 w-6 text-white drop-shadow-sm" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tight drop-shadow-sm">Study Buddy</span>
                    </Link>
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <h2 className="text-4xl font-black mb-6 tracking-tight leading-tight">Master your studies with intelligent AI</h2>
                    <p className="text-indigo-100 text-xl leading-relaxed mb-10 font-medium">
                        Upload your documents and let advanced AI create personalized study materials instantly — summaries, flashcards, quizzes, and a 24/7 interactive tutor.
                    </p>
                    <div className="space-y-4 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-xl">
                        {['Extract insights in seconds', 'Auto-generated flashcards & quizzes', 'Chat naturally with your documents', 'Track your study progress effortlessly'].map(feat => (
                            <div key={feat} className="flex items-center gap-4 text-white font-semibold">
                                <div className="w-6 h-6 rounded-full bg-emerald-400/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-lg tracking-tight">{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-indigo-200 text-sm font-bold uppercase tracking-widest">
                    © {new Date().getFullYear()} Study Buddy
                </div>
            </div>

            {/* Right: Auth Form */}
            <div className="flex-1 flex items-center justify-center relative overflow-y-auto">
                <div className="absolute inset-0 bg-[#f8fafc] pointer-events-none" />
                <div className="w-full max-w-md relative z-10">
                    <div className="lg:hidden flex justify-center mb-10 mt-6">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                <BookOpen className="h-6 w-6 text-indigo-600" />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Study Buddy</span>
                        </Link>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
