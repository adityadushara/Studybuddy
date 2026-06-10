'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Mail, ChevronRight, BookOpen, KeyRound } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            toast({ title: 'Please enter your email', variant: 'destructive' })
            return
        }
        setLoading(true)
        try {
            await authApi.forgotPassword({ email })
            setSubmitted(true)
            toast({ title: 'Reset link sent!', description: 'Check your email for further instructions.', variant: 'success' } as any)
        } catch (err: any) {
            toast({
                title: 'Error',
                description: getErrorMessage(err, 'Failed to send reset link'),
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-[#f8fafc] text-slate-900 py-12">
            
            <Link href="/" className="flex items-center gap-3 mb-12 group">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Study Buddy</span>
            </Link>

            <div className="w-full max-w-md bg-white p-10 sm:p-12 rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-slate-100 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />

                <div className="mb-10 text-center relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <KeyRound className="h-7 w-7 text-indigo-500" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-3 text-slate-900">Reset Password</h1>
                    <p className="text-slate-500 font-medium">
                        {submitted ? "We've sent a link to your email" : "Enter your email to get a reset link"}
                    </p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="student@studybuddy.ai"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                icon={<Mail className="h-4 w-4 text-slate-400" />}
                                autoComplete="email"
                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-900 shadow-sm placeholder:text-slate-400"
                            />
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 group overflow-hidden btn-premium mt-4" loading={loading}>
                            <span className="relative z-10 flex items-center justify-center gap-2">Send Link <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>
                        </Button>
                    </form>
                ) : (
                    <div className="text-center relative z-10 space-y-6">
                        <p className="text-sm text-slate-600">
                            If an account exists for <span className="font-semibold text-slate-900">{email}</span>, you will receive a password reset link shortly.
                        </p>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setSubmitted(false)}
                            className="w-full h-12 rounded-xl"
                        >
                            Try another email
                        </Button>
                    </div>
                )}

                <div className="mt-10 text-center text-sm relative z-10">
                    <span className="text-slate-500 font-medium">Remembered it? </span>
                    <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-all tracking-tight">Back to Login</Link>
                </div>
            </div>
        </div>
    )
}
