'use client'
import { authApi } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { User, Mail, Lock, Camera, Save, Eye, EyeOff, Trash2, ShieldCheck, Mail as MailIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

export default function ProfilePage() {
    const { user, updateUser, logout } = useAuth()
    const router = useRouter()
    const { toast } = useToast()
    const [name, setName] = useState(user?.name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [saving, setSaving] = useState(false)
    const [showCurrentPw, setShowCurrentPw] = useState(false)
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)
    const [currentPw, setCurrentPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [updatingPw, setUpdatingPw] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (user) {
            setName(user.name)
            setEmail(user.email)
        }
    }, [user])

    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SB'

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSaving(true)
        try {
            const updatedUser = await authApi.uploadAvatar(file)
            await updateUser(updatedUser)
            toast({ title: 'Avatar updated' })
        } catch (err: any) {
            toast({
                title: 'Upload failed',
                description: err.response?.data?.detail || 'An error occurred',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async () => {
        if (!name.trim() || !email.trim()) {
            toast({ title: 'Fields cannot be empty', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            await updateUser({ name, email })
            toast({ title: 'Profile saved' })
        } catch (err: any) {
            toast({
                title: 'Save failed',
                description: err.response?.data?.detail || 'An error occurred',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordChange = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            toast({ title: 'All fields required', variant: 'destructive' })
            return
        }
        if (newPw !== confirmPw) {
            toast({ title: 'Passwords mismatch', variant: 'destructive' })
            return
        }

        setUpdatingPw(true)
        try {
            await authApi.changePassword({
                current_password: currentPw,
                new_password: newPw
            })
            toast({ title: 'Password updated' })
            setCurrentPw('')
            setNewPw('')
            setConfirmPw('')
        } catch (err: any) {
            toast({
                title: 'Update failed',
                description: err.response?.data?.detail || 'Could not update password',
                variant: 'destructive'
            })
        } finally {
            setUpdatingPw(false)
        }
    }

    const handleDeleteAccount = async () => {
        setDeleting(true)
        try {
            await authApi.deleteAccount()
            toast({ title: 'Account deleted' })
            logout()
            router.push('/')
        } catch (err: any) {
            toast({
                title: 'Delete failed',
                description: err.response?.data?.detail || 'An error occurred',
                variant: 'destructive'
            })
            setDeleting(false)
            setIsDeleteDialogOpen(false)
        }
    }

    if (!mounted) return <div className="min-h-screen p-12 flex items-center justify-center text-slate-500 animate-pulse font-medium">Loading Profile...</div>

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-slide-up pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Profile Settings</h1>
                    <p className="text-base text-slate-500 font-medium mt-1">Manage your account and security.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Verified Account</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-white border-slate-100 shadow-xl shadow-indigo-900/5 rounded-[2.5rem] overflow-hidden group">
                        <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
                            <div className="relative mb-6">
                                <Avatar className="h-32 w-32 ring-8 ring-indigo-50 shadow-xl transition-transform group-hover:scale-105 duration-500">
                                    {user?.avatar && <AvatarImage src={authApi.getAvatarUrl(user.avatar)} alt={user.name} />}
                                    <AvatarFallback className="text-3xl font-black bg-indigo-100 text-indigo-600">{initials}</AvatarFallback>
                                </Avatar>
                                <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                <button
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                    className="absolute bottom-1 right-1 h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-4 border-white"
                                >
                                    <Camera className="h-4 w-4 text-white" />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black truncate max-w-full text-slate-900 relative z-10">{user?.name}</h3>
                            <p className="text-sm font-medium text-slate-500 truncate max-w-full relative z-10">{user?.email}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-red-100 shadow-sm rounded-[2rem] overflow-hidden relative">
                        <div className="absolute inset-0 bg-red-50/20 pointer-events-none" />
                        <CardContent className="p-8 relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Trash2 className="h-5 w-5 text-red-500" />
                                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">Danger Zone</h3>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">Permanently delete your account and all associated data. This action cannot be undone.</p>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="bg-white border-slate-100 shadow-xl shadow-indigo-900/5 rounded-[2.5rem] overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        <CardContent className="p-8 md:p-10 space-y-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                                    <User className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h2 className="font-black text-2xl text-slate-900 tracking-tight">Profile Information</h2>
                            </div>

                            <div className="grid gap-8">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-slate-200 pl-12 text-base font-bold transition-all text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <MailIcon className="h-5 w-5" />
                                        </div>
                                        <Input
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-slate-200 pl-12 text-base font-bold transition-all text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button 
                                    className="h-14 px-8 rounded-2xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto btn-premium" 
                                    onClick={handleSave} 
                                    loading={saving}
                                >
                                    <Save className="h-5 w-5 mr-2" /> Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-xl shadow-indigo-900/5 rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-8 md:p-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
                                    <Lock className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h2 className="font-black text-2xl text-slate-900 tracking-tight">Security & Password</h2>
                            </div>

                            <div className="grid gap-8">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Current Password</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <Input
                                            type={showCurrentPw ? "text" : "password"}
                                            value={currentPw}
                                            onChange={e => setCurrentPw(e.target.value)}
                                            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-slate-200 pl-12 pr-12 text-base font-bold transition-all text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            onClick={() => setShowCurrentPw(!showCurrentPw)} 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showCurrentPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">New Password</Label>
                                        <div className="relative group">
                                            <Input
                                                type={showNewPw ? "text" : "password"}
                                                value={newPw}
                                                onChange={e => setNewPw(e.target.value)}
                                                className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-slate-200 pr-12 text-base font-bold transition-all text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm"
                                                placeholder="••••••••"
                                            />
                                            <button 
                                                onClick={() => setShowNewPw(!showNewPw)} 
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {showNewPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Confirm New Password</Label>
                                        <div className="relative group">
                                            <Input
                                                type={showConfirmPw ? "text" : "password"}
                                                value={confirmPw}
                                                onChange={e => setConfirmPw(e.target.value)}
                                                className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-slate-200 pr-12 text-base font-bold transition-all text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm"
                                                placeholder="••••••••"
                                            />
                                            <button 
                                                onClick={() => setShowConfirmPw(!showConfirmPw)} 
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {showConfirmPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button 
                                    variant="outline" 
                                    className="h-14 px-8 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 transition-all text-sm font-bold uppercase tracking-wider text-slate-900 shadow-sm w-full sm:w-auto" 
                                    onClick={handlePasswordChange} 
                                    loading={updatingPw}
                                >
                                    <Lock className="h-4 w-4 mr-2" /> Update Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Account Confirmation */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem] border-slate-100 shadow-2xl p-8 bg-white">
                    <DialogHeader className="space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-2 mx-auto shadow-sm border border-red-100">
                            <Trash2 className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 text-center tracking-tight">Delete Account?</DialogTitle>
                        <DialogDescription className="text-base text-slate-500 leading-relaxed text-center font-medium">
                            This action is irreversible. All your documents, study sessions, and personal data will be permanently wiped from our servers.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-4 mt-8">
                        <Button
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-bold text-sm uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-900"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            No, keep it
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 h-14 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all text-white border-none"
                            onClick={handleDeleteAccount}
                            loading={deleting}
                        >
                            Yes, delete everything
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
