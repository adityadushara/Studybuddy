'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { dashboardApi, documentsApi, DashboardStats, Document } from '@/lib/api'
import { formatDate, formatFileSize, formatDuration, cn } from '@/lib/utils'
import { FileText, Clock, TrendingUp, Upload, Brain, ChevronRight, Timer, Library, MoreVertical, Target, Edit2 } from 'lucide-react'
import StudyToolsModal from '@/components/StudyTools'
import PDFViewer from '@/components/PDFViewer'
import RenameDialog from '@/components/RenameDialog'
import DocumentSettingsModal from '@/components/DocumentSettingsModal'
import UploadModal from '@/components/UploadModal'
import LibraryModal from '@/components/LibraryModal'
import { useToast } from '@/components/ui/use-toast'

export default function DashboardPage() {
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const { user } = useAuth()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [recentDocs, setRecentDocs] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [renamingDoc, setRenamingDoc] = useState<Document | null>(null)
    const [settingsDoc, setSettingsDoc] = useState<Document | null>(null)
    const [isLibraryOpen, setIsLibraryOpen] = useState(false)
    const { toast } = useToast()

    const openDocument = (doc: Document) => {
        const docname = encodeURIComponent(doc.title || doc.filename)
        router.push(`/notes/${docname}`)
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const [statsData, docsData] = await Promise.all([
                dashboardApi.getStats(),
                documentsApi.list(),
            ])
            setStats(statsData)
            setRecentDocs(docsData.slice(0, 5))
        } catch {
            setStats({ total_documents: 0, total_folders: 0, study_sessions: 0, total_study_time: 0, recent_documents: [] })
            setRecentDocs([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        // Refresh when window gains focus or when a timer session is saved
        const handleRefresh = () => fetchData()
        window.addEventListener('focus', handleRefresh)
        window.addEventListener('asa-timer-session-saved', handleRefresh)
        return () => {
            window.removeEventListener('focus', handleRefresh)
            window.removeEventListener('asa-timer-session-saved', handleRefresh)
        }
    }, [])

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

    const statCards = [
        { label: 'Documents', value: stats?.total_documents ?? '0', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', sub: 'Total uploaded' },
        { label: 'Study Sessions', value: stats?.study_sessions ?? '0', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', sub: 'Completed' },
        { label: 'Time Studied', value: stats ? formatDuration(stats.total_study_time) : '0h', icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100', sub: 'Total focus time' },
    ]

    return (
        <div className="max-w-full space-y-6 animate-fade-in pb-8 relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-40 left-0 -z-10 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl opacity-50" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{greeting}, {user?.name?.split(' ')[0]}</h1>
                    <p className="text-base text-slate-500 font-medium mt-1">Ready to master something new today?</p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 rounded-xl h-11 px-6 font-bold flex items-center gap-2 btn-premium whitespace-nowrap">
                    <Upload className="h-5 w-5" /> Upload Document
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {statCards.map(({ label, value, icon: Icon, color, bg, sub }) => (
                    <Card key={label} className="bg-white/80 backdrop-blur-sm border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group/stat border-2">
                        <CardContent className="p-5 flex items-center gap-5 relative z-10">
                            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover/stat:rotate-3 group-hover/stat:scale-105`}>
                                <Icon className={`h-6 w-6 ${color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black tracking-tight text-slate-900 leading-none truncate mb-1">{loading ? '...' : value}</p>
                                    <p className="text-[10px] text-slate-500 font-medium truncate">{sub}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Documents */}
                <Card className="lg:col-span-2 bg-white border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b border-slate-50">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Library className="h-5 w-5 text-indigo-500" />
                            Recent Documents
                        </CardTitle>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsLibraryOpen(true)}
                            className="text-xs h-8 hover:bg-indigo-50 transition-all font-bold text-indigo-600 hover:text-indigo-700 px-4 rounded-xl border border-transparent hover:border-indigo-100"
                        >
                            View All Collection
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
                                ))}
                            </div>
                        ) : recentDocs.length === 0 ? (
                            <div className="text-center py-16 flex-1 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium">No documents yet. Start uploading!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 p-2">
                                {recentDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => openDocument(doc)}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group cursor-pointer active:scale-[0.99]"
                                    >
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm group-hover:scale-105 transition-transform">
                                            <FileText className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors mb-0.5">{doc.title || doc.filename}</p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:shadow-sm"
                                            onClick={e => { e.stopPropagation(); setSettingsDoc(doc) }}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Shortcuts & Settings */}
                <div className="space-y-6">
                    <Card className="bg-white border-slate-100 shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
                            <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Quick Tools</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            {[
                                { href: '/dashboard/goal', label: 'Set Learning Goal', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { href: '/dashboard/timer', label: 'Focus Timer', icon: Timer, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            ].map(({ href, label, icon: Icon, color, bg }) => (
                                <Link key={href} href={href} className="block">
                                    <div className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group cursor-pointer hover:-translate-y-0.5 hover:shadow-sm">
                                        <div className={cn("p-2.5 rounded-xl transition-colors shadow-sm border border-black/[0.03]", bg)}>
                                            <Icon className={`h-5 w-5 ${color} group-hover:scale-110 transition-transform`} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                                        <ChevronRight className="h-4 w-4 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <UploadModal open={isUploadOpen} onOpenChange={setIsUploadOpen} onSuccess={fetchData} />
            {selectedDoc && <StudyToolsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />}
            <RenameDialog document={renamingDoc} open={!!renamingDoc} onOpenChange={(v) => !v && setRenamingDoc(null)} onSuccess={fetchData} />
            <DocumentSettingsModal
                document={settingsDoc}
                open={!!settingsDoc}
                onOpenChange={v => !v && setSettingsDoc(null)}
                onOpenPDF={doc => openDocument(doc)}
                onOpenStudyTools={doc => setSelectedDoc(doc)}
                onDeleted={fetchData}
            />
            <LibraryModal 
                open={isLibraryOpen} 
                onOpenChange={setIsLibraryOpen} 
                onRefresh={fetchData} 
            />
        </div>
    )
}
