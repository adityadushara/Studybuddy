'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { documentsApi, Document } from '@/lib/api'
import { formatDate, formatFileSize, cn } from '@/lib/utils'
import { 
    FileText, Search, MoreVertical, 
    ChevronRight, Calendar, Hash, Loader2, X 
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import DocumentSettingsModal from '@/components/DocumentSettingsModal'
import RenameDialog from '@/components/RenameDialog'
import StudyToolsModal from '@/components/StudyTools'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onRefresh: () => void
}

export default function LibraryModal({ open, onOpenChange, onRefresh }: Props) {
    const router = useRouter()
    const [docs, setDocs] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [settingsDoc, setSettingsDoc] = useState<Document | null>(null)
    const [renamingDoc, setRenamingDoc] = useState<Document | null>(null)
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await documentsApi.list()
            setDocs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        } catch (e) {
            setDocs([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) fetchData()
    }, [open])

    const filteredDocs = docs.filter(doc => 
        (doc.title || doc.filename).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openDocument = (doc: Document) => {
        const docname = encodeURIComponent(doc.title || doc.filename)
        router.push(`/notes/${docname}`)
        onOpenChange(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none rounded-[32px] gap-0 shadow-2xl">
                    <DialogHeader className="p-8 pb-4 border-b border-slate-200/60 bg-white flex-shrink-0">
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-between">
                            All Documents
                            <span className="text-xs bg-violet-100 text-violet-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{docs.length} Total</span>
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                            Browse and manage your entire study library.
                        </DialogDescription>
                        
                        <div className="mt-6 relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                            <Input 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name..." 
                                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-2xl text-sm font-semibold focus-visible:ring-violet-500/20 transition-all shadow-inner"
                            />
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                                <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
                                <p className="font-black text-slate-500 text-sm">LOADING LIBRARY...</p>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-60 text-center">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                                    <FileText className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">No documents found</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-[240px]">
                                    Try adjusting your search filter or upload a new file.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredDocs.map(doc => (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => openDocument(doc)}
                                        className="bg-white border border-slate-200/60 p-4 rounded-3xl hover:border-violet-500 hover:shadow-xl hover:shadow-violet-200/20 transition-all group cursor-pointer relative"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center border border-violet-100 group-hover:scale-110 transition-transform">
                                                <FileText className="h-6 w-6 text-violet-600" />
                                            </div>
                                            <div className="min-w-0 pr-6">
                                                <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-violet-700 transition-colors">
                                                    {doc.title || doc.filename}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                                                    {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            className="absolute right-3 top-3 h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-100 hover:text-slate-600"
                                            onClick={(e) => { e.stopPropagation(); setSettingsDoc(doc) }}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sub-modals for library item management */}
            <RenameDialog 
                document={renamingDoc} 
                open={!!renamingDoc} 
                onOpenChange={(v) => !v && setRenamingDoc(null)} 
                onSuccess={() => { fetchData(); onRefresh(); }} 
            />
            {selectedDoc && (
                <StudyToolsModal 
                    document={selectedDoc} 
                    onClose={() => setSelectedDoc(null)} 
                />
            )}
            <DocumentSettingsModal 
                document={settingsDoc} 
                open={!!settingsDoc} 
                onOpenChange={v => !v && setSettingsDoc(null)} 
                onOpenPDF={openDocument}
                onOpenStudyTools={doc => setSelectedDoc(doc)}
                onDeleted={() => { fetchData(); onRefresh(); }} 
            />
        </>
    )
}
