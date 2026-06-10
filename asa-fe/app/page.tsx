'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Brain, Zap, ChevronRight, FileText, Layers, MessageSquare, GraduationCap, Clock, Award } from 'lucide-react'

const features = [
    { icon: FileText, title: 'Smart Summaries', desc: 'Get AI-powered summaries of your documents in seconds. Extract key information effortlessly.', color: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/20' },
    { icon: Layers, title: 'Flashcards', desc: 'Auto-generated flashcards from your text to boost memory retention and active recall.', color: 'from-blue-500 to-sky-500', shadow: 'shadow-blue-500/20' },
    { icon: Brain, title: 'Adaptive Quizzes', desc: 'Test yourself with AI-curated quiz questions that adapt to your knowledge gaps.', color: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/20' },
    { icon: MessageSquare, title: 'Interactive Chat', desc: 'Ask complex questions about your study materials and get contextual, instant answers.', color: 'from-sky-500 to-cyan-500', shadow: 'shadow-sky-500/20' },
]

const stats = [
    { value: '10K+', label: 'Active Students', icon: GraduationCap },
    { value: '150K+', label: 'Study Hours Saved', icon: Clock },
    { value: '99%', label: 'Satisfaction Rate', icon: Award },
    { value: '24/7', label: 'AI Availability', icon: Zap },
]

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-indigo-500/20">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 border-b border-black/[0.04] bg-white/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Study Buddy</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100">Sign In</Button>
                        </Link>
                        <Link href="/register">
                            <Button className="font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 px-6 rounded-xl btn-premium">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-44 pb-32 px-6 overflow-hidden">
                {/* Dynamic Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute -top-20 -left-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute top-40 -right-20 w-[30rem] h-[30rem] bg-blue-200/40 rounded-full blur-[150px] animate-pulse delay-700" />
                </div>

                <div className="relative max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100/50 rounded-full px-5 py-2 text-sm font-bold mb-8 animate-fade-in shadow-sm">
                        <Zap className="h-4 w-4" />
                        The New Standard for Self-Studying
                    </div>
                    <h1 className="text-6xl md:text-[5rem] font-black tracking-tight mb-8 leading-[1.05] animate-slide-up text-slate-900">
                        Accelerate Your <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 bg-clip-text text-transparent">Learning Potential</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium animate-fade-in">
                        Transform lengthy documents, lectures, and notes into interactive study sessions. Achieve academic and professional excellence faster than ever.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in">
                        <Link href="/register">
                            <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-16 px-10 text-lg rounded-2xl shadow-xl shadow-indigo-500/30 group btn-premium gap-2">
                                Start Studying Free <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="outline" className="h-16 px-10 text-lg rounded-2xl border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white text-slate-700 font-semibold shadow-sm transition-all hover:shadow-md">
                                See How It Works
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Dashboard Preview / Trust Section */}
            <section className="relative w-full max-w-6xl mx-auto px-6 pb-20 mt-10 animate-slide-up">
                <div className="glass-premium rounded-[2.5rem] p-8 md:p-14 shadow-2xl shadow-indigo-900/5 relative bg-white border-white">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl" />

                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6 text-left relative z-10">
                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                                <Brain className="h-7 w-7" />
                            </div>
                            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">AI Designed for Deep Comprehension</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium">
                                "This platform is a game-changer. The way it breaks down complex documents into digestible summaries and quizzes is unparalleled. It feels like having an elite personal tutor available 24/7."
                            </p>
                            <div className="flex items-center gap-4 pt-4">
                                <div className="h-12 w-12 rounded-full bg-slate-200 shadow-inner flex items-center justify-center overflow-hidden border-2 border-white">
                                    <div className="h-full w-full bg-gradient-to-br from-indigo-400 to-blue-400 opacity-80" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 uppercase tracking-wide text-sm">Elena Rodriguez</p>
                                    <p className="text-sm font-medium text-slate-500">Law Student & Independent Learner</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-inner relative group hover:scale-[1.02] transition-transform duration-500 z-10">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm">
                                    <FileText className="h-7 w-7 text-indigo-500" />
                                </div>
                                <div className="flex-1">
                                    <div className="h-3.5 w-40 bg-slate-200 rounded-full mb-3" />
                                    <div className="h-2.5 w-24 bg-slate-200/70 rounded-full" />
                                </div>
                                <div className="h-10 w-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shadow-sm">
                                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-4 w-full bg-slate-200/60 rounded-lg" style={{ width: `${100 - (i * 15)}%` }} />
                                ))}
                                <div className="pt-6 flex gap-3">
                                    <div className="h-10 px-5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center shadow-sm">
                                        <span className="text-xs font-bold text-indigo-700 tracking-wider uppercase">Summary Ready</span>
                                    </div>
                                    <div className="h-10 px-5 bg-blue-50 border border-blue-100 rounded-xl flex items-center shadow-sm">
                                        <span className="text-xs font-bold text-blue-700 tracking-wider uppercase">Quiz Generated</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-6 bg-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">The Ultimate Learning Environment</h2>
                        <p className="text-xl text-slate-600 leading-relaxed font-medium">Everything you need to transform static text into dynamic, long-lasting knowledge.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map(({ icon: Icon, title, desc, color, shadow }) => (
                            <div key={title} className="group bg-[#f8fafc] rounded-[2rem] p-8 hover:-translate-y-2 transition-all duration-300 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 cursor-default">
                                <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-[1.25rem] flex items-center justify-center mb-8 shadow-xl ${shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                    <Icon className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-slate-900">{title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-24 px-6 relative overflow-hidden bg-slate-50 border-y border-slate-100">
                <div className="max-w-6xl mx-auto flex flex-wrap justify-around gap-12">
                    {stats.map(({ value, label, icon: Icon }) => (
                        <div key={label} className="text-center group">
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                                    <Icon className="h-6 w-6 text-indigo-500" />
                                </div>
                            </div>
                            <div className="text-5xl font-black text-slate-900 mb-2">{value}</div>
                            <div className="text-sm font-bold tracking-widest uppercase text-slate-500">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-6 relative overflow-hidden text-center bg-white">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10 max-w-3xl mx-auto glass-premium rounded-[3rem] p-16 shadow-2xl shadow-indigo-900/5 border border-indigo-50">
                    <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight tracking-tight text-slate-900">Ready to Elevate<br /><span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Your Intelligence?</span></h2>
                    <p className="text-xl text-slate-600 mb-12 font-medium">Join ambitious professionals and students who have revolutionized their learning with Study Buddy.</p>
                    <Link href="/register">
                        <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-20 px-14 text-xl rounded-2xl shadow-xl shadow-indigo-500/30 gap-3 btn-premium">
                            Create Your Free Account <ChevronRight className="h-6 w-6" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 py-16 px-6 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">Study Buddy</span>
                    </Link>
                    <p className="text-sm text-slate-500 font-medium">© {new Date().getFullYear()} Study Buddy. Empowering self-learners worldwide.</p>
                    <div className="flex gap-8 text-sm font-bold tracking-widest uppercase text-slate-500">
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
