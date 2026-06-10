'use client'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Target, Sparkles, CheckCircle2, Circle, FileText, Brain, Briefcase, Plus, X, BookOpen, Clock, PenTool, Video, List, Hash, Highlighter, Network, Lightbulb, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/contexts/NotificationContext'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isToday } from 'date-fns'

type GoalItem = {
    id: string;
    text: string;
    completed: boolean;
}

type GoalsByDate = Record<string, GoalItem[]>

const TEMPLATE_POOL = [
    { label: 'Read 10 Pages', value: 'Read 10 pages', icon: BookOpen, description: 'Steady progress' },
    { label: 'Revise Yesterday', value: 'Revise yesterday\'s topic', icon: Brain, description: 'Memory retention' },
    { label: 'Practice Questions', value: 'Do 5 practice questions', icon: FileText, description: 'Test knowledge' },
    { label: 'Flashcards', value: 'Review flashcards for 10 minutes', icon: Brain, description: 'Active recall' },
    { label: 'Summarize Chapter', value: 'Summarize one chapter in 5 bullet points', icon: List, description: 'Condense notes' },
    { label: 'Watch Lesson', value: 'Watch one lesson video and take short notes', icon: Video, description: 'Visual learning' },
    { label: 'Rewrite Notes', value: 'Rewrite messy notes neatly', icon: PenTool, description: 'Organize format' },
    { label: 'Memorize Formulas', value: 'Memorize 5 new formulas', icon: Hash, description: 'Core math/science' },
    { label: 'Vocabulary', value: 'Learn 5 new vocabulary words', icon: Briefcase, description: 'Language skills' },
    { label: 'Past Exam Question', value: 'Solve one past exam question', icon: Target, description: 'Exam prep' },
    { label: 'Correct Mistakes', value: 'Check and correct yesterday\'s mistakes', icon: CheckCircle2, description: 'Continuous improvement' },
    { label: 'Teach Concept', value: 'Teach one concept out loud in 5 minutes', icon: Lightbulb, description: 'Feynman technique' },
    { label: 'Create Flashcards', value: 'Make 5 new flashcards', icon: Plus, description: 'Future self' },
    { label: 'Formula Revision', value: 'Quick revision of all formulas for 10 minutes', icon: Clock, description: 'Rapid recall' },
    { label: 'Plan Tomorrow', value: 'Plan tomorrow\'s study in 3 bullet points', icon: Target, description: 'Preparation' },
    { label: 'Focus Session', value: 'Do a 15‑minute focus session (no phone)', icon: Clock, description: 'Deep work' },
    { label: 'Brain Dump', value: 'Brain‑dump everything you remember about one topic', icon: Brain, description: 'Memory retrieval' },
    { label: 'Read & Recall', value: 'Read notes once and close the book, then recall', icon: BookOpen, description: 'Test yourself' },
    { label: 'Highlight Points', value: 'Highlight key points in one short section', icon: Highlighter, description: 'Identify core concepts' },
    { label: 'Mind Map', value: 'Create one small mind map for a concept', icon: Network, description: 'Visual connections' }
]

