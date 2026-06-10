'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/auth'
import { Document, aiApi, documentsApi, Flashcard, QuizQuestion, Summary, ChatMessage } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { BookOpen, Layers, Brain, MessageSquare, Send, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, XCircle, ExternalLink, FileText, Loader2, AlertCircle, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { document: Document; onClose: () => void }

// ─── Document Viewer Tab ─────────────────────────────
function DocumentViewerTab({ document }: { document: Document }) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const isPdf = document.mime_type === 'application/pdf'

    useEffect(() => {
        if (!isPdf) {
            setLoading(false)
            return
        }

        let url = ''
        const loadPdf = async () => {
            try {
                setLoading(true)
                const token = getToken()
                const response = await fetch(documentsApi.getUrl(document.id), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })
                if (!response.ok) throw new Error('Failed to load PDF')
                const blob = await response.blob()
                url = URL.createObjectURL(blob)
                setBlobUrl(url)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        loadPdf()
        return () => { if (url) URL.revokeObjectURL(url) }
    }, [document.id, isPdf])

    const displayUrl = blobUrl || documentsApi.getUrl(document.id)

    return (
        <div className="space-y-4 h-[420px] flex flex-col">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium min-w-0">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{document.filename}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 flex-shrink-0" asChild>
                    <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" /> Open in New Tab
                    </a>
                </Button>
            </div>
            <div className="flex-1 bg-muted/30 rounded-xl border relative flex items-center justify-center overflow-hidden">
                {isPdf ? (
                    loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <p className="text-xs text-muted-foreground">Loading PDF...</p>
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-xs p-4 text-center">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            {error}
                        </div>
                    ) : (
                        <iframe
                            src={`${blobUrl}#toolbar=0`}
                            className="w-full h-full border-0 absolute inset-0"
                            title="PDF Viewer"
                        />
                    )
                ) : (
                    <div className="w-full h-full p-6 overflow-y-auto absolute inset-0">
                        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                            {document.extracted_text || 'No text content available.'}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Summary Tab ────────────────────────────────────
function SummaryTab({ documentId }: { documentId: string }) {
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const generate = async () => {
        setLoading(true)
        try { setSummary(await aiApi.getSummary(documentId)) }
        catch { toast({ title: 'Failed to generate summary', variant: 'destructive' }) }
        finally { setLoading(false) }
    }

    return (
        <div className="space-y-4">
            {!summary ? (
                <div className="text-center py-8">
                    <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="h-7 w-7 text-violet-600" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Generate an AI-powered summary of this document</p>
                    <Button variant="gradient" onClick={generate} loading={loading}>Generate Summary</Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Badge variant="success">Summary Ready</Badge>
                        <button onClick={generate} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" /> Regenerate
                        </button>
                    </div>
                    <div 
                        className="prose-chat bg-muted/50 rounded-xl p-6 max-h-[500px] overflow-y-auto summary-doc-content"
                        dangerouslySetInnerHTML={{ __html: summary.content }}
                    />
                </div>
            )}
        </div>
    )
}

// ─── Flashcards Tab ──────────────────────────────────
function FlashcardsTab({ documentId }: { documentId: string }) {
    const [cards, setCards] = useState<Flashcard[]>([])
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const generate = async () => {
        setLoading(true); setIndex(0); setFlipped(false)
        try {
            const res = await aiApi.getFlashcards(documentId, 10)
            setCards(res.flashcards)
        } catch { toast({ title: 'Failed to generate flashcards', variant: 'destructive' }) }
        finally { setLoading(false) }
    }

    const next = () => { setIndex(i => Math.min(i + 1, cards.length - 1)); setFlipped(false) }
    const prev = () => { setIndex(i => Math.max(i - 1, 0)); setFlipped(false) }

    if (!cards.length) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Layers className="h-7 w-7 text-blue-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Generate flashcards to test your memory</p>
                <Button variant="gradient" onClick={generate} loading={loading}>Generate Flashcards</Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Card {index + 1} of {cards.length}</span>
                <Progress value={((index + 1) / cards.length) * 100} className="w-32 h-1.5" />
                <button onClick={generate} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> New Set
                </button>
            </div>

            {/* Flip card */}
            <div className="relative h-48 cursor-pointer perspective-1000" onClick={() => setFlipped(f => !f)}>
                <div className={cn('absolute inset-0 transition-transform duration-500 preserve-3d', flipped && 'rotate-y-180')}
                    style={{ transformStyle: 'preserve-3d' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 rounded-2xl border flex flex-col items-center justify-center p-6 text-center backface-hidden">
                        <p className="text-xs text-muted-foreground mb-2">FRONT</p>
                        <p className="font-semibold">{cards[index]?.front}</p>
                        <p className="text-xs text-muted-foreground mt-4">Click to reveal answer</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 rounded-2xl border flex flex-col items-center justify-center p-6 text-center"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <p className="text-xs text-muted-foreground mb-2">ANSWER</p>
                        <p className="text-sm leading-relaxed">{cards[index]?.back}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={prev} disabled={index === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setFlipped(f => !f)}>{flipped ? 'Show Question' : 'Show Answer'}</Button>
                <Button variant="outline" size="icon" onClick={next} disabled={index === cards.length - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
    )
}

// ─── Quiz Tab ────────────────────────────────────────
function QuizTab({ documentId }: { documentId: string }) {
    const [questions, setQuestions] = useState<QuizQuestion[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const generate = async () => {
        setLoading(true); setAnswers({}); setSubmitted(false)
        try {
            const res = await aiApi.getQuiz(documentId, 5)
            setQuestions(res.questions)
        } catch { toast({ title: 'Failed to generate quiz', variant: 'destructive' }) }
        finally { setLoading(false) }
    }

    const score = questions.filter(q => {
        const answerId = answers[q.id]
        return answerId === q.correct_answer
    }).length

    if (!questions.length) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Brain className="h-7 w-7 text-pink-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Test your knowledge with an AI quiz</p>
                <Button variant="gradient" onClick={generate} loading={loading}>Generate Quiz</Button>
            </div>
        )
    }

    return (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {submitted && (
                <div className={cn('flex items-center gap-3 p-3 rounded-xl text-sm font-medium',
                    score >= questions.length * 0.7 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400')}>
                    Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
                    {score >= questions.length * 0.7 ? ' 🎉 Great job!' : ' 📚 Keep studying!'}
                </div>
            )}

            {questions.map((q, qi) => {
                const userAnswer = answers[q.id]
                const isCorrect = userAnswer === q.correct_answer
                return (
                    <div key={q.id} className="border rounded-xl p-4 space-y-2">
                        <p className="font-medium text-sm">{qi + 1}. {q.question}</p>
                        <div className="space-y-1.5">
                            {q.options.map((opt, oi) => {
                                let cls = 'border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors text-left w-full'
                                const isCorrectOption = opt.id === q.correct_answer
                                const isSelected = answers[q.id] === opt.id
                                if (submitted) {
                                    if (isCorrectOption) cls += ' bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                                    else if (isSelected) cls += ' bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                                    else cls += ' opacity-50'
                                } else {
                                    cls += isSelected ? ' border-primary bg-primary/10 text-primary' : ' hover:bg-muted/70'
                                }
                                return (
                                    <button key={opt.id} className={cls} disabled={submitted}
                                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}>
                                        <span className="mr-2 text-xs font-semibold">{String.fromCharCode(65 + oi)}.</span>{opt.text}
                                        {submitted && isCorrectOption && <CheckCircle2 className="inline ml-2 h-3.5 w-3.5" />}
                                        {submitted && isSelected && !isCorrectOption && <XCircle className="inline ml-2 h-3.5 w-3.5" />}
                                    </button>
                                )
                            })}
                        </div>
                        {submitted && q.explanation && (
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{q.explanation}</p>
                        )}
                    </div>
                )
            })}

            <div className="flex gap-2">
                {!submitted ? (
                    <Button variant="gradient" onClick={() => setSubmitted(true)}
                        disabled={Object.keys(answers).length < questions.length} className="flex-1">
                        Submit Quiz
                    </Button>
                ) : (
                    <Button variant="outline" onClick={generate} loading={loading} className="flex-1 gap-2">
                        <RotateCcw className="h-4 w-4" /> New Quiz
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── Chat Tab ────────────────────────────────────────
function ChatTab({ documentId }: { documentId: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const send = async () => {
        const content = input.trim()
        if (!content || loading) return
        setInput('')
        const newHistory = [...messages, { role: 'user' as const, content }]
        setMessages(newHistory)
        setLoading(true)
        try {
            const res = await aiApi.chat(documentId, content, messages)
            setMessages([...newHistory, { role: 'assistant', content: res.answer }])
        } catch {
            toast({ title: 'Failed to get response', variant: 'destructive' })
            setMessages(newHistory)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-3" style={{ height: 340 }}>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">Ask anything about this document</div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-2 items-start', msg.role === 'user' && 'flex-row-reverse')}>
                        <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className={cn('text-[10px]', msg.role === 'assistant' && 'bg-gradient-to-br from-violet-500 to-blue-600 text-white')}>
                                {msg.role === 'user' ? 'U' : 'AI'}
                            </AvatarFallback>
                        </Avatar>
                        <div className={cn('max-w-[80%] text-sm px-3 py-2 rounded-xl', msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm')}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2 items-center">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-blue-600 text-white">AI</AvatarFallback></Avatar>
                        <div className="bg-muted px-3 py-2 rounded-xl flex gap-1">
                            {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this document..."
                    onKeyDown={e => { if (e.key === 'Enter') send() }} disabled={loading} />
                <Button size="icon" variant="gradient" onClick={send} disabled={!input.trim() || loading}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// ─── Main Modal ──────────────────────────────────────
export default function StudyToolsModal({ document, onClose }: Props) {
    const [startTime] = useState(Date.now())
    const [lastSavedTime, setLastSavedTime] = useState(Date.now())
    const { toast } = useToast()
    const router = useRouter()
    const docname = encodeURIComponent(document.title || document.filename)

    const saveCurrentProgress = async (isFinal = false) => {
        const now = Date.now()
        const sessionSeconds = Math.floor((now - lastSavedTime) / 1000)

        if (sessionSeconds >= 10) {
            try {
                await aiApi.createSession({
                    document_id: document.id,
                    session_type: 'chat',
                    duration_seconds: sessionSeconds,
                    result_data: {
                        modal_study: true,
                        is_periodic: !isFinal,
                        is_final: isFinal,
                        timestamp: new Date().toISOString()
                    }
                })
                setLastSavedTime(now)
                if (isFinal) {
                    toast({
                        title: 'Study session recorded',
                        description: `Saved ${Math.floor(sessionSeconds / 60)}m ${sessionSeconds % 60}s to your dashboard.`
                    })
                }
            } catch (err) {
                console.error('Failed to save session:', err)
            }
        }
    }

    // Periodic save every 2 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            saveCurrentProgress(false)
        }, 2 * 60 * 1000)
        return () => clearInterval(interval)
    }, [lastSavedTime])

    const handleClose = async () => {
        await saveCurrentProgress(true)
        onClose()
    }

    return (
        <Dialog open onOpenChange={v => { if (!v) handleClose() }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-8 overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-5 w-5 text-violet-600" />
                        <span className="truncate">{document.title || document.filename}</span>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="view">
                    <TabsList className="grid grid-cols-6 w-full">
                        <TabsTrigger value="view">View</TabsTrigger>
                        <TabsTrigger value="summary">Summary</TabsTrigger>
                        <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                        <TabsTrigger value="quiz">Quiz</TabsTrigger>
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger
                            value="notes"
                            onClick={() => { handleClose(); router.push(`/notes/${docname}`) }}
                            className="flex items-center gap-1"
                        >
                            <StickyNote className="h-3.5 w-3.5" />
                            Notes
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="view"><DocumentViewerTab document={document} /></TabsContent>
                    <TabsContent value="summary"><SummaryTab documentId={document.id} /></TabsContent>
                    <TabsContent value="flashcards"><FlashcardsTab documentId={document.id} /></TabsContent>
                    <TabsContent value="quiz"><QuizTab documentId={document.id} /></TabsContent>
                    <TabsContent value="chat"><ChatTab documentId={document.id} /></TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
