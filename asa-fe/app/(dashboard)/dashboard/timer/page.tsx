'use client'
import { useState } from 'react'
import { useTimer } from '@/contexts/TimerContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brain, Coffee, Play, Pause, RotateCcw, Sparkles, Timer as TimerIcon, Volume2, VolumeX, Clock, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export default function FocusTimerPage() {
    const { seconds, running, start, pause, reset, setCountdown, mode, alarmEnabled, setAlarmEnabled, saveSession } = useTimer()
    const [customMinutes, setCustomMinutes] = useState(25)
    const [customSeconds, setCustomSeconds] = useState(0)

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const s = secs % 60
        return `${mins}:${s.toString().padStart(2, '0')}`
    }

    const startCustom = () => {
        const total = (customMinutes * 60) + customSeconds
        if (total > 0) setCountdown(total)
    }

    const presets = [
        { label: 'Pomodoro', value: 25 * 60, icon: Brain, description: 'Deep focus' },
        { label: 'Short Break', value: 5 * 60, icon: Coffee, description: 'Quick rest' },
        { label: 'Long Break', value: 15 * 60, icon: Coffee, description: 'Long rest' },
    ]

    return (
        <div className="max-w-full py-12 px-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Side: Timer Display */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Focus Session</span>
                            </div>
                            <button
                                onClick={() => setAlarmEnabled(!alarmEnabled)}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all border",
                                    alarmEnabled 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                {alarmEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </button>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Focus Timer</h1>
                        <p className="text-base text-slate-500 font-medium max-w-sm">
                            Optimize your productivity with structured focus intervals.
                        </p>
                    </div>

                    <Card className="relative bg-white border-slate-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-10 shadow-xl shadow-indigo-900/5 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none" />
                        
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Autosave Active</span>
                        </div>
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-transparent to-transparent transition-opacity duration-1000",
                            running ? "opacity-100" : "opacity-0"
                        )} />

                        <div className="relative z-10 text-8xl md:text-9xl font-black tracking-tighter tabular-nums text-slate-900 select-none drop-shadow-sm">
                            {formatTime(seconds)}
                        </div>

                        <div className="flex items-center gap-4 relative z-10 w-full justify-center">
                            {!running ? (
                                <Button
                                    size="lg"
                                    className="h-16 px-12 rounded-2xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25 btn-premium"
                                    onClick={start}
                                >
                                    <Play className="h-5 w-5 mr-2 fill-current" /> Start
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-16 px-12 rounded-2xl font-bold text-sm uppercase tracking-wider border-slate-200 bg-white hover:bg-slate-50 text-slate-900 shadow-sm"
                                    onClick={pause}
                                >
                                    <Pause className="h-5 w-5 mr-2 fill-current" /> Pause
                                </Button>
                            )}
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-16 w-16 rounded-2xl border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                onClick={() => saveSession()}
                                title="Manual save (Autosave is active)"
                            >
                                <CheckCircle2 className="h-6 w-6" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-16 w-16 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 shadow-sm"
                                onClick={reset}
                            >
                                <RotateCcw className="h-6 w-6" />
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Side: Options */}
                <div className="space-y-6">
                    <Card className="bg-white border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10" />
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                <Clock className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Custom Duration</h3>
                        </div>

                        <div className="flex items-end gap-4 relative z-10">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Minutes</label>
                                <Input
                                    type="number"
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/20 rounded-xl h-12 text-base font-bold text-center text-slate-900"
                                />
                            </div>
                            <div className="text-2xl font-black text-slate-300 pb-2">:</div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Seconds</label>
                                <Input
                                    type="number"
                                    value={customSeconds}
                                    onChange={(e) => setCustomSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                    className="bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/20 rounded-xl h-12 text-base font-bold text-center text-slate-900"
                                />
                            </div>
                            <Button
                                className="h-12 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white shadow-md btn-premium"
                                onClick={startCustom}
                            >
                                Set
                            </Button>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-4">
                        {presets.map((preset) => {
                            const Icon = preset.icon
                            const isActive = mode === 'countdown' && seconds === preset.value

                            return (
                                <Card
                                    key={preset.label}
                                    className={cn(
                                        "p-5 flex items-center gap-5 cursor-pointer transition-all duration-300 border hover:shadow-md group/preset",
                                        isActive 
                                            ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/20" 
                                            : "bg-white border-slate-100 hover:border-indigo-100"
                                    )}
                                    onClick={() => setCountdown(preset.value)}
                                >
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover/preset:scale-110 shadow-sm",
                                        isActive 
                                            ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                                            : "bg-slate-50 text-indigo-500 border border-slate-100"
                                    )}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base text-slate-900 tracking-tight">{preset.label}</h3>
                                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                            {Math.floor(preset.value / 60)} Minutes • {preset.description}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                        isActive ? "bg-indigo-100" : "bg-slate-50 opacity-0 group-hover/preset:opacity-100 group-hover/preset:translate-x-1"
                                    )}>
                                        <ChevronRight className={cn(
                                            "h-4 w-4 transition-colors",
                                            isActive ? "text-indigo-600" : "text-slate-400"
                                        )} />
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
