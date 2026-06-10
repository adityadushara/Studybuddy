'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Lock, Eye, EyeOff, ChevronRight, BookOpen, KeyRound } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils'

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const router = useRouter()
    const { toast } = useToast()
    
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!token) {
            toast({ title: 'Invalid reset link', description: 'No token provided.', variant: 'destructive' })
            return
        }

        if (!password || !confirmPassword) {
            toast({ title: 'Please fill in all fields', variant: 'destructive' })
            return
        }

        if (password !== confirmPassword) {
            toast({ title: 'Passwords do not match', variant: 'destructive' })
            return
        }

        if (password.length < 8) {
            toast({ title: 'Password too short', description: 'Must be at least 8 characters long.', variant: 'destructive' })
            return
        }

        setLoading(true)
        try {
            await authApi.resetPassword({ token, new_password: password })
            setSuccess(true)
            toast({ title: 'Password reset successful!', description: 'You can now log in with your new password.', variant: 'success' } as any)
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err: any) {
            toast({
                title: 'Reset failed',
                description: getErrorMessage(err, 'Could not reset password. Link may be expired.'),
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="text-center relative z-10 space-y-6">
                <div className="p-4 bg-red-50 text-red-600 rounded-xl font-medium border border-red-100">
                    Invalid or missing password reset token.
                </div>
                <Button 
                    type="button" 
                    onClick={() => router.push('/forgot-password')}
                    className="w-full h-12 rounded-xl"
                >
                    Request new link
                </Button>
            </div>
        )
    }

    if (success) {
        return (
            <div className="text-center relative z-10 space-y-6">
                <div className="p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-100">
                    Your password has been successfully reset. Redirecting to login...
                </div>
                <Button 
                    type="button" 
                    onClick={() => router.push('/login')}
                    className="w-full h-12 rounded-xl"
                >
                    Go to Login
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">New Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        icon={<Lock className="h-4 w-4 text-slate-400" />}
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all pr-12 text-slate-900 shadow-sm placeholder:text-slate-400"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPw(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
                    >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-widest ml-1 text-slate-500">Confirm New Password</Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        icon={<Lock className="h-4 w-4 text-slate-400" />}
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-indigo-500/20 focus:border-indigo-400 transition-all pr-12 text-slate-900 shadow-sm placeholder:text-slate-400"
                        autoComplete="new-password"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 group overflow-hidden btn-premium mt-4" loading={loading}>
                <span className="relative z-10 flex items-center justify-center gap-2">Reset Password <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>
            </Button>
        </form>
    )
}

export default function ResetPasswordPage() {
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
                    <h1 className="text-3xl font-black tracking-tight mb-3 text-slate-900">Set New Password</h1>
                    <p className="text-slate-500 font-medium">Please enter your new password below.</p>
                </div>

                <Suspense fallback={<div className="text-center text-sm text-slate-500 py-10">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>

                <div className="mt-10 text-center text-sm relative z-10">
                    <span className="text-slate-500 font-medium">Changed your mind? </span>
                    <Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-all tracking-tight">Back to Login</Link>
                </div>
            </div>
        </div>
    )
}
