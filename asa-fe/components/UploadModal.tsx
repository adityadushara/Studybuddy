import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDropzone } from 'react-dropzone'
import { documentsApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export default function UploadModal({ open, onOpenChange, onSuccess }: UploadModalProps) {
    const [uploading, setUploading] = useState(false)
    const { toast } = useToast()

    const onDrop = useCallback(async (accepted: File[]) => {
        if (!accepted.length) return
        setUploading(true)
        const results = await Promise.allSettled(accepted.map(f => documentsApi.upload(f)))
        const succeeded = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length
        
        if (succeeded > 0) {
            toast({ title: `${succeeded} file${succeeded > 1 ? 's' : ''} uploaded!` })
            onSuccess()
            onOpenChange(false)
        }
        if (failed > 0) {
            toast({ title: `${failed} file${failed > 1 ? 's' : ''} failed`, variant: 'destructive' })
        }
        setUploading(false)
    }, [onSuccess, onOpenChange, toast])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Materials</DialogTitle>
                </DialogHeader>
                <div
                    {...getRootProps()}
                    className={cn(
                        "mt-4 relative group rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden pb-8",
                        isDragActive
                            ? "border-primary bg-primary/5 shadow-inner"
                            : "border-white/10 hover:border-white/30 hover:bg-white/5"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="p-8 flex flex-col items-center text-center gap-4 relative z-10">
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-primary/10 group-hover:scale-110",
                            isDragActive ? "text-primary scale-110" : "text-primary"
                        )}>
                            {uploading ? (
                                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <Upload className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{isDragActive ? 'Drop to upload' : uploading ? 'Uploading...' : 'Upload File'}</h2>
                            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Click or drag PDF/TXT files here.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
