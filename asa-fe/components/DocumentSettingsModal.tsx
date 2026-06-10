'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { documentsApi, Document } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, PencilLine, Check, AlertTriangle, ArrowLeft } from 'lucide-react'

interface Props {
    document: Document | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onOpenPDF: (doc: Document) => void
    onOpenStudyTools: (doc: Document) => void
    onDeleted: () => void
}

export default function DocumentSettingsModal({
    document,
    open,
    onOpenChange,
    onDeleted,
}: Props) {
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (document) {
            setTitle(document.title || document.filename)
            setShowConfirmDelete(false)
        }
    }, [document])

    const handleSave = async () => {
        if (!document || !title.trim()) return
        setSaving(true)
        try {
            await documentsApi.rename(document.id, title.trim())
            toast({ title: 'Renamed successfully' } as any)
            onOpenChange(false)
            onDeleted()
        } catch {
            toast({ title: 'Failed to rename', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!document) return
        setDeleting(true)
        try {
            await documentsApi.delete(document.id)
            toast({ title: 'Document deleted' } as any)
            onOpenChange(false)
            onDeleted()
        } catch {
            toast({ title: 'Failed to delete', variant: 'destructive' })
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] bg-slate-100 border border-slate-200 shadow-xl shadow-slate-300/50 p-0 overflow-hidden rounded-2xl gap-0">
                <DialogDescription className="sr-only">Manage document options</DialogDescription>

                {/* Header */}
                <DialogHeader className="px-7 pt-7 pb-5 border-b border-slate-200">
                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                        Document settings
                    </DialogTitle>
                </DialogHeader>

                {/* Body */}
                <div className="px-7 py-8">
                    {!showConfirmDelete ? (
                        <div className="space-y-6">
                            {/* Title field */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Document Title
                                </label>
                                <div className="relative">
                                    <PencilLine className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Document title"
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                        className="pl-11 h-12 bg-white border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !title.trim()}
                                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-lg shadow-violet-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                <Check className="h-4 w-4" />
                                {saving ? 'Saving…' : 'Save title'}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-slate-100 px-3 text-slate-400">Danger Zone</span></div>
                            </div>

                            <button
                                onClick={() => setShowConfirmDelete(true)}
                                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-all active:scale-[0.98]"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete document
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm animate-bounce-subtle">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-black text-slate-800">Delete this document?</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                                    Are you sure you want to delete <span className="text-slate-900 font-bold">"{title}"</span>? This action is permanent and all associated data will be lost.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmDelete(false)}
                                    className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Go back
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-200 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {deleting ? 'Deleting…' : 'Delete Now'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
