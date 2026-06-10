'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NotesSidebar } from '@/components/NotesSidebar'
import { aiApi, documentsApi, Document, QuizQuestion } from '@/lib/api'
import { ChevronLeft, BrainCircuit, Loader2, ArrowRight, ArrowLeft, RefreshCcw, CheckCircle2, XCircle, History, Trash2, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import ReactMarkdown from 'react-markdown'

const QUESTION_COUNTS = [5, 10, 15, 20]

const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

export default function QuizPage() {
    const params = useParams()
    const router = useRouter()
    const docName = decodeURIComponent(params.docname as string)
    const { toast } = useToast()

    const [matchedDoc, setMatchedDoc] = useState<Document | null>(null)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])
    
    // Form state
    const [questionCount, setQuestionCount] = useState(10)
    const [loading, setLoading] = useState(false)
    
    // Quiz state
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
    const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({})
    const [showScoreCard, setShowScoreCard] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [quizHistory, setQuizHistory] = useState<any[]>([])

    useEffect(() => {
        documentsApi.list().then(docs => {
            const sorted = [...docs].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const match = sorted.find(d => (d.title || d.filename).toLowerCase() === docName.toLowerCase())
            setMatchedDoc(match || null)

            // Load history
            const historyKey = `quiz_history_${docName}_v2`
            const saved = localStorage.getItem(historyKey)
            if (saved) {
                const parsed = JSON.parse(saved)
                setQuizHistory(parsed.filter((h: any) => match && h.docId === match.id))
            }
        }).catch(() => setMatchedDoc(null))
    }, [docName])

    const handleGenerate = async () => {
        if (!matchedDoc) return
        setLoading(true)
        setQuestions([])
        setSelectedOptions({})
        setCheckedQuestions({})
        setShowHistory(false)
        try {
            const res = await aiApi.getQuiz(matchedDoc.id, questionCount)
            
            // Randomize options for each question to break any AI patterns
            const randomizedQuestions = res.questions.map(q => {
                const shuffledTexts = [...q.options].map(o => o.text).sort(() => Math.random() - 0.5);
                const correctText = q.options.find(o => o.id === q.correct_answer)?.text;
                
                const newOptions = q.options.map((o, idx) => ({
                    id: o.id, // Keep 'A', 'B', 'C', 'D' labels in order
                    text: shuffledTexts[idx]
                }));
                
                const newCorrectId = newOptions.find(o => o.text === correctText)?.id || q.correct_answer;
                
                return { ...q, options: newOptions, correct_answer: newCorrectId };
            });
            
            setQuestions(randomizedQuestions)
            setCurrentIndex(0)
            setShowScoreCard(false)
            
            toast({ title: 'Quiz Generated Successfully!' })
        } catch (e) {
            toast({ title: 'Failed to generate quiz', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const saveToHistory = () => {
        if (!matchedDoc) return
        const historyKey = `quiz_history_${docName}_v2`
        const saved = localStorage.getItem(historyKey)
        const allHistory = saved ? JSON.parse(saved) : []
        
        const newItem = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            docId: matchedDoc.id,
            score,
            total: questions.length,
            questions,
            selectedOptions,
            checkedQuestions
        }
        
        const updated = [newItem, ...allHistory]
        localStorage.setItem(historyKey, JSON.stringify(updated))
        setQuizHistory(updated.filter((h: any) => h.docId === matchedDoc.id))
    }

    const clearAllHistory = () => {
        const historyKey = `quiz_history_${docName}_v2`
        localStorage.removeItem(historyKey)
        setQuizHistory([])
        toast({ title: 'Quiz history cleared!' })
    }

    const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const historyKey = `quiz_history_${docName}_v2`
        const saved = localStorage.getItem(historyKey)
        if (!saved) return
        try {
            const allHistory = JSON.parse(saved)
            const filtered = allHistory.filter((h: any) => h.id !== id)
            localStorage.setItem(historyKey, JSON.stringify(filtered))
            setQuizHistory(filtered.filter((h: any) => matchedDoc && h.docId === matchedDoc.id))
            toast({ title: 'Quiz result deleted!' })
        } catch (e) {}
    }

    const loadHistoryItem = (item: any) => {
        setQuestions(item.questions)
        setSelectedOptions(item.selectedOptions)
        setCheckedQuestions(item.checkedQuestions)
        setCurrentIndex(0)
        setShowScoreCard(true)
        setShowHistory(false)
    }

    const currentQuestion = questions[currentIndex]

    const handleSelectOption = (optionId: string) => {
        if (checkedQuestions[currentQuestion.id]) return // Prevent changing answer after checking
        setSelectedOptions(prev => ({ ...prev, [currentQuestion.id]: optionId }))
    }

    const handleCheckAnswer = () => {
        if (!selectedOptions[currentQuestion.id]) return
        setCheckedQuestions(prev => ({ ...prev, [currentQuestion.id]: true }))
    }

    const isCorrect = (questionId: string) => {
        const q = questions.find(q => q.id === questionId)
        return q?.correct_answer === selectedOptions[questionId]
    }

    const score = Object.keys(checkedQuestions).filter(id => isCorrect(id)).length
    const isFinished = questions.length > 0 && Object.keys(checkedQuestions).length === questions.length

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <NotesSidebar docName={docName} activeSection="quiz" />

            <div key={matchedDoc?.id} className="flex-1 flex flex-col min-w-0 relative bg-slate-50">
                
                {/* Top bar */}
                <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push(`/notes/${docName}`)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-base font-bold truncate text-slate-900">{docName} <span className="text-slate-300 mx-2">/</span> Practice Quiz</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {questions.length > 0 && (
                            <div className="flex items-center gap-4">
                                {isFinished && (
                                    <span className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-xl shadow-sm">
                                        Score: {score} / {questions.length}
                                    </span>
                                )}
                                <button 
                                    onClick={() => {
                                        setQuestions([]);
                                        setShowScoreCard(false);
                                    }}
                                    className="h-9 text-xs bg-white hover:bg-slate-50 text-slate-700 px-4 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-wider border border-slate-200 shadow-sm"
                                >
                                    <RefreshCcw className="w-4 h-4" /> Start Over
                                </button>
                            </div>
                        )}
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "h-9 px-4 flex items-center gap-2 justify-center rounded-xl transition-all border text-xs font-bold uppercase tracking-wider shadow-sm",
                                showHistory ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "hover:bg-slate-50 border-slate-200 text-slate-600 bg-white"
                            )}
                        >
                            <History className="h-4 w-4" /> History <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{quizHistory.length}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* History Sidebar */}
                    {showHistory && (
                        <div className="w-80 border-r border-slate-200 bg-white flex flex-col animate-in slide-in-from-left duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
                             <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Quiz History</h3>
                                 <div className="flex items-center gap-1">
                                    <button 
                                        onClick={clearAllHistory} 
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                                        title="Clear all history"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button 
                                        onClick={() => setShowHistory(false)} 
                                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-lg"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                 </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {quizHistory.map((item) => (
                                    <div key={item.id} className="relative group">
                                        <button
                                            onClick={() => loadHistoryItem(item)}
                                            className="w-full text-left p-5 rounded-2xl border border-slate-100 transition-all hover:bg-slate-50 hover:border-slate-200 pr-12 shadow-sm bg-white"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {timeAgo(item.date)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 mb-0.5">Score: {item.score} / {item.total}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.total} Questions</p>
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-black px-3 py-1.5 rounded-xl border shadow-sm",
                                                    (item.score / item.total) >= 0.7 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {Math.round((item.score / item.total) * 100)}%
                                                </span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => deleteHistoryItem(item.id, e)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-100 bg-white shadow-sm"
                                            title="Delete result"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {quizHistory.length === 0 && (
                                    <div className="text-center py-20 bg-slate-50/80 rounded-3xl border border-dashed border-slate-200">
                                        <History className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm font-bold text-slate-400">No quiz history yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <div className="max-w-4xl mx-auto pb-20">
                            
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
                                    <h3 className="text-3xl font-black mb-4 tracking-tight text-slate-900">Generating Quiz Questions...</h3>
                                    <p className="text-lg font-medium text-slate-500 max-w-sm animate-pulse">
                                        Analyzing the document to create high-quality multiple-choice questions.
                                    </p>
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12">
                                    <div className="text-center space-y-5">
                                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                                            <BrainCircuit className="w-10 h-10" />
                                        </div>
                                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Practice Quiz</h1>
                                        <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
                                            Test your understanding of <span className="text-indigo-600 font-bold">{docName}</span> with an AI-generated quiz.
                                        </p>
                                    </div>

                                    <div className="space-y-8 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-indigo-900/5">
                                        
                                        <div className="space-y-4">
                                            <label className="text-xs font-bold ml-1 uppercase tracking-widest text-slate-500">
                                                Number of Questions
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {QUESTION_COUNTS.map((count) => (
                                                    <button
                                                        key={count}
                                                        onClick={() => setQuestionCount(count)}
                                                        className={cn(
                                                            "py-5 rounded-2xl border text-center transition-all duration-200 font-black text-xl",
                                                            questionCount === count
                                                                ? "bg-indigo-50 border-indigo-200 shadow-sm text-indigo-700 ring-1 ring-indigo-500/20"
                                                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                                                        )}
                                                    >
                                                        {count}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleGenerate}
                                            className="w-full h-16 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 text-lg active:scale-[0.98] btn-premium"
                                        >
                                            <BrainCircuit className="w-6 h-6" /> Generate Quiz
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    
                                    {showScoreCard ? (
                                        <div className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-14 shadow-xl shadow-indigo-900/5 relative overflow-hidden text-center animate-in zoom-in-95 duration-500">
                                            <div className="w-28 h-28 mx-auto bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20 relative rotate-3">
                                                <div className="absolute inset-1 bg-white rounded-2xl flex items-center justify-center -rotate-3">
                                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                                                        {Math.round((score / questions.length) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight mb-3 text-slate-900">Quiz Completed!</h2>
                                            <p className="text-slate-500 text-xl font-medium mb-12">
                                                You answered <strong className="text-slate-900">{score}</strong> out of <strong className="text-slate-900">{questions.length}</strong> questions correctly.
                                            </p>

                                            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-12">
                                                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full" />
                                                    <p className="text-4xl font-black text-emerald-600 mb-2 relative">{score}</p>
                                                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest relative">Correct</p>
                                                </div>
                                                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
                                                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-500/10 rounded-full" />
                                                    <p className="text-4xl font-black text-red-600 mb-2 relative">{questions.length - score}</p>
                                                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest relative">Incorrect</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                                <button
                                                    onClick={() => setShowScoreCard(false)}
                                                    className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 px-8 rounded-2xl border border-slate-200 transition-all w-full sm:w-auto shadow-sm active:scale-[0.98] uppercase tracking-wider text-sm"
                                                >
                                                    Review Answers
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setQuestions([]);
                                                        setShowScoreCard(false);
                                                    }}
                                                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-xl shadow-indigo-500/25 w-full sm:w-auto active:scale-[0.98] btn-premium uppercase tracking-wider text-sm"
                                                >
                                                    Start New Quiz
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Header / Progress Steps */}
                                            <div className="flex items-center justify-between mb-10 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                                <div className="space-y-1 pl-2">
                                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Question {currentIndex + 1} <span className="text-slate-300 mx-1">/</span> <span className="text-slate-400">{questions.length}</span></h2>
                                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Progress: {Math.round(((currentIndex + 1) / questions.length) * 100)}%</p>
                                                </div>
                                                <select 
                                                    value={currentIndex}
                                                    onChange={(e) => setCurrentIndex(Number(e.target.value))}
                                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-black rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 p-3 px-6 transition-all shadow-inner hover:bg-slate-100 outline-none cursor-pointer"
                                                >
                                                    {questions.map((q, i) => {
                                                        const isChecked = checkedQuestions[q.id]
                                                        const correct = isChecked && isCorrect(q.id)
                                                        let statusLabel = ""
                                                        if (isChecked) statusLabel = correct ? " ✓" : " ✗"
                                                        
                                                        return (
                                                            <option key={q.id} value={i}>
                                                                Question {i + 1}{statusLabel}
                                                            </option>
                                                        )
                                                    })}
                                                </select>
                                            </div>

                                            {/* Active Question Card */}
                                            <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
                                                {currentQuestion.topic && (
                                                    <div className="absolute top-8 right-8 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-1.5 font-bold text-[10px] text-indigo-600 uppercase tracking-widest shadow-sm">
                                                        {currentQuestion.topic}
                                                    </div>
                                                )}

                                                <div className="prose prose-slate max-w-none text-slate-900 text-xl md:text-2xl font-bold mb-10 pt-4 leading-tight">
                                                    <ReactMarkdown>{currentQuestion.question}</ReactMarkdown>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    {currentQuestion.options.map((option) => {
                                                        const isSelected = selectedOptions[currentQuestion.id] === option.id
                                                        const isChecked = checkedQuestions[currentQuestion.id]
                                                        const isCorrectAns = currentQuestion.correct_answer === option.id
                                                        
                                                        let optionClass = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                                                        let badgeClass = "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm"
                                                        
                                                        if (isChecked) {
                                                            if (isCorrectAns) {
                                                                optionClass = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500 shadow-sm"
                                                                badgeClass = "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                            } else if (isSelected && !isCorrectAns) {
                                                                optionClass = "bg-red-50 border-red-500 text-red-900 ring-1 ring-red-500 shadow-sm"
                                                                badgeClass = "bg-red-500 text-white shadow-md shadow-red-500/20"
                                                            } else {
                                                                optionClass = "bg-white border-slate-100 opacity-40 text-slate-400"
                                                            }
                                                        } else if (isSelected) {
                                                            optionClass = "bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-400 shadow-sm"
                                                            badgeClass = "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                                                        }

                                                        return (
                                                            <button
                                                                key={option.id}
                                                                onClick={() => handleSelectOption(option.id)}
                                                                disabled={isChecked}
                                                                className={cn(
                                                                    "w-full text-left p-6 rounded-2xl border transition-all flex items-start gap-5 disabled:cursor-default group active:scale-[0.99]",
                                                                    optionClass
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl text-sm font-black transition-all mt-0.5",
                                                                    badgeClass
                                                                )}>
                                                                    {option.id}
                                                                </span>
                                                                <span className="flex-1 font-bold leading-relaxed text-lg pt-1.5">
                                                                    {option.text}
                                                                </span>
                                                                {isChecked && isCorrectAns && (
                                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0 mt-1 drop-shadow-sm" />
                                                                )}
                                                                {isChecked && isSelected && !isCorrectAns && (
                                                                    <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1 drop-shadow-sm" />
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                {/* Action Area */}
                                                <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        {checkedQuestions[currentQuestion.id] && currentQuestion.explanation && (
                                                            <div className="animate-in fade-in slide-in-from-top-4 bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner">
                                                                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                                                                    {isCorrect(currentQuestion.id) ? (
                                                                        <span className="text-emerald-600 flex items-center gap-2">Explanation <CheckCircle2 className="w-4 h-4"/></span>
                                                                    ) : (
                                                                        <span className="text-red-600 flex items-center gap-2">Correction <XCircle className="w-4 h-4"/></span>
                                                                    )}
                                                                </h4>
                                                                <div className="prose prose-slate max-w-none text-sm text-slate-700 font-medium leading-relaxed">
                                                                    <ReactMarkdown>{currentQuestion.explanation}</ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex-shrink-0 ml-8 flex items-center gap-4">
                                                        {!checkedQuestions[currentQuestion.id] ? (
                                                            <button
                                                                onClick={handleCheckAnswer}
                                                                disabled={!selectedOptions[currentQuestion.id]}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider text-sm py-4 px-10 rounded-2xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 active:scale-[0.98] btn-premium"
                                                            >
                                                                Check Answer
                                                            </button>
                                                        ) : currentIndex < questions.length - 1 ? (
                                                            <button
                                                                onClick={() => setCurrentIndex(i => i + 1)}
                                                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-sm py-4 px-10 rounded-2xl transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]"
                                                            >
                                                                Next <ArrowRight className="w-5 h-5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    saveToHistory();
                                                                    setShowScoreCard(true);
                                                                }}
                                                                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black uppercase tracking-wider text-sm py-4 px-10 rounded-2xl transition-all shadow-xl shadow-indigo-500/25 active:scale-[0.98] flex items-center gap-2 btn-premium"
                                                            >
                                                                Complete <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
