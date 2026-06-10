'use client'
import { useState, useEffect } from 'react'
import { Document, documentsApi } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
    document: Document
    onClose: () => void
}

export default function PDFViewer({ document, onClose }: PDFViewerProps) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let url = ''
        const loadPdf = async () => {
            try {
                setLoading(true)
                setError(null)

                const token = getToken()
                // We use the direct view URL which handles both query param and bearer token
                const response = await fetch(documentsApi.getUrl(document.id), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })

                if (!response.ok) {
                    throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`)
                }

                const blob = await response.blob()
                url = URL.createObjectURL(blob)
                setBlobUrl(url)
            } catch (err: any) {
                console.error('Error loading PDF:', err)
                setError(err.message || 'Failed to load document')
            } finally {
                setLoading(false)
            }
        }

        loadPdf()

        // Cleanup the object URL when component unmounts
        return () => {
            if (url) URL.revokeObjectURL(url)
        }
    }, [document.id])

    return (
        <Dialog open onOpenChange={v => { if (!v) onClose() }}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-5 w-5 text-violet-600 flex-shrink-0" />
                        <span className="truncate">{document.title || document.filename}</span>
                        {blobUrl && (
                            <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
                                <Button variant="ghost" size="sm" className="gap-1 text-xs flex-shrink-0">
                                    <ExternalLink className="h-3.5 w-3.5" /> Open
                                </Button>
                            </a>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 bg-muted/30 relative flex items-center justify-center min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground font-medium">Opening document...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-3 text-destructive p-8 text-center">
                            <AlertCircle className="h-12 w-12" />
                            <div>
                                <p className="font-semibold">Error Loading Viewer</p>
                                <p className="text-sm opacity-80">{error}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                Retry
                            </Button>
                        </div>
                    ) : blobUrl ? (
                        <iframe
                            src={`${blobUrl}#toolbar=0`}
                            className="w-full h-full border-0 absolute inset-0"
                            title={document.title || document.filename}
                        />
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    )
}