export default function GoalSetterPage() {
    const [goalsByDate, setGoalsByDate] = useState<GoalsByDate>({})
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [currentInput, setCurrentInput] = useState('')
    const [randomPresets, setRandomPresets] = useState<typeof TEMPLATE_POOL>([])
    const [mounted, setMounted] = useState(false)
    const { toast } = useToast()
    const { addNotification } = useNotifications()

    const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])

    useEffect(() => {
        setMounted(true)
        // Initial presets
        const shuffled = [...TEMPLATE_POOL]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        setRandomPresets(shuffled.slice(0, 3))

        // Load goals
        try {
            const saved = localStorage.getItem('asa_goals_by_date')
            if (saved) {
                setGoalsByDate(JSON.parse(saved))
            } else {
                // Migration from old storage
                const oldSaved = localStorage.getItem('dashboard_goals_list')
                if (oldSaved) {
                    const todayKey = format(new Date(), 'yyyy-MM-dd')
                    const oldGoals = JSON.parse(oldSaved)
                    setGoalsByDate({ [todayKey]: oldGoals })
                    // Remove old key once migrated
                    localStorage.removeItem('dashboard_goals_list')
                }
            }
        } catch { setGoalsByDate({}) }
    }, [])

    const syncStorage = (newGoalsByDate: GoalsByDate) => {
        localStorage.setItem('asa_goals_by_date', JSON.stringify(newGoalsByDate))
    }

    const currentGoals = goalsByDate[selectedDateKey] || []

    const addGoal = (text: string, silent = false) => {
        if (!text.trim()) {
            if (!silent) toast({ title: 'Please enter a goal first', variant: 'destructive' })
            return
        }
        const newGoal: GoalItem = { id: Date.now().toString() + Math.random(), text: text.trim(), completed: false }
        const updatedGoals = [...currentGoals, newGoal]
        const newGoalsByDate = { ...goalsByDate, [selectedDateKey]: updatedGoals }
        
        setGoalsByDate(newGoalsByDate)
        setCurrentInput('')
        syncStorage(newGoalsByDate)
        if (!silent) {
            toast({ title: 'Goal added to your list!' })
            addNotification('New Goal Set', `Goal: "${text.trim()}" added for ${format(selectedDate, 'MMM do')}.`, 'info')
        }
    }

    const toggleGoal = (id: string) => {
        const goal = currentGoals.find(g => g.id === id)
        const updatedGoals = currentGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g)
        const newGoalsByDate = { ...goalsByDate, [selectedDateKey]: updatedGoals }
        setGoalsByDate(newGoalsByDate)
        syncStorage(newGoalsByDate)

        if (goal && !goal.completed) {
            addNotification('Goal Completed! 🎉', `You've checked off "${goal.text}". Great job!`, 'success')
        }
    }

    const removeGoal = (id: string) => {
        const updatedGoals = currentGoals.filter(g => g.id !== id)
        const newGoalsByDate = { ...goalsByDate, [selectedDateKey]: updatedGoals }
        setGoalsByDate(newGoalsByDate)
        syncStorage(newGoalsByDate)
    }

    const setPreset = (preset: string) => {
        if (currentGoals.some(g => g.text === preset)) {
            toast({ title: 'Goal is already in your list!', variant: 'default' })
            return
        }
        addGoal(preset, true)
    }

    // Calendar Generation
    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8 pb-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all bg-slate-50/50"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div 
                    className="flex flex-col items-center cursor-pointer hover:bg-slate-50 px-6 py-2 rounded-2xl transition-all" 
                    onClick={() => {
                        setCurrentMonth(new Date())
                        setSelectedDate(new Date())
                    }}
                >
                    <h2 className="text-xl font-black tracking-tight text-slate-900 capitalize leading-none mb-1">
                        {format(currentMonth, 'MMMM')}
                    </h2>
                    <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                        {format(currentMonth, 'yyyy')}
                    </span>
                </div>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all bg-slate-50/50"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        )
    }

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
        return (
            <div className="grid grid-cols-7 mb-4">
                {days.map((day, idx) => (
                    <div key={idx} className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const rows = []
        let days = []
        let day = startDate
        let formattedDate = ""

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d")
                const cloneDay = day
                const currentDayKey = format(cloneDay, 'yyyy-MM-dd')
                const goals = goalsByDate[currentDayKey] || []
                const hasGoals = goals.length > 0
                const allCompleted = hasGoals && goals.every(g => g.completed)
                
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, monthStart)
                const isCurrentDay = isToday(day)

                days.push(
                    <div
                        key={day.toString()}
                        className="p-[2px] sm:p-1" // Protect aspect square scale
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <div className={cn(
                            "relative w-full aspect-square flex flex-col items-center justify-center rounded-full cursor-pointer transition-all duration-300",
                            isSelected && "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)] scale-110 font-bold z-10 border-2 border-white",
                            !isSelected && isCurrentMonth && "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600",
                            !isSelected && !isCurrentMonth && "text-slate-300 hover:bg-slate-50",
                            isCurrentDay && !isSelected && "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200 text-indigo-700 font-bold"
                        )}>
                            <span className="text-[13px] relative z-10 leading-none">{formattedDate}</span>
                            
                            {hasGoals && (
                                <div className="absolute bottom-[15%] flex gap-0.5">
                                    <div className={cn(
                                        "w-[5px] h-[5px] rounded-full",
                                        isSelected 
                                            ? "bg-white/90" 
                                            : allCompleted ? "bg-emerald-500" : "bg-indigo-400"
                                    )} />
                                </div>
                            )}
                        </div>
                    </div>
                )
                day = addDays(day, 1)
            }
            rows.push(
                <div key={day.toString()} className="grid grid-cols-7 gap-y-1">
                    {days}
                </div>
            )
            days = []
        }
        return <div className="space-y-1 relative z-0">{rows}</div>
    }

    if (!mounted) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading Planner...</div>

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in pb-20">
            {/* Header section */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border border-indigo-100 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                        Strategic Planning
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                        Daily Goals
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-lg">
                        Set your learning targets and track your consistency over time.
                    </p>
                </div>
                
                {/* Stats Header Display */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:w-auto w-full">
                    <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center min-w-[120px]">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Goals</p>
                        <p className="text-3xl font-black text-slate-900">{currentGoals.length}</p>
                    </div>
                    <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center min-w-[120px]">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Completed
                        </p>
                        <p className="text-3xl font-black text-slate-900">{currentGoals.filter(g => g.completed).length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                
                {/* Left Side: Calendar Container */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                    <Card className="bg-white border-none rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            {renderHeader()}
                            {renderDays()}
                            {renderCells()}
                        </div>
                    </Card>
                    
                    {/* Motivational Note */}
                    <div className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100/50 flex items-start gap-4 shadow-sm">
                        <div className="bg-white rounded-xl p-2 shadow-sm shrink-0">
                            <Target className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 mb-1">Stay Consistent</p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Small daily habits compound into massive achievements over time. Keep the streak alive!</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Goals List */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
                    
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-6 pl-2">
                        <div className="space-y-1">
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                {isToday(selectedDate) ? "Today's Agenda" : format(selectedDate, 'eeee, MMMM do')}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                {currentGoals.length === 0 ? "Your day is completely clear." : `You have ${currentGoals.filter(g => !g.completed).length} uncompleted tasks.`}
                            </p>
                        </div>
                    </div>

                    <Card className="bg-white border-none rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 flex-1 flex flex-col overflow-hidden">
                        {/* Input Area */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Target className="h-5 w-5 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                </div>
                                <input 
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addGoal(currentInput)}
                                    placeholder="What do you want to accomplish?"
                                    className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-16 py-4 text-base font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-slate-900 shadow-sm"
                                />
                                <Button
                                    size="icon"
                                    className="absolute inset-y-2 right-2 h-auto w-10 sm:w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all btn-premium"
                                    onClick={() => addGoal(currentInput)}
                                >
                                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                                </Button>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[300px] flex flex-col">
                            {currentGoals.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto my-8">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-60" />
                                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm relative z-10">
                                            <Target className="h-8 w-8 text-indigo-300" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No active goals</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        You haven't added any goals for this day. Get started by typing a new objective or selecting from a template below.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 relative">
                                    {currentGoals.map((goal, i) => (
                                        <div 
                                            key={goal.id} 
                                            className={cn(
                                                "group flex items-start sm:items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer animate-slide-up bg-white",
                                                goal.completed 
                                                    ? "border-slate-100 bg-slate-50/50" 
                                                    : "border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md hover:-translate-y-1 z-10 relative"
                                            )}
                                            style={{ animationDelay: `${i * 50}ms` }}
                                            onClick={() => toggleGoal(goal.id)}
                                        >
                                            <div className="mt-0.5 sm:mt-0 relative flex-shrink-0">
                                                {goal.completed ? (
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white scale-110 drop-shadow-sm transition-transform">
                                                        <Check className="h-4 w-4 stroke-[3]" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 bg-white transition-colors" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn(
                                                    "text-base font-bold transition-all break-words pr-2", 
                                                    goal.completed ? "line-through text-slate-400 font-medium" : "text-slate-800"
                                                )}>
                                                    {goal.text}
                                                </p>
                                            </div>
                                            <button 
                                                className="p-1.5 opacity-0 group-hover:opacity-100 active:bg-red-100 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                onClick={(e) => { e.stopPropagation(); removeGoal(goal.id); }}
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Templates section */}
                        <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100 mt-auto">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-400" /> Need Inspiration?
                            </h3>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {randomPresets.map((preset) => {
                                    const Icon = preset.icon
                                    const isInList = currentGoals.some(g => g.text === preset.value && !g.completed)

                                    return (
                                        <button
                                            key={preset.label}
                                            className={cn(
                                                "px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center gap-2 duration-300 shadow-sm",
                                                isInList 
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md cursor-default pointer-events-none" 
                                                    : "bg-white border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md active:scale-95 text-slate-600"
                                            )}
                                            onClick={() => setPreset(preset.value)}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {preset.label}
                                            {isInList && <CheckCircle2 className="h-4 w-4 ml-1 opacity-80" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    )
}
