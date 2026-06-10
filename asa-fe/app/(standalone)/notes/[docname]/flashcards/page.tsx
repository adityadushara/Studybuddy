'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NotesSidebar } from '@/components/NotesSidebar'
import { aiApi, documentsApi, Document } from '@/lib/api'
import { 
    ChevronLeft, Sparkles, Layers, Loader2, ArrowRight, ArrowLeft, 
    RefreshCcw, Plus, Edit2, Check, Trash2, Orbit, Brain, Star, AlertTriangle, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import ReactMarkdown from 'react-markdown'

type FlashcardStatus = 'learning' | 'learned'

interface StudyCard {
    id: string
    front: string
    back: string
    status: FlashcardStatus
    reviewCount: number
    lastReviewedAt?: string
    createdAt: string
    updatedAt: string
    difficulty?: string
    topic?: string
    isStarred?: boolean
}

const MODES = [
    { id: 'Quick review', label: 'Quick Review', desc: '10 flashcards', count: 10 },
    { id: 'Standard set', label: 'Standard Set', desc: '20 flashcards', count: 20 },
    { id: 'Comprehensive', label: 'Comprehensive', desc: '30 flashcards', count: 30 },
    { id: 'Deep dive', label: 'Deep Dive', desc: '50 flashcards', count: 50 },
]

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

const FlashcardSection = ({ 
    title, 
    cards, 
    statusColor,
    dotColor,
    emptyMessage, 
    isEditingMode, 
    handleUpdateCard, 
    toggleStarCard, 
    deleteCard 
}: any) => {
    return (
        <div className="mb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-gray-200 flex-1" />
                <h4 className={cn("text-sm font-bold uppercase tracking-widest flex items-center gap-2", statusColor)}>
                    {title}
                    <span className="bg-black/5 px-2 py-0.5 rounded-full text-[10px]">{(cards?.length || 0)} {(cards?.length === 1) ? 'card' : 'cards'}</span>
                </h4>
                <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* List */}
            {cards.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    {emptyMessage}
                </div>
            ) : (
                <div className="space-y-4">
                    {cards.map((card: StudyCard) => (
                        <div key={card.id} className={cn(
                            "bg-white border text-sm rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-all relative overflow-hidden group", 
                            isEditingMode ? "ring-2 ring-indigo-500/20 border-indigo-300" : "shadow-sm hover:shadow-md border-slate-200",
                            card.isStarred ? "bg-amber-50/50 border-amber-200" : ""
                        )}>
                            {/* CARD ACTIONS */}
                            <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
                                <button 
                                    onClick={(e) => deleteCard(card.id, e)} 
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all md:opacity-0 group-hover:opacity-100"
                                    title="Delete flashcard"
                                >
                                    <Trash2 className="w-4 h-4 transition-colors" />
                                </button>
                                <button 
                                    onClick={(e) => toggleStarCard(card.id, e)} 
                                    className="p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                                    title={card.isStarred ? "Unstar" : "Star"}
                                >
                                    <Star className={cn("w-4 h-4 transition-colors", card.isStarred ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-400")} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-3 relative pr-16 md:pr-24">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2 mb-2">
                                    <span className={cn("w-2 h-2 rounded-full", dotColor)} />
                                    Front {card.reviewCount > 0 && <span className="opacity-50 lowercase">({card.reviewCount} {card.reviewCount === 1 ? 'review' : 'reviews'})</span>}
                                </div>
                                {isEditingMode ? (
                                    <textarea 
                                        value={card.front} 
                                        onChange={(e) => handleUpdateCard(card.id, 'front', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium min-h-[80px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-inner"
                                    />
                                ) : (
                                    <div className="font-bold text-base text-slate-900 leading-relaxed">{card.front}</div>
                                )}
                            </div>
                            <div className="hidden md:block w-px bg-slate-100" />
                            <div className="flex-1 space-y-3">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 mb-2">Back</div>
                                {isEditingMode ? (
                                    <textarea 
                                        value={card.back} 
                                        onChange={(e) => handleUpdateCard(card.id, 'back', e.target.value)}
                                        className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-sm font-medium min-h-[80px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-inner"
                                    />
                                ) : (
                                    <div className="text-slate-600 prose prose-slate prose-sm max-w-none"><ReactMarkdown>{card.back}</ReactMarkdown></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FlashcardsPage() {
    const params = useParams()
    const router = useRouter()
    const docName = decodeURIComponent(params.docname as string)
    const { toast } = useToast()
    const storageKey = `flashcards_deck_v4_${docName}`

    const [matchedDoc, setMatchedDoc] = useState<Document | null>(null)
    const [cards, setCards] = useState<StudyCard[]>([])
    
    // Generate UI
    const [selectedMode, setSelectedMode] = useState(MODES[1])
    const [instructions, setInstructions] = useState('')
    const [loading, setLoading] = useState(false)
    const [isGeneratingMore, setIsGeneratingMore] = useState(false)
    
    // Study UI
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | FlashcardStatus | 'starred'>('all')
    const [isEditingMode, setIsEditingMode] = useState(false)
    const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [cardToDeleteId, setCardToDeleteId] = useState<string | null>(null)

    const [hasReviewedCurrent, setHasReviewedCurrent] = useState(false)

    useEffect(() => {
        setHasReviewedCurrent(false)
    }, [currentIndex])

    // On mount, load cards from deck
    useEffect(() => {
        documentsApi.list().then(docs => {
            const sorted = [...docs].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const match = sorted.find(d => (d.title || d.filename).toLowerCase() === docName.toLowerCase())
            setMatchedDoc(match || null)
        }).catch(() => setMatchedDoc(null))
    }, [docName])

    // Load cards when matchedDoc is ready
    useEffect(() => {
        if (!matchedDoc) return
        try {
            const key = `flashcards_deck_v4_${docName}`
            const saved = localStorage.getItem(key)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Filter to ONLY cards belonging to THIS specific document ID
                const relevant = parsed.filter((c: any) => c.docId === matchedDoc.id)
                setCards(relevant)
            } else {
                setCards([])
            }
        } catch(e) {}
    }, [matchedDoc, docName])

    const saveCardsToStorage = useCallback((newCards: StudyCard[]) => {
        if (!matchedDoc) return
        try {
            setSaveState('saving')
            const key = `flashcards_deck_v4_${docName}`
            const saved = localStorage.getItem(key)
            const allCards = saved ? JSON.parse(saved) : []
            
            // Reconstruct total storage: keep others, update these
            const others = allCards.filter((c: any) => c.docId !== matchedDoc.id)
            const updatedThese = newCards.map(c => ({ ...c, docId: matchedDoc.id }))
            
            localStorage.setItem(key, JSON.stringify([...others, ...updatedThese]))
            setCards(newCards)
            setTimeout(() => setSaveState('saved'), 500)
        } catch(e) {
            setSaveState('error')
        }
    }, [docName, matchedDoc])

    // Sort Logic: Starred first, then by createdAt DESC (STABLE during session)
    const sortedCards = [...cards].sort((a, b) => {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const filteredCards = sortedCards.filter(c => {
        if (activeTab === 'all') return true;
        if (activeTab === 'starred') return c.isStarred;
        return c.status === activeTab;
    });

    const currentCard = filteredCards[currentIndex]

    const handleFlip = () => {
        const willFlip = !isFlipped
        setIsFlipped(willFlip)
        
        // Handle increment logic only when revealing the answer (flipping to back)
        if (willFlip && currentCard && !hasReviewedCurrent) {
            setHasReviewedCurrent(true)
            
            const newReviewCount = (currentCard.reviewCount || 0) + 1
            const newStatus = newReviewCount >= 2 ? 'learned' : 'learning'
            
            const next = cards.map(c => c.id === currentCard.id ? { 
                ...c, 
                reviewCount: newReviewCount,
                status: newStatus as FlashcardStatus,
                lastReviewedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as StudyCard : c)
            
            saveCardsToStorage(next)
        }
    }

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditingMode || cards.length === 0) return
            // Don't trigger if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
            
            if (e.code === 'Space') {
                e.preventDefault()
                handleFlip()
            } else if (e.code === 'ArrowRight') {
                e.preventDefault()
                setIsFlipped(false)
                setCurrentIndex(i => (i + 1) % filteredCards.length)
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault()
                setIsFlipped(false)
                setCurrentIndex(i => (i - 1 + filteredCards.length) % filteredCards.length)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })

    const handleGenerate = async () => {
        if (!matchedDoc) return
        setLoading(true)
        try {
            const res = await aiApi.getFlashcards(matchedDoc.id, selectedMode.count, selectedMode.id, instructions.trim() || undefined)
            const newCards: StudyCard[] = res.flashcards.map((f: any) => ({
                id: generateId(),
                front: f.front,
                back: f.back,
                status: 'learning' as FlashcardStatus,
                reviewCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                difficulty: f.difficulty,
                topic: f.topic,
                isStarred: false
            }))
            saveCardsToStorage(newCards)
            setHasReviewedCurrent(false)
            setCurrentIndex(0)
            setIsFlipped(false)
            toast({ title: 'Generated Flashcards Deck!' })
        } catch (e) {
            toast({ title: 'Failed to generate flashcards', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateMore = async () => {
        if (!matchedDoc) return
        setIsGeneratingMore(true)
        try {
            const extraInstructions = instructions.trim() ? instructions.trim() + ". Ensure new different flashcards." : "Generate new and different flashcards."
            const res = await aiApi.getFlashcards(matchedDoc.id, 10, "Add More", extraInstructions)
            if (!res.flashcards || res.flashcards.length === 0) return
            
            const added: StudyCard[] = res.flashcards.map((f: any) => ({
                id: generateId(),
                front: f.front,
                back: f.back,
                status: 'learning' as FlashcardStatus,
                reviewCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                difficulty: f.difficulty,
                topic: f.topic,
                isStarred: false
            }))
            
            saveCardsToStorage([...cards, ...added])
            toast({ title: `Added ${added.length} new flashcards!` })
        } catch (e) {
            toast({ title: 'Failed to add more flashcards', variant: 'destructive' })
        } finally {
            setIsGeneratingMore(false)
        }
    }

    const handleManualStatus = (status: FlashcardStatus) => {
        if (!currentCard) return
        const reviewCount = status === 'learned' ? 2 : 1
        
        const next = cards.map(c => c.id === currentCard.id ? { 
            ...c, 
            status, 
            reviewCount,
            lastReviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString() 
        } as StudyCard : c)
        
        saveCardsToStorage(next)
        
        // Auto advance
        setIsFlipped(false)
        if (currentIndex < filteredCards.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            setCurrentIndex(0)
            if (filteredCards.length > 1) {
                toast({ title: "Looped back to the start of the deck!" })
            }
        }
    }

    // CRUD Updates
    const handleUpdateCard = (id: string, field: 'front' | 'back', val: string) => {
        const next = cards.map(c => c.id === id ? { 
            ...c, 
            [field]: val, 
            status: 'learning' as FlashcardStatus,
            reviewCount: 0,
            updatedAt: new Date().toISOString() 
        } as StudyCard : c)
        saveCardsToStorage(next)
    }

    const toggleStarCard = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        const next = cards.map(c => c.id === id ? {
            ...c,
            isStarred: !c.isStarred,
            updatedAt: new Date().toISOString() 
        } : c)
        saveCardsToStorage(next)
    }

    const deleteCard = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setCardToDeleteId(id)
        setIsDeleteModalOpen(true)
    }

    const confirmDeleteCard = (id: string) => {
        const cardToDelete = cards.find(c => c.id === id)
        const next = cards.filter(c => c.id !== id)
        saveCardsToStorage(next)

        // Ensure currentIndex stays within bounds of the newly filtered list
        setCurrentIndex(curr => {
            const newFilteredLength = filteredCards.filter(c => c.id !== id).length
            return Math.max(0, Math.min(curr, newFilteredLength - 1))
        })

        toast({ 
            title: "Flashcard deleted",
            description: (
                <div 
                    className="cursor-pointer text-sm font-bold text-primary hover:underline mt-1"
                    onClick={() => saveCardsToStorage([...next, cardToDelete as StudyCard])}
                >
                    Undo removal
                </div>
            )
        })
    }

    const createEmptyCard = () => {
        const empty: StudyCard = {
            id: generateId(),
            front: '',
            back: '',
            status: 'learning' as FlashcardStatus,
            reviewCount: 0,
            isStarred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        saveCardsToStorage([...cards, empty])
        setIsEditingMode(true)
        setActiveTab('all')
        setCurrentIndex(0)
    }

    // Prepare Section Data
    const learningCards = sortedCards.filter(c => c.status === 'learning' && (activeTab === 'starred' ? c.isStarred : true))
    const learnedCards = sortedCards.filter(c => c.status === 'learned' && (activeTab === 'starred' ? c.isStarred : true))

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <NotesSidebar docName={docName} activeSection="flashcards" />

            <div key={matchedDoc?.id} className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Top bar */}
                <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push(`/notes/${docName}`)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-base font-bold truncate text-slate-900">{docName} <span className="text-slate-300 mx-2">/</span> Flashcards</span>
                        {saveState === 'saving' && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-3 bg-slate-100 px-2 py-1 rounded-full animate-pulse">Saving</span>}
                    </div>
                    {cards.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={createEmptyCard}
                                className="h-9 text-xs bg-white hover:bg-slate-50 text-slate-700 px-4 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-wider border border-slate-200 shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> New Card
                            </button>
                            <button 
                                onClick={handleGenerateMore}
                                disabled={isGeneratingMore}
                                className="h-9 text-xs bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/25 disabled:opacity-50 btn-premium"
                            >
                                {isGeneratingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                                Auto-Add 10
                            </button>
                            <button 
                                onClick={() => { setCardToDeleteId(null); setIsDeleteModalOpen(true); }}
                                className="h-9 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-4 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-wider border border-red-200 shadow-sm ml-2"
                            >
                                <Trash2 className="w-4 h-4" /> Clear Deck
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                    
                    {/* NO CARDS YET -> GEN UI */}
                    {cards?.length === 0 ? (
                        <div className="max-w-4xl mx-auto p-8 md:p-12 pb-20">
                            {!matchedDoc ? (
                                <div className="flex flex-col items-center justify-center mt-32 text-slate-500 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                                    <span className="font-bold text-lg tracking-tight">Loading document context...</span>
                                </div>
                            ) : loading ? (
                                <div className="flex flex-col items-center justify-center mt-32 text-center animate-in fade-in duration-500 bg-white border border-slate-100 shadow-xl shadow-indigo-900/5 rounded-[3rem] p-24">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8 border border-indigo-100 shadow-sm">
                                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-4 tracking-tight text-slate-900">Crafting your flashcards...</h3>
                                    <p className="text-lg font-medium text-slate-500 max-w-sm animate-pulse">
                                        Extracting key definitions and concepts based on your settings.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
                                    <div className="text-center space-y-5">
                                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                                            <Layers className="w-10 h-10" />
                                        </div>
                                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Generate Flashcards</h1>
                                        <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
                                            Customize how you want your study cards generated from <span className="text-indigo-600 font-bold">{docName}</span>.
                                        </p>
                                    </div>

                                    <div className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-indigo-900/5">
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center justify-between">
                                                Select Mode
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {MODES.map((mode) => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setSelectedMode(mode)}
                                                        className={cn(
                                                            "p-5 rounded-2xl border text-left transition-all duration-200",
                                                            selectedMode.id === mode.id
                                                                ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20"
                                                                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                        )}
                                                    >
                                                        <div className={cn("text-base font-bold mb-1", selectedMode.id === mode.id ? "text-indigo-700" : "text-slate-900")}>{mode.label}</div>
                                                        <div className={cn("text-sm font-medium", selectedMode.id === mode.id ? "text-indigo-500/80" : "text-slate-500")}>{mode.desc}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center justify-between">
                                                Special Instructions <span className="text-[10px] font-bold tracking-widest bg-slate-100 px-2 py-1 rounded-full text-slate-400">Optional</span>
                                            </label>
                                            <textarea
                                                value={instructions}
                                                onChange={(e) => setInstructions(e.target.value)}
                                                placeholder="E.g., Focus heavily on formulas and dates..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all min-h-[120px] text-slate-900 shadow-inner"
                                            />
                                        </div>

                                        <button 
                                            onClick={handleGenerate}
                                            className="w-full h-16 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 text-lg active:scale-[0.98] transition-all btn-premium"
                                        >
                                            <Sparkles className="w-6 h-6" /> Generate Now
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 pb-32">
                            
                            {/* STUDY VIEW */}
                            <div className="max-w-4xl mx-auto">

                                {/* Status Tabs */}
                                <div className="flex items-center gap-2 mb-10 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto">
                                    {[
                                        { id: 'all', label: 'All Cards', count: cards.length },
                                        { id: 'starred', label: 'Starred', count: cards.filter(c => c.isStarred).length },
                                        { id: 'learning', label: 'Learning', count: cards.filter(c => c.status === 'learning').length },
                                        { id: 'learned', label: 'Learnt', count: cards.filter(c => c.status === 'learned').length },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setActiveTab(tab.id as any); setCurrentIndex(0); setIsFlipped(false); }}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-3",
                                                activeTab === tab.id ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:bg-slate-50 border border-transparent"
                                            )}
                                        >
                                            {tab.label} <span className="text-[10px] bg-slate-200/50 px-2.5 py-1 rounded-full">{tab.count}</span>
                                        </button>
                                    ))}
                                </div>

                                {filteredCards.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white text-slate-400 font-bold mb-12 shadow-sm">
                                        <Orbit className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
                                        <span className="uppercase tracking-widest text-sm">No cards in this category</span>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 mb-16">
                                        {/* Progress header */}
                                        <div className="flex items-center justify-between mb-6 px-2">
                                            <div className="space-y-1">
                                                <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 uppercase">
                                                    Study: {activeTab}
                                                    {currentCard?.isStarred && <Star className="w-6 h-6 fill-amber-400 text-amber-500 ml-1" />}
                                                </h2>
                                                <p className="text-indigo-600 text-sm font-bold uppercase tracking-widest">
                                                    Card {currentIndex + 1} of {filteredCards?.length || 0}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => { setIsFlipped(false); setCurrentIndex(i => (i - 1 + filteredCards.length) % filteredCards.length); }}
                                                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 text-slate-600 active:scale-95"
                                                >
                                                    <ArrowLeft className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => { setIsFlipped(false); setCurrentIndex(i => (i + 1) % filteredCards.length); }}
                                                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center transition-all hover:bg-slate-50 hover:border-slate-300 text-slate-600 active:scale-95"
                                                >
                                                    <ArrowRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Flipper */}
                                        <div className="relative [perspective:1000px] w-full min-h-[400px] cursor-pointer group" onClick={handleFlip}>
                                            <div 
                                                key={currentCard?.id}
                                                className={cn(
                                                    "w-full h-full min-h-[400px] transition-transform duration-700 ease-in-out [transform-style:preserve-3d] relative",
                                                    isFlipped ? "[transform:rotateY(180deg)]" : ""
                                                )}
                                            >
                                                 {/* FRONT */}
                                                 <div className={cn(
                                                     "absolute inset-0 [backface-visibility:hidden] w-full h-full border rounded-[3rem] p-12 flex flex-col justify-center items-center text-center shadow-2xl transition-all duration-500 hover:shadow-indigo-500/10",
                                                     currentCard?.isStarred ? "bg-amber-50/80 border-amber-200 shadow-amber-900/5" : "bg-white/90 border-slate-100 shadow-indigo-900/5",
                                                     "backdrop-blur-sm"
                                                 )}>
                                                     <div className="absolute top-8 left-8 text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-indigo-500/80">
                                                         <Layers className="w-5 h-5" /> Question
                                                     </div>

                                                     <div className="absolute top-8 right-8 flex items-center gap-3 z-10">
                                                         {currentCard?.topic && (
                                                             <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl px-4 py-1.5 font-bold tracking-wider uppercase text-[9px] text-indigo-600 shadow-sm backdrop-blur-md">
                                                                 {currentCard.topic}
                                                             </div>
                                                         )}
                                                         {currentCard?.difficulty && (
                                                             <div className={cn(
                                                                 "rounded-xl px-3 py-1.5 font-black tracking-widest uppercase text-[9px] shadow-sm border",
                                                                 currentCard.difficulty === 'easy' ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : 
                                                                 currentCard.difficulty === 'medium' ? "bg-amber-50 text-amber-600 border-amber-100/50" : 
                                                                 "bg-rose-50 text-rose-600 border-rose-100/50"
                                                             )}>
                                                                 {currentCard.difficulty}
                                                             </div>
                                                         )}
                                                         <button 
                                                             onClick={(e) => toggleStarCard(currentCard?.id, e)} 
                                                             className="p-2.5 rounded-xl hover:bg-slate-50 transition-all text-slate-300 hover:text-amber-400 bg-white border border-slate-100 shadow-sm"
                                                             title={currentCard?.isStarred ? "Unstar" : "Star"}
                                                         >
                                                             <Star className={cn("w-5 h-5 transition-colors", currentCard?.isStarred ? "fill-amber-400 text-amber-500" : "")} />
                                                         </button>
                                                     </div>
                                                     
                                                     <div className="flex flex-col items-center gap-8 w-full">
                                                         <h3 className="text-3xl md:text-5xl font-black leading-tight text-slate-900 max-w-3xl px-6 tracking-tight drop-shadow-sm">
                                                             {currentCard?.front}
                                                         </h3>
                                                     </div>
                                                     
                                                     <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-bounce-subtle">
                                                         <span className="text-[10px] font-black tracking-[0.2em] uppercase bg-black text-white px-6 py-2.5 rounded-full shadow-lg shadow-black/10">Click to reveal</span>
                                                     </div>
                                                 </div>

                                                 {/* BACK */}
                                                 <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] w-full h-full bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[3rem] p-12 flex flex-col justify-center items-center text-center shadow-2xl shadow-indigo-900/10">
                                                     <div className="absolute top-8 left-8 text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                                         <Sparkles className="w-5 h-5" /> Detailed Answer
                                                     </div>

                                                     <div className="absolute top-8 right-8 flex items-center gap-3 z-10 transition-opacity">
                                                         {currentCard?.topic && (
                                                             <div className="bg-white/80 border border-indigo-100/50 rounded-xl px-4 py-1.5 font-bold tracking-wider uppercase text-[9px] text-indigo-600 shadow-sm">
                                                                 {currentCard.topic}
                                                             </div>
                                                         )}
                                                         <button 
                                                             onClick={(e) => toggleStarCard(currentCard?.id, e)} 
                                                             className="p-2.5 rounded-xl hover:bg-white transition-all text-slate-400 hover:text-amber-500 border border-indigo-100/30 shadow-sm bg-white/50"
                                                             title={currentCard?.isStarred ? "Unstar" : "Star"}
                                                         >
                                                             <Star className={cn("w-5 h-5 transition-colors", currentCard?.isStarred ? "fill-amber-400 text-amber-500" : "")} />
                                                         </button>
                                                     </div>

                                                     <div className="prose prose-slate max-w-3xl md:text-2xl font-semibold leading-relaxed text-slate-800 px-6 prose-p:my-4 prose-strong:text-indigo-900 prose-strong:font-black drop-shadow-sm">
                                                         <ReactMarkdown>{currentCard?.back || ''}</ReactMarkdown>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons (Visible only on back) */}
                                        <div className={cn("mt-8 flex gap-5 justify-center transition-all duration-300", isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
                                            <button onClick={(e) => { e.stopPropagation(); handleManualStatus('learning'); }} className="px-8 py-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold uppercase tracking-wider text-sm border border-amber-200 transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                                                <Brain className="w-5 h-5" /> Learning
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleManualStatus('learned'); }} className="px-8 py-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold uppercase tracking-wider text-sm border border-emerald-200 transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                                                <Check className="w-5 h-5" /> Learnt
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* LIST & EDIT MODE */}
                                <div className="mt-16 pt-12 border-t border-slate-200 w-full">
                                    <div className="flex items-center justify-between mb-10">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manage Flashcards</h3>
                                        <button 
                                            onClick={() => setIsEditingMode(!isEditingMode)}
                                            className={cn("text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm", isEditingMode ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white border text-slate-700 hover:bg-slate-50 border-slate-200")}
                                        >
                                            {isEditingMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                            {isEditingMode ? 'Done Editing' : 'Edit Flashcards'}
                                        </button>
                                    </div>

                                    <div className="space-y-12">
                                        {(activeTab === 'all' || activeTab === 'learning' || activeTab === 'starred') && (
                                            <FlashcardSection 
                                                title="Learning"
                                                cards={learningCards}
                                                statusColor="text-amber-600"
                                                dotColor="bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                                emptyMessage="No learning cards yet."
                                                isEditingMode={isEditingMode}
                                                handleUpdateCard={handleUpdateCard}
                                                toggleStarCard={toggleStarCard}
                                                deleteCard={deleteCard}
                                            />
                                        )}

                                        {(activeTab === 'all' || activeTab === 'learned' || activeTab === 'starred') && (
                                            <FlashcardSection 
                                                title="Learnt"
                                                cards={learnedCards}
                                                statusColor="text-emerald-600"
                                                dotColor="bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                                emptyMessage="No learnt cards yet."
                                                isEditingMode={isEditingMode}
                                                handleUpdateCard={handleUpdateCard}
                                                toggleStarCard={toggleStarCard}
                                                deleteCard={deleteCard}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-slate-100">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 border border-red-100 shadow-sm mx-auto">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 text-center mb-3 tracking-tight">
                           {cardToDeleteId ? "Delete flashcard?" : "Delete entire deck?"}
                        </h3>
                        <p className="text-slate-500 text-center text-sm font-medium mb-10 leading-relaxed">
                            {cardToDeleteId 
                                ? "This card and its review history will be permanently removed. This action can't be undone." 
                                : `All your progress and ${cards.length} cards will be permanently removed. This can't be undone.`}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    if (cardToDeleteId) {
                                        confirmDeleteCard(cardToDeleteId);
                                    } else {
                                        setCards([])
                                        localStorage.removeItem(storageKey)
                                        setHasReviewedCurrent(false)
                                        toast({ title: 'Flashcards deck cleared' })
                                    }
                                    setIsDeleteModalOpen(false)
                                }}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-sm rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]"
                            >
                                Delete {cardToDeleteId ? "Card" : "Deck"}
                            </button>
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full py-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-sm rounded-2xl transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
