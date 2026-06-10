'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    StickyNote, Plus, Trash2, Search, Clock,
    Brain, Sparkles, Layers, BookOpen, ScrollText,
    Loader2, ChevronRight, ChevronLeft,
    FileText, CheckCircle2, XCircle, RotateCcw,
    Copy, History, Radio, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, List, Table,
    Eye, ChevronDown, Sigma, Baseline, LayoutGrid,
    X, Mic, Subscript, Superscript, ListOrdered, Palette,
    Minus, Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { NotesSidebar } from '@/components/NotesSidebar'
import { aiApi, documentsApi, Document, Summary } from '@/lib/api'

/* ─────────────────────────── Types ─────────────────────────── */
interface Note {
    id: string
    title: string
    content: string
    updatedAt: string
}

/* ─────────────────────────── Helpers ───────────────────────── */
const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const fixEmojis = (html: string) => {
    if (!html) return html;
    // Basic regex to wrap common emoji ranges in a span for CSS targeting
    return html.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '<span class="emoji-fix">$1</span>');
}

/* ═══════════════════════ FORMATTING TOOLBAR ═══════════════════════ */
function FormatToolbar({ onFormat }: { onFormat: (cmd: string, val?: string) => void }) {
    const [font, setFont] = useState('Inter')
    const [fontSize, setFontSize] = useState(18)
    const [showFontMenu, setShowFontMenu] = useState(false)
    const fonts = ['Inter', 'Roboto', 'Outfit', 'Georgia', 'Arial', 'Clarika', 'Monospace']

    const Divider = () => <div className="w-[1px] h-4 bg-slate-200 mx-1.5" />
    const ToolBtn = ({ icon: Icon, cmd, title, val }: any) => (
        <button 
            onClick={() => onFormat(cmd, val)} 
            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all group relative"
            title={title}
        >
            <Icon className="h-4 w-4" />
        </button>
    )

    return (
        <div className="flex items-center gap-1 p-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 sticky top-0 z-50">
            <div className="relative flex-shrink-0">
                <button
                    onClick={() => setShowFontMenu(s => !s)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-black text-slate-700 transition-all border border-slate-100"
                >
                    <span className="truncate max-w-[80px] uppercase tracking-widest">{font}</span>
                    <ChevronDown className="h-3 w-3 opacity-30" />
                </button>
                {showFontMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                        {fonts.map(f => (
                            <button key={f} onClick={() => { setFont(f); setShowFontMenu(false); onFormat('fontName', f) }}
                                className={cn("w-full text-left px-5 py-2.5 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all", font === f ? "text-indigo-600 bg-indigo-50/50" : "text-slate-500")}>
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <Divider />
            
            <div className="flex items-center gap-1.5 px-1.5">
                <button onClick={() => { setFontSize(s => Math.max(12, s-1)); onFormat('fontSize', '3') }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Minus className="h-3 w-3"/></button>
                <span className="text-xs font-black text-slate-900 w-6 text-center">{fontSize}</span>
                <button onClick={() => { setFontSize(s => Math.min(32, s+1)); onFormat('fontSize', '5') }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><Plus className="h-3 w-3"/></button>
            </div>

            <Divider />
            
            <div className="flex items-center gap-0.5">
                <ToolBtn icon={Bold} cmd="bold" title="Bold" />
                <ToolBtn icon={Italic} cmd="italic" title="Italic" />
                <ToolBtn icon={Underline} cmd="underline" title="Underline" />
                <div className="relative group p-1.5 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                    <Baseline className="h-4 w-4 text-slate-400" />
                    <input type="color" onChange={(e) => onFormat('foreColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" title="Text Color" />
                </div>
            </div>

            <Divider />

            <div className="flex items-center gap-0.5">
                <ToolBtn icon={Type} cmd="formatBlock" val="h1" title="H1" />
                <ToolBtn icon={FileText} cmd="formatBlock" val="h2" title="H2" />
                <ToolBtn icon={List} cmd="insertUnorderedList" title="Bullets" />
                <ToolBtn icon={ListOrdered} cmd="insertOrderedList" title="Numbered" />
            </div>

            <Divider />
            
            <div className="flex items-center gap-0.5">
                <ToolBtn icon={AlignLeft} cmd="justifyLeft" title="Align Left" />
                <ToolBtn icon={AlignCenter} cmd="justifyCenter" title="Align Center" />
                <ToolBtn icon={Eye} cmd="preview" title="Toggle Preview" />
            </div>
        </div>
    )
}

/* ─────────────────────────── Inline Editor Component ─────────────────────────── */
function InlineEditor({ 
    initialContent, 
    onSave, 
    onCancel,
    onFormat 
}: { 
    initialContent: string, 
    onSave: (content: string) => void, 
    onCancel: () => void,
    onFormat: (cmd: string, val?: string) => void
}) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isPreview, setIsPreview] = useState(false)

    useEffect(() => {
        if (editorRef.current && !isPreview) {
            editorRef.current.innerHTML = (initialContent && initialContent !== 'undefined') ? initialContent : ''
            // Place cursor at end
            const range = document.createRange()
            const sel = window.getSelection()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            sel?.removeAllRanges()
            sel?.addRange(range)
            editorRef.current.focus()
        }
    }, [initialContent, isPreview])

    return (
        <div className="space-y-6 p-1 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Editor Active</span>
                    <h3 className="text-sm font-black text-slate-900">Refining Document Synthesis</h3>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsPreview(!isPreview)} 
                        className={cn("h-9 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest", isPreview ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400 hover:text-indigo-600")}
                    >
                        {isPreview ? <Eye className="h-3.5 w-3.5 mr-2" /> : <Baseline className="h-3.5 w-3.5 mr-2" />}
                        {isPreview ? 'Back to Edit' : 'Preview Mode'}
                    </Button>
                </div>
            </div>

            {isPreview ? (
                <div 
                    className="min-h-[600px] p-10 md:p-16 bg-slate-50 border-2 border-slate-100 rounded-[3rem] prose prose-slate prose-lg max-w-none 
                        prose-h1:text-5xl prose-h1:font-black prose-h1:tracking-tight prose-h1:mb-4 prose-h1:text-slate-900
                        prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-5 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100
                        prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-600 prose-h3:uppercase prose-h3:tracking-widest
                        prose-p:text-slate-600 prose-p:leading-[1.7] prose-p:text-lg prose-p:text-justify prose-p:my-2
                        prose-ul:my-2 prose-li:text-slate-600 prose-li:my-1
                        prose-hr:my-6 prose-hr:border-slate-200"
                    dangerouslySetInnerHTML={{ __html: fixEmojis(editorRef.current?.innerHTML || initialContent) }}
                />
            ) : (
                <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[700px] p-10 md:p-16 bg-white border-2 border-indigo-100 rounded-[3rem] outline-none focus:border-indigo-500 focus:bg-indigo-50/10 transition-all text-slate-700 leading-relaxed shadow-[0_16px_48px_-12px_rgba(79,70,229,0.1)]
                        prose prose-slate prose-lg max-w-none 
                        prose-h1:text-5xl prose-h1:font-black prose-h1:tracking-tight prose-h1:mb-10 prose-h1:text-slate-900
                        prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-12 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100
                        prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-600 prose-h3:uppercase prose-h3:tracking-widest
                        prose-p:text-slate-600 prose-p:leading-[1.8] prose-p:text-lg prose-p:text-justify prose-p:my-8
                        prose-ul:my-8 prose-li:text-slate-600 prose-li:my-2
                        prose-hr:my-12 prose-hr:border-slate-200
                        [&>*]:mb-8"
                />
            )}

            <div className="flex justify-end gap-3 mt-10">
                <Button variant="outline" size="sm" onClick={onCancel} className="rounded-2xl px-8 h-12 uppercase tracking-widest text-[11px] font-black border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-all">Discard</Button>
                <Button size="sm" onClick={() => onSave(editorRef.current?.innerHTML || '')} className="rounded-2xl px-12 h-12 uppercase tracking-widest text-[11px] font-black bg-slate-900 hover:bg-indigo-600 text-white shadow-2xl shadow-indigo-200 transition-all active:scale-95">Save Final Synthesis</Button>
            </div>
        </div>
    )
}

/* ═══════════════════════ MAIN PAGE ═════════════════════════ */
export default function DocNotesPage() {
    const params = useParams()
    const router = useRouter()
    const docName = decodeURIComponent(params.docname as string)

    const [summaryHistory, setSummaryHistory] = useState<{id: string, date: string, data: Summary}[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [search, setSearch] = useState('')
    const [matchedDoc, setMatchedDoc] = useState<Document | null>(null)
    const [activeSection, setActiveSection] = useState('document')
    const { toast } = useToast()

    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryData, setSummaryData] = useState<Summary | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const saveCurrentSummaryToHistory = useCallback((data: Summary) => {
        const historyKey = `summary_history_${docName}_v2`
        const saved = localStorage.getItem(historyKey)
        const currentHistory = saved ? JSON.parse(saved) : []
        
        // Find if this specific data already exists in history (by matching topic_name)
        const existingIdx = currentHistory.findIndex((h: any) => h.data.topic_name === data.topic_name && h.docId === matchedDoc?.id)
        
        if (existingIdx !== -1) {
            currentHistory[existingIdx].data = data
            currentHistory[existingIdx].date = new Date().toISOString()
            localStorage.setItem(historyKey, JSON.stringify(currentHistory))
            setSummaryHistory(currentHistory.filter((h: any) => h.docId === matchedDoc?.id))
        } else if (matchedDoc?.id) {
            const newItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                docId: matchedDoc.id,
                data
            }
            const updated = [newItem, ...currentHistory]
            localStorage.setItem(historyKey, JSON.stringify(updated))
            setSummaryHistory(updated.filter((h: any) => h.docId === matchedDoc?.id))
        }
    }, [docName, matchedDoc?.id])

    const handleGenerateSummary = async () => {
        if (!matchedDoc?.id) return toast({ title: 'Wait for document to load', variant: 'default' } as any)
        setSummaryLoading(true)
        try {
            const data = await aiApi.getSummary(matchedDoc.id, 'detailed')
            
            // Check for empty content
            if (!data.content || data.content.trim().length < 20 || data.content === 'undefined') {
                 toast({ 
                    title: 'Analysis incomplete', 
                    description: 'The AI returned insufficient data. Please try again with a different document or focal topic.',
                    variant: 'destructive' 
                } as any)
                setSummaryLoading(false)
                return
            }

            setSummaryData(data)
            
            const newHistoryItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                docId: matchedDoc.id,
                data
            }
            const historyKey = `summary_history_${docName}_v2`
            const saved = localStorage.getItem(historyKey)
            const currentHistory = saved ? JSON.parse(saved) : []
            const updatedHistory = [newHistoryItem, ...currentHistory]
            setSummaryHistory(updatedHistory)
            localStorage.setItem(historyKey, JSON.stringify(updatedHistory))
            toast({ title: 'Generated & saved to history!', variant: 'default' } as any)
        } catch (e) {
            toast({ title: 'System Error', description: 'Failed to communicate with AI Synthesis engine.', variant: 'destructive' } as any)
        } finally {
            setSummaryLoading(false)
        }
    }

    const clearHistory = () => {
        const historyKey = `summary_history_${docName}_v2`
        localStorage.removeItem(historyKey)
        setSummaryHistory([])
        setSummaryData(null)
        toast({ title: 'Summary history cleared' } as any)
    }

    const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const historyKey = `summary_history_${docName}_v2`
        const saved = localStorage.getItem(historyKey)
        if (!saved) return
        try {
            const allHistory = JSON.parse(saved)
            const filtered = allHistory.filter((item: any) => item.id !== id)
            localStorage.setItem(historyKey, JSON.stringify(filtered))
            setSummaryHistory(filtered.filter((item: any) => matchedDoc && item.docId === matchedDoc.id))
            if (summaryHistory.find(item => item.id === id)?.data.topic_name === summaryData?.topic_name) {
                 setSummaryData(null)
            }
            toast({ title: 'Summary deleted!' } as any)
        } catch (e) {}
    }

    useEffect(() => {
        if (!matchedDoc) return
        const historyKey = `summary_history_${docName}_v2`
        const saved = localStorage.getItem(historyKey)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                const relevant = parsed.filter((item: any) => 
                    item.docId === matchedDoc.id && 
                    item.data && 
                    item.data.topic_name &&
                    item.data.content
                )
                setSummaryHistory(relevant)
                if (relevant.length > 0 && !summaryData) {
                    setSummaryData(relevant[0].data)
                }
            } catch (e) {
                console.error('Failed to parse history', e)
            }
        }
    }, [docName, matchedDoc, summaryData])

    useEffect(() => {
        documentsApi.list().then(docs => {
            const match = docs.find(d => (d.title || d.filename).toLowerCase() === docName.toLowerCase())
            setMatchedDoc(match || null)
        })
    }, [docName])

    const handleFormat = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val)
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            <NotesSidebar docName={docName} activeSection={activeSection} />

            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <div className="h-20 border-b border-slate-200/60 px-8 flex items-center justify-between flex-shrink-0 bg-white/70 backdrop-blur-xl z-20 shadow-sm">
                    <div className="flex items-center gap-4 min-w-0">
                        <button onClick={() => router.back()} className="h-10 w-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group">
                            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/80 mb-0.5">Study Companion</span>
                            <h2 className="text-sm font-black text-slate-900 truncate max-w-[300px]">{docName}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowHistory(!showHistory)} 
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl h-10 border-slate-200 bg-white/50 hover:bg-white transition-all", 
                                showHistory && "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 shadow-lg shadow-indigo-100"
                            )}
                        >
                            <History className="h-4 w-4" /> Versions ({summaryHistory.length})
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {/* History Sidebar */}
                    {showHistory && (
                        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/90 backdrop-blur-2xl border-l border-slate-200/60 shadow-[0_0_50px_rgba(0,0,0,0.05)] z-40 flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Analysis History</h3>
                                <div className="flex gap-1">
                                    <button onClick={clearHistory} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all" title="Clear All History"><Trash2 className="h-4 w-4" /></button>
                                    <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"><X className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {summaryHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                                            <History className="w-5 h-5 text-slate-300" />
                                        </div>
                                        <p className="text-xs font-medium text-slate-400">No past versions found</p>
                                    </div>
                                ) : (
                                    summaryHistory.map((item) => (
                                        <div key={item.id} className="relative group/item">
                                            <button 
                                                onClick={() => { setSummaryData(item.data); setShowHistory(false); }} 
                                                className={cn(
                                                    "w-full text-left p-5 rounded-2xl border-2 transition-all duration-300", 
                                                    summaryData?.topic_name === item.data.topic_name && summaryData?.word_count === item.data.word_count
                                                        ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200 text-white" 
                                                        : "bg-white border-slate-50 hover:border-indigo-100 hover:bg-slate-50 text-slate-700"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-2 opacity-60">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{timeAgo(item.date)}</span>
                                                </div>
                                                <p className="text-sm font-black line-clamp-2 leading-tight">{item.data.topic_name}</p>
                                                <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-2", summaryData?.topic_name === item.data.topic_name ? "text-white/60" : "text-slate-400")}>
                                                    {item.data.word_count} Words
                                                </p>
                                            </button>
                                            <button onClick={(e) => deleteHistoryItem(item.id, e)} className="absolute top-3 right-3 p-1.5 bg-white/20 backdrop-blur-md rounded-lg shadow-sm text-white/40 opacity-0 group-hover/item:opacity-100 transition-all hover:text-red-400 hover:bg-white/40">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/50">
                        <div className="w-full max-w-5xl mx-auto px-6 md:px-12 py-10 flex flex-col">
                            
                            {/* Controls Bar */}
                            <div className="w-full flex items-center justify-between mb-8">
                                <div className="flex flex-col">
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                                            <ScrollText className="w-6 h-6" />
                                        </div>
                                        Document Analysis
                                    </h1>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Study Companion v3.0 Powered by AI</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleGenerateSummary} disabled={summaryLoading || !matchedDoc} className="h-11 px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all active:scale-95 group">
                                        {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                        {summaryData ? 'Regenerate Analysis' : 'Synthesize Research'}
                                    </Button>
                                </div>
                            </div>

                            {!summaryLoading && !summaryData ? (
                                <div className="w-full h-[600px] bg-white/40 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 group hover:border-indigo-200 hover:bg-white/60 transition-all duration-500">
                                    <div className="relative mb-8">
                                        <Brain className="w-16 h-16 text-slate-200 group-hover:text-indigo-200 transition-colors" />
                                        <Plus className="w-6 h-6 text-indigo-400 absolute -bottom-1 -right-1 animate-bounce" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-300 tracking-tight group-hover:text-slate-500 transition-colors">Awaiting Analysis.</h3>
                                    <p className="text-slate-400 font-medium max-w-xs mt-4 text-sm leading-relaxed">Click 'AI Analysis Start' to transform this document into an exhaustive, structured study guide.</p>
                                    <div className="mt-10 flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse delay-75" />
                                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse delay-150" />
                                    </div>
                                </div>
                            ) : summaryLoading ? (
                                <div className="w-full h-[600px] bg-white border border-slate-100 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] flex flex-col items-center justify-center text-center p-12 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="relative mb-10">
                                        <div className="w-24 h-24 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                                        <Sparkles className="w-10 h-10 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Synthesizing Report</h3>
                                    <div className="flex items-center gap-2 mt-4">
                                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Processing exhaustive content...</p>
                                    </div>
                                </div>
                            ) : (
                                summaryData && (
                                    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
                                        {/* THE PAPER SHEET */}
                                        <div className="bg-white shadow-[0_32px_96px_-16px_rgba(0,0,0,0.1)] rounded-xl border border-slate-200 min-h-[1100px] relative overflow-hidden flex flex-col transition-all">
                                            
                                            {/* Toolbar overlay if editing */}
                                            {editingId === 'unified' && (
                                                <div className="sticky top-0 z-50 p-2 shadow-sm bg-white/80 backdrop-blur-md border-b border-slate-100">
                                                    <FormatToolbar onFormat={handleFormat} />
                                                </div>
                                            )}

                                            <div className="flex-1 p-10 md:p-16 relative group/page">
                                                {editingId === 'unified' ? (
                                                    <InlineEditor 
                                                        initialContent={summaryData.content}
                                                        onSave={(val) => {
                                                            const newData = { ...summaryData, content: val }
                                                            setSummaryData(newData)
                                                            saveCurrentSummaryToHistory(newData)
                                                            setEditingId(null)
                                                        }}
                                                        onCancel={() => setEditingId(null)}
                                                        onFormat={handleFormat}
                                                    />
                                                ) : (
                                                    <div 
                                                        onDoubleClick={() => setEditingId('unified')}
                                                        className="prose prose-slate prose-lg max-w-none 
                                                            prose-h1:text-5xl prose-h1:font-black prose-h1:tracking-tight prose-h1:mb-4 prose-h1:text-slate-900
                                                            prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-5 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100
                                                            prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-600 prose-h3:uppercase prose-h3:tracking-widest
                                                            prose-p:text-slate-600 prose-p:leading-[1.7] prose-p:text-lg prose-p:text-justify prose-p:my-2
                                                            prose-ul:my-2 prose-li:text-slate-600 prose-li:my-1
                                                            prose-hr:my-6 prose-hr:border-slate-200
                                                        "
                                                    >
                                                        <div 
                                                            className="summary-doc-content" 
                                                            dangerouslySetInnerHTML={{ 
                                                                __html: (summaryData.content && summaryData.content !== 'undefined') 
                                                                    ? fixEmojis(summaryData.content) 
                                                                    : '<p class="text-slate-400 italic">No content found in this version. Try regenerating to build a new analysis.</p>' 
                                                            }} 
                                                        />
                                                        
                                                        <div className="absolute top-10 right-10 flex gap-2 opacity-0 group-hover/page:opacity-100 transition-all">
                                                            <Button 
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    const text = summaryData.content.replace(/<[^>]*>/g, '');
                                                                    navigator.clipboard.writeText(text);
                                                                    toast({ title: 'Copied to clipboard' } as any);
                                                                }} 
                                                                className="h-10 w-10 p-0 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-indigo-600 shadow-xl"
                                                                title="Copy to Clipboard"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>


                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
