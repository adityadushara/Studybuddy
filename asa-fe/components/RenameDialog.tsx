'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { documentsApi, Document } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Props {
    document: Document | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export default function RenameDialog({ document, open, onOpenChange, onSuccess }: Props) {
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (document) {
            setTitle(document.title || document.filename)
        }
    }, [document])

    const handleSave = async () => {
        if (!document || !title.trim()) return
        setLoading(true)
        try {
            await documentsApi.rename(document.id, title.trim())
            toast({ title: 'Document renamed' } as any)
            onSuccess()
            onOpenChange(false)
        } catch {
            toast({ title: 'Failed to rename document', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-[#0f0f0f] border border-white/[0.08] shadow-2xl shadow-black/60 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight text-white">Rename Document</DialogTitle>
                    <DialogDescription className="text-white/50">
                        Enter a new name for your document.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Document title"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="bg-white/[0.06] border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}
                        className="bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]">
                        Cancel
                    </Button>
                    <Button variant="gradient" onClick={handleSave} loading={loading} disabled={!title.trim()}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
