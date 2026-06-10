'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NotesSidebar } from '@/components/NotesSidebar'
import { aiApi, documentsApi, Document, ChatMessage } from '@/lib/api'
import { ChevronLeft, Send, Sparkles, MessageCircle, FileText, Loader2, Bot, History, Plus, Paperclip, X, Image as ImageIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import { useToast } from '@/components/ui/use-toast'

export default function ChatBotPage() {
    const params = useParams()
    const router = useRouter()
    const docName = decodeURIComponent(params.docname as string)
    const { toast } = useToast()

    const [matchedDoc, setMatchedDoc] = useState<Document | null>(null)
    const initialMessage: ChatMessage = { role: 'assistant', content: `Hi! I'm your AI tutor for **${docName}**. Ask me anything about this document!` }
    const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [attachments, setAttachments] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    const [showHistory, setShowHistory] = useState(false)
    const [chatSessions, setChatSessions] = useState<{id: string, date: string, messages: ChatMessage[]}[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    
    const storageKeyChat = `chat_history_sessions_${docName}`

    useEffect(() => {
        documentsApi.list().then(docs => {
            const sorted = [...docs].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            const match = sorted.find(d => (d.title || d.filename).toLowerCase() === docName.toLowerCase())
            setMatchedDoc(match || null)
        }).catch(() => setMatchedDoc(null))
    }, [docName])

    useEffect(() => {
        if (!matchedDoc) return
        try {
            const key = `chat_history_sessions_v2_${docName}`
            const saved = localStorage.getItem(key)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Filter to ONLY sessions belonging to THIS specific document ID
                const relevant = parsed.filter((s: any) => s.docId === matchedDoc.id)
                setChatSessions(relevant)
                if (relevant.length > 0) {
                    setActiveSessionId(relevant[0].id)
                    setMessages(relevant[0].messages)
                } else {
                    setActiveSessionId(null)
                    setMessages([initialMessage])
                }
            } else {
                setChatSessions([])
                setMessages([initialMessage])
            }
        } catch (e) {}
    }, [matchedDoc, docName])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isThinking])

    const clearAllSessions = () => {
        const key = `chat_history_sessions_v2_${docName}`
        localStorage.removeItem(key)
        setChatSessions([])
        setActiveSessionId(null)
        setMessages([initialMessage])
        toast({ title: 'All chat history cleared!' })
    }

    const deleteSession = (sessionId: string) => {
        const key = `chat_history_sessions_v2_${docName}`
        const saved = localStorage.getItem(key)
        if (!saved) return
        
        try {
            const allSessions = JSON.parse(saved)
            const filtered = allSessions.filter((s: any) => s.id !== sessionId)
            localStorage.setItem(key, JSON.stringify(filtered))
            setChatSessions(filtered.filter((s: any) => matchedDoc && s.docId === matchedDoc.id))
            
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([initialMessage]);
            }
            toast({ title: 'Chat history deleted!' })
        } catch (e) {
            toast({ title: 'Failed to delete history', variant: 'destructive' })
        }
    }

    const processFile = async (file: File): Promise<string | null> => {
        // For non-images, just read as base64 without resizing
        if (!file.type.startsWith('image/')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (e) => resolve(e.target?.result as string);
            });
        }

        // For images, resize to 1024px max
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(event.target?.result as string); // fallback to original
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const quality = 0.8;
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
            };
        });
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    setAttachments(prev => [...prev, file]);
                    // e.preventDefault();
                }
            }
        }
    }

    const handleSend = async () => {
        if ((!input.trim() && attachments.length === 0) || !matchedDoc?.id) return
        
        let userMsg = input.trim()
        let attachedImages: string[] = []
        let extraAtt: { filename: string, content_type: string, data: string } | undefined = undefined
        
        // Process images & attachments
        for (const file of attachments) {
            try {
                if (file.type.startsWith('image/')) {
                    const b64 = await processFile(file)
                    if (b64) attachedImages.push(b64)
                } else if (!extraAtt) {
                    // Take the first non-image attachment (e.g. PDF)
                    console.log('Processing non-image attachment:', file.name);
                    const b64 = await processFile(file)
                    if (b64) {
                        extraAtt = {
                            filename: file.name,
                            content_type: file.type || 'application/octet-stream',
                            data: b64
                        }
                    }
                }
            } catch (err) {
                console.error('Error processing attachment:', file.name, err);
                toast({ title: `Error processing ${file.name}`, variant: 'destructive' });
            }
        }

        if (attachments.length > 0) {
            const nonImageNames = attachments.filter(f => !f.type.startsWith('image/')).map(f => f.name).join(', ')
            if (nonImageNames) {
                userMsg += userMsg ? `\n\n[Attached Files: ${nonImageNames}]` : `[Attached Files: ${nonImageNames}]`
            }
        }

        const mainImageUrl = attachedImages.length > 0 ? attachedImages[0] : undefined

        setInput('')
        setAttachments([])
        
        const newHistory = [...messages, { role: 'user', content: userMsg, image_url: mainImageUrl } as ChatMessage]
        setMessages(newHistory)
        setIsThinking(true)

        try {
            // Updated to pass the last image_url and extra attachment if present
            const res = await aiApi.chat(matchedDoc.id, userMsg, messages, mainImageUrl, extraAtt)
            const finalHistory = [...newHistory, { role: 'assistant', content: res.answer } as ChatMessage]
            setMessages(finalHistory)

            // Auto-save to sessions
            if (!matchedDoc) return
            const key = `chat_history_sessions_v2_${docName}`
            const saved = localStorage.getItem(key)
            const allSessions = saved ? JSON.parse(saved) : []
            
            let currentSessionIndex = allSessions.findIndex((s: any) => s.id === activeSessionId)
            
            if (activeSessionId && currentSessionIndex >= 0) {
                allSessions[currentSessionIndex].messages = finalHistory
                allSessions[currentSessionIndex].date = new Date().toISOString()
            } else {
                const newId = Date.now().toString()
                allSessions.unshift({
                    id: newId,
                    docId: matchedDoc.id,
                    date: new Date().toISOString(),
                    messages: finalHistory
                })
                setActiveSessionId(newId)
            }
            allSessions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setChatSessions(allSessions.filter((s: any) => s.docId === matchedDoc.id))
            localStorage.setItem(key, JSON.stringify(allSessions))

        } catch (e) {
            toast({ title: 'Failed to send message', variant: 'destructive' })
            setMessages([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
        } finally {
            setIsThinking(false)
        }
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* ── Left: Nav Sidebar ── */}
            <NotesSidebar docName={docName} activeSection="chat" />

            {/* ── Center: Main Content ── */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Top bar */}
                <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur-md z-50 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push(`/notes/${docName}`)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-base font-bold truncate text-slate-900">{docName} <span className="text-slate-300 mx-2">/</span> Chat Bot</span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 relative">
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "h-9 px-4 flex items-center gap-2 justify-center rounded-xl transition-all border text-xs font-bold uppercase tracking-wider",
                                showHistory ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" : "hover:bg-slate-50 border-slate-200 text-slate-600 bg-white shadow-sm"
                            )}
                        >
                            <History className="h-4 w-4" /> History
                        </button>
                        <button 
                            onClick={() => {
                                setActiveSessionId(null);
                                setMessages([initialMessage]);
                                toast({ title: 'Started a new chat session!' })
                            }}
                            className="h-9 px-4 flex items-center gap-2 justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 btn-premium"
                        >
                            <Plus className="h-4 w-4" /> New Chat
                        </button>
                    </div>
                </div>

                {/* Split View: Chat & PDF */}
                <div key={matchedDoc?.id} className="flex-1 flex overflow-hidden relative">
                    
                    {/* Chat History Sidebar */}
                    {showHistory && (
                        <div className="absolute top-0 right-0 h-full w-80 border-l border-slate-200 bg-white shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
                             <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Chat History</h3>
                                 <div className="flex items-center gap-1">
                                    <button 
                                        onClick={clearAllSessions} 
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Clear all history"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setShowHistory(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                                        <X className="h-4 w-4" />
                                    </button>
                                 </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {chatSessions.map((session) => (
                                    <div key={session.id} className="relative group">
                                        <button
                                            onClick={() => {
                                                setActiveSessionId(session.id);
                                                setMessages(session.messages);
                                            }}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all hover:bg-slate-50 group-hover:pr-10",
                                                activeSessionId === session.id ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-slate-100"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-indigo-500 text-shadow-sm">
                                                    {new Date(session.date).toLocaleDateString()}
                                                </span>
                                                <MessageCircle className="h-3.5 w-3.5 text-indigo-400 opacity-60" />
                                            </div>
                                            <p className="text-sm font-semibold truncate text-slate-700 leading-relaxed">
                                                {session.messages[session.messages.length - 1]?.content.slice(0, 40) || "No messages"}...
                                            </p>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteSession(session.id);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                            title="Delete session"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {chatSessions.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-48 text-center px-4 opacity-50">
                                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
                                            <History className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">No history yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50 relative z-10 w-1/2" onPaste={handlePaste}>
                        {/* Chat Messages */}
                        {!matchedDoc ? (
                            <div className="flex-1 flex flex-col items-center justify-center font-bold text-slate-500 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                                <span className="text-lg tracking-tight">Loading document context...</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                                    <div className="max-w-3xl mx-auto space-y-8 pb-4">
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                                <div className="flex-shrink-0 mt-1">
                                                    {msg.role === 'assistant' ? (
                                                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                                            <Bot className="w-6 h-6" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black shadow-md">
                                                            U
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`p-5 rounded-[2rem] shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/20' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-slate-200/50'}`}>
                                                    <div className={`prose max-w-none text-base font-medium leading-relaxed prose-p:my-2 ${msg.role === 'user' ? 'text-white prose-headings:text-white prose-a:text-white/80' : 'prose-slate prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-xl prose-code:text-indigo-600'}`}>
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        {msg.image_url && (
                                                            <div className="mt-4 rounded-xl overflow-hidden border border-white/20 shadow-lg group/img relative">
                                                                <img 
                                                                    src={msg.image_url} 
                                                                    alt="Chat attachment" 
                                                                    className="max-w-full h-auto max-h-[400px] object-contain hover:scale-[1.02] transition-transform cursor-zoom-in" 
                                                                    onClick={() => window.open(msg.image_url, '_blank')}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {isThinking && (
                                            <div className="flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                                        <Bot className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                <div className="bg-white border border-slate-100 p-5 rounded-[2rem] rounded-tl-sm shadow-sm flex items-center gap-3 text-slate-500 font-medium">
                                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                    <span className="animate-pulse">Assistant is typing...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Input Area */}
                                <div className="p-6 border-t border-slate-200 bg-white">
                                    <div className="max-w-3xl mx-auto w-full relative">
                                        {attachments.length > 0 && (
                                            <div className="flex gap-2 p-3 overflow-x-auto w-full bg-slate-50 border border-slate-200 rounded-2xl mb-4 z-20 custom-scrollbar shadow-inner">
                                                {attachments.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium shadow-sm flex-shrink-0 animate-in zoom-in duration-200">
                                                        {f.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-indigo-500" />}
                                                        <span className="truncate max-w-[150px] text-slate-700">{f.name}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setAttachments(prev => prev.filter((_, idx) => idx !== i));
                                                            }} 
                                                            className="hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg p-1 ml-1 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="relative group w-full flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[2rem] p-2 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all shadow-sm">
                                            <input 
                                                type="file" 
                                                multiple 
                                                className="hidden" 
                                                ref={fileInputRef}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        const filesArray = Array.from(e.target.files);
                                                        setAttachments(prev => [...prev, ...filesArray]);
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = '';
                                                        fileInputRef.current.click();
                                                    }
                                                }}
                                                disabled={isThinking || !matchedDoc}
                                                title="Attach files"
                                                className="w-12 h-12 flex-shrink-0 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 border border-transparent hover:border-slate-200 hover:shadow-sm"
                                            >
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                            <textarea
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault()
                                                        handleSend()
                                                    }
                                                }}
                                                placeholder="Ask a question or request an explanation..."
                                                className="flex-1 bg-transparent border-none px-4 py-3 text-base font-medium text-slate-900 outline-none resize-none custom-scrollbar placeholder:text-slate-400"
                                                rows={1}
                                                style={{ minHeight: '48px', maxHeight: '200px' }}
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={(!input.trim() && attachments.length === 0) || isThinking || !matchedDoc}
                                                className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-indigo-500/25 btn-premium"
                                            >
                                                <Send className="w-5 h-5 ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-center mt-4">
                                        <span className="text-xs font-medium text-slate-400">AI can make mistakes. Verify important information against the original document.</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* PDF Viewer */}
                    <div className="w-1/2 bg-slate-100 hidden lg:block border-l border-slate-200">
                        {matchedDoc ? (
                            <iframe 
                                src={documentsApi.getUrl(matchedDoc.id)} 
                                className="w-full h-full border-0 bg-white" 
                                title="Document Viewer"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <span className="font-bold uppercase tracking-widest text-xs">Waiting for document viewer...</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
