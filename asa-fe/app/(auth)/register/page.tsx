'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Lock, User, Eye, EyeOff, ChevronRight, BookOpen } from 'lucide-react'
import { cn, getErrorMessage } from '@/lib/utils'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !email || !password || !confirm) {
            toast({ title: 'Please fill in all fields', variant: 'destructive' })
            return
        }
        if (password !== confirm) {
            toast({ title: 'Passwords do not match', variant: 'destructive' })
            return
        }
        if (password.length < 8) {
            toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
            return
        }
        setLoading(true)
        try {
            await register({ full_name: name, email, password } as any)
            toast({ title: 'Account created!', description: 'Welcome to Study Buddy 🎉' } as any)
            router.push('/dashboard')
        } catch (err: any) {
            console.error('Registration error:', err)
            let errorMessage = 'Please try again'

            if (err?.response?.data?.detail) {
                const detail = err.response.data.detail
                if (typeof detail === 'string') {
                    errorMessage = detail
                } else if (Array.isArray(detail)) {
                    errorMessage = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
                } else if (typeof detail === 'object') {
                    errorMessage = detail.msg || JSON.stringify(detail)
                }
            } else if (err?.message) {
                errorMessage = err.message
            }

            toast({
                title: 'Registration failed',
                description: errorMessage,
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
    const strengthColors = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']
    const strengthLabels = ['', 'Insecure', 'Standard', 'Strong']

    return (
        <div className="animate-fade-in flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-[#f8fafc] text-slate-900 py-12">
            
            <Link href="/" className="flex items-center gap-3 mb-10 group mt-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Study Buddy</span>
            </Link>

            <div className="w-full max-w-lg bg-white p-10 sm:p-12 rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-slate-100 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />

                <div className="mb-10 text-center relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <User className="h-7 w-7 text-indigo-500" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-3 text-slate-900">Join Study Buddy</h1>
                    <p className="text-slate-500 font-medium">Your ultimate study companion</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-4">
                        <div className="space-y-2.5">
                            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Full Name</Label>
                            <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                                icon={<User className="h-4 w-4 text-slate-400" />} autoComplete="name"
                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-900 shadow-sm placeholder:text-slate-400" />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Email Address</Label>
                            <Input id="email" type="email" placeholder="student@university.edu" value={email} onChange={e => setEmail(e.target.value)}
                                icon={<Mail className="h-4 w-4 text-slate-400" />} autoComplete="email"
                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-900 shadow-sm placeholder:text-slate-400" />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Password</Label>
                            <div className="relative">
                                <Input id="password" type={showPw ? 'text' : 'password'} placeholder="Create a password..."
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all pr-12 text-slate-900 shadow-sm placeholder:text-slate-400"
                                    autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPw(s => !s)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Confirm Password</Label>
                            <div className="relative">
                                <Input id="confirm" type={showConfirmPw ? 'text' : 'password'} placeholder="Match your password..."
                                    value={confirm} onChange={e => setConfirm(e.target.value)}
                                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                                    className={cn(
                                        "h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all pr-12 text-slate-900 shadow-sm placeholder:text-slate-400",
                                        confirm && confirm !== password ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''
                                    )} />
                                <button type="button" onClick={() => setShowConfirmPw(s => !s)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {password && (
                        <div className="flex items-center gap-3 px-1 pt-2">
                            <div className="flex gap-1.5 flex-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={cn(
                                        "h-1.5 flex-1 rounded-full transition-all duration-500 shadow-sm",
                                        i <= strength ? strengthColors[strength] : 'bg-slate-100'
                                    )} />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{strengthLabels[strength]}</span>
                        </div>
                    )}

                    <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 group overflow-hidden btn-premium mt-6" loading={loading}>
                        <span className="relative z-10 flex items-center justify-center gap-2">Create Account <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>
                    </Button>
                </form>

                <div className="mt-10 text-center text-sm relative z-10">
                    <span className="text-slate-500 font-medium">Already a member? </span>
                    <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-all tracking-tight">Login here</Link>
                </div>
            </div>
        </div>
    )
}
