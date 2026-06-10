'use client'
import { useState, useEffect, useRef } from 'react'
import { aiApi, ChatMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Send, Image as ImageIcon, X, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiChatProps {
    documentId?: string
    placeholder?: string
}

export default function AiChat({ documentId, placeholder = 'Ask a question...' }: AiChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [pendingImage, setPendingImage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const endRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file type', description: 'Please upload an image.', variant: 'destructive' })
            return
        }
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
                    setPendingImage(event.target?.result as string);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setPendingImage(dataUrl);
            };
        };
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    processFile(file);
                    // Prevent pasting the image binary into the text area if browser tries to
                    // e.preventDefault(); 
                }
            }
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
    }

    const sendMessage = async () => {
        const content = input.trim()
        if ((!content && !pendingImage) || loading) return
        
        const imageUrl = pendingImage
        setInput('')
        setPendingImage(null)

        const newMessage: ChatMessage = { role: 'user' as const, content, image_url: imageUrl || undefined }
        const history = [...messages, newMessage]
        setMessages(history)
        setLoading(true)
        
        try {
            const res: any = documentId 
                ? await aiApi.chat(documentId, content, messages, imageUrl || undefined) 
                : await aiApi.generalChat(history)
            setMessages([...history, { role: 'assistant', content: res.answer || res.message }])
        } catch (error) {
            console.error('Chat error:', error)
            toast({ title: 'Failed to get AI response', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div 
            className={cn(
                "flex flex-col h-full bg-background/50 backdrop-blur-md rounded-xl border overflow-hidden transition-colors",
                isDragging && "border-primary ring-2 ring-primary/20 bg-primary/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) processFile(file)
            }}
            onPaste={handlePaste}
        >
            <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin scrollbar-thumb-muted">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Study Assistant</h3>
                            <p className="text-sm text-muted-foreground max-w-[200px]">Paste a screenshot or ask a question about your documents.</p>
                        </div>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300', msg.role === 'user' && 'flex-row-reverse')}>
                        <Avatar className={cn("h-8 w-8 flex-shrink-0 border", msg.role === 'assistant' ? "border-violet-100 dark:border-violet-900" : "border-primary/20")}>
                            <AvatarFallback className={cn('text-xs font-semibold', msg.role === 'assistant' && 'bg-gradient-to-br from-violet-500 to-blue-600 text-white')}>
                                {msg.role === 'user' ? 'U' : 'AI'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2 max-w-[85%]">
                            <div className={cn(
                                'text-sm px-4 py-3 rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap',
                                msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                    : 'bg-card border border-border/50 rounded-tl-sm'
                            )}>
                                {msg.content}
                                {msg.image_url && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                                        <img src={msg.image_url} alt="Uploaded" className="max-w-full h-auto max-h-[400px] object-contain cursor-zoom-in" onClick={() => window.open(msg.image_url, '_blank')} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 items-center animate-pulse">
                        <Avatar className="h-8 w-8 border border-violet-100 dark:border-violet-900">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-blue-600 text-white">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                            <span className="text-xs text-muted-foreground font-medium">AI is thinking</span>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>
            
            <div className="p-4 bg-muted/30 border-t space-y-3">
                {pendingImage && (
                    <div className="relative inline-block animate-in zoom-in-95 duration-200">
                        <div className="h-24 w-24 rounded-lg overflow-hidden border-2 border-primary ring-4 ring-primary/10">
                            <img src={pendingImage} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                        <button 
                            onClick={() => setPendingImage(null)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:scale-110 transition-transform shadow-lg"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="shrink-0 mb-1" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                    >
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <div className="flex-1 relative">
                        <Textarea 
                            value={input} 
                            onChange={e => setInput(e.target.value)} 
                            onPaste={handlePaste}
                            placeholder={placeholder}
                            className="min-h-[40px] max-h-[160px] py-2.5 resize-none bg-background/80 focus-visible:ring-primary shadow-inner scrollbar-none"
                            onKeyDown={e => { 
                                if (e.key === 'Enter' && !e.shiftKey) { 
                                    e.preventDefault(); 
                                    sendMessage() 
                                } 
                            }}
                            disabled={loading} 
                        />
                    </div>
                    <Button 
                        size="icon" 
                        variant={(!input.trim() && !pendingImage) ? "secondary" : "gradient"} 
                        onClick={sendMessage} 
                        disabled={(!input.trim() && !pendingImage) || loading}
                        className="rounded-lg shrink-0 mb-1 shadow-lg shadow-primary/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground/40 font-medium">
                    Tip: You can paste screenshots or drag and drop images directly into this area.
                </p>
            </div>
        </div>
    )
}
