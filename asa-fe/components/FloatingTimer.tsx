'use client'
import { useTimer } from '@/contexts/TimerContext'
import { Brain, Pause, Play, RotateCcw, Volume2, VolumeX, CheckCircle2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useState, useRef } from 'react'

export default function FloatingTimer() {
    const { seconds, running, start, pause, reset, mode, alarmEnabled, saveSession } = useTimer()

    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [scale, setScale] = useState(1)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const dragStartPos = useRef({ x: 0, y: 0 })
    const resizeStartPos = useRef({ x: 0, y: 0, initialScale: 1, dirX: 1, dirY: 1 })

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return // Only left click
        if ((e.target as HTMLElement).closest('button')) return // Ignore buttons
        
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsDragging(true)
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStartPos.current.x,
            y: e.clientY - dragStartPos.current.y
        })
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsDragging(false)
    }

    const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>, dirX: number, dirY: number) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        setIsResizing(true)
        resizeStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            initialScale: scale,
            dirX,
            dirY
        }
    }

    const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizing) return
        e.stopPropagation()
        const dx = e.clientX - resizeStartPos.current.x
        const dy = e.clientY - resizeStartPos.current.y
        
        // Average movement across both dominant drag axes
        const movement = (dx * resizeStartPos.current.dirX + dy * resizeStartPos.current.dirY) / 2
        const deltaScale = movement / 150 // sensitivity factor
        
        const newScale = Math.max(0.4, Math.min(2.5, resizeStartPos.current.initialScale + deltaScale))
        setScale(newScale)
    }

    const handleResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation()
        e.currentTarget.releasePointerCapture(e.pointerId)
        setIsResizing(false)
    }

    // Only show if the timer is actually being used (running or has time left)
    if (seconds === 0 && !running) return null

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const s = secs % 60
        return `${mins}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div 
            className={cn("fixed bottom-8 left-8 z-[100] rounded-full touch-none select-none", (!isDragging && !isResizing) && "transition-transform duration-75")}
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'bottom left',
                cursor: isDragging ? 'grabbing' : (isResizing ? 'crosshair' : 'grab')
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-full shadow-xl shadow-slate-200/50 pr-4 pl-4 py-3 flex items-center gap-5 group overflow-hidden relative transition-all duration-300">
                
                {/* Resize Handles */}
                <div onPointerDown={(e) => handleResizeDown(e, -1, -1)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize z-20" />
                <div onPointerDown={(e) => handleResizeDown(e, 1, -1)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} className="absolute top-0 right-0 w-8 h-8 cursor-nesw-resize z-20" />
                <div onPointerDown={(e) => handleResizeDown(e, -1, 1)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} className="absolute bottom-0 left-0 w-8 h-8 cursor-nesw-resize z-20" />
                <div onPointerDown={(e) => handleResizeDown(e, 1, 1)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} onPointerCancel={handleResizeUp} className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-20" />

                {/* Background glow */}
                <div className={cn(
                    "absolute inset-0 bg-indigo-50/30 transition-opacity duration-700",
                    running ? "opacity-100" : "opacity-0"
                )} />

                <div className="flex flex-col justify-center items-center opacity-30 group-hover:opacity-100 transition-opacity -mr-2 text-slate-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                </div>

                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative shrink-0",
                    running ? "bg-indigo-50 text-indigo-600 scale-105" : "bg-slate-50 text-slate-400 border border-slate-100"
                )}>
                    {running && <div className="absolute inset-0 rounded-2xl border border-indigo-200 animate-pulse" />}
                    
                    <Brain className={cn("h-6 w-6 relative transition-transform duration-500", running && "scale-110")} />
                    
                    <div className="absolute -top-2 -right-2 transition-transform duration-300 z-10 hover:scale-110 active:scale-95 cursor-pointer">
                        {alarmEnabled ? (
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-200 text-indigo-600 group/vol">
                                <Volume2 className="h-3 w-3" />
                            </div>
                        ) : (
                            <div className="bg-white rounded-full p-1.5 shadow-sm border border-slate-200 text-slate-400 group/vol">
                                <VolumeX className="h-3 w-3" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-0.5 relative pr-2">
                    <p className={cn(
                        "text-[10px] font-extrabold uppercase tracking-widest transition-colors",
                        running ? "text-indigo-500" : "text-slate-400"
                    )}>
                        {mode === 'countdown' ? 'Focus Session' : 'Study Mode'}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className={cn(
                            "text-[1.7rem] font-black font-mono tracking-tighter leading-none transition-colors",
                            running ? "text-slate-900" : "text-slate-700"
                        )}>
                            {formatTime(seconds)}
                        </p>
                        {running && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mt-0.5" />
                        )}
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-slate-200 relative shrink-0 mx-1" />

                <div className="flex items-center gap-1.5 relative shrink-0 pl-1">
                    {!running ? (
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95" onClick={start}>
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                        </Button>
                    ) : (
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95" onClick={pause}>
                            <Pause className="h-4 w-4 fill-current" />
                        </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-90" onClick={reset}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
