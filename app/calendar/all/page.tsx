"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Calendar as CalendarIcon,
    Users,
    Sun,
    Moon,
    ShieldAlert,
    Coffee,
    LayoutGrid,
    Table as TableIcon,
    ChevronRight,
    User as UserIcon,
    Layers,
    Search,
    ChevronDown,
    Clock,
    ArrowRight,
    Edit3,
    Book,
    Save,
    Loader2,
    Info,
    MoreVertical,
    Maximize2
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useRef } from "react"
import { gql, useQuery, useMutation } from "@apollo/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import React from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const GET_ALL_SCHEDULES = gql`
  query GetAllSchedules {
    getAllSchedules {
      user_id
      username
      dim
      lun
      mar
      mer
      jeu
      ven
      sam
      departement
      photo
    }
  }
`

const UPDATE_USER_SCHEDULE = gql`
  mutation UpdateUserSchedule($userId: ID!, $schedule: ScheduleInput!) {
    updateUserSchedule(userId: $userId, schedule: $schedule) {
      user_id
      username
      dim
      lun
      mar
      mer
      jeu
      ven
      sam
    }
  }
`

const DAYS = [
    { key: "lun", label: "Lundi", short: "Lun" },
    { key: "mar", label: "Mardi", short: "Mar" },
    { key: "mer", label: "Mercredi", short: "Mer" },
    { key: "jeu", label: "Jeudi", short: "Jeu" },
    { key: "ven", label: "Vendredi", short: "Ven" },
    { key: "sam", label: "Samedi", short: "Sam" },
    { key: "dim", label: "Dimanche", short: "Dim" },
]

const SHIFT_OPTIONS = [
    { value: "Matin", label: "Matin", icon: Sun, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100" },
    { value: "Soir", label: "Soir", icon: Moon, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", iconBg: "bg-blue-100" },
    { value: "Doublage", label: "Doublage", icon: ShieldAlert, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", iconBg: "bg-purple-100" },
    { value: "Repos", label: "Repos", icon: Coffee, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100" },
    { value: null, label: "Non configuré", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", iconBg: "bg-red-100" },
]

export default function AllSchedulesPlacementPage() {
    const { data, loading, error, refetch } = useQuery(GET_ALL_SCHEDULES)
    const [updateSchedule] = useMutation(UPDATE_USER_SCHEDULE)

    const [searchQuery, setSearchQuery] = useState("")
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [isCompact, setIsCompact] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const longPressTimer = useRef<any>(null)

    const schedules = data?.getAllSchedules || []

    const filteredSchedules = useMemo(() => {
        if (!searchQuery) return schedules
        return schedules.filter((s: any) =>
            s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.departement || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [schedules, searchQuery])

    const depts = useMemo(() => {
        const list = new Set(filteredSchedules.map((s: any) => s.departement || "Autre"))

        // Helper to generate sort sortKey
        const getSortKey = (d: string) => {
            if (d === "Cuisine") return "Chef_Cuisine_1"; // Force Cuisine to follow Chef_Cuisine
            if (d === "Chef_Cuisine") return "Chef_Cuisine_0"; // Ensure Chef_Cuisine is the anchor
            return d;
        };

        return Array.from(list).sort((a: any, b: any) => {
            return getSortKey(a).localeCompare(getSortKey(b));
        })
    }, [filteredSchedules])

    const handleUpdateShift = async (user: any, dayKey: string, newShift: string) => {
        const userId = user.user_id
        setUpdatingId(`${userId}-${dayKey}`)
        setOpenMenuId(null) // Close menu after selection

        const currentSchedule = {
            dim: user.dim || "Repos",
            lun: user.lun || "Repos",
            mar: user.mar || "Repos",
            mer: user.mer || "Repos",
            jeu: user.jeu || "Repos",
            ven: user.ven || "Repos",
            sam: user.sam || "Repos",
            [dayKey]: newShift
        }

        try {
            await updateSchedule({
                variables: {
                    userId,
                    schedule: currentSchedule
                }
            })
            await refetch()
        } catch (e) {
            console.error("Update failed", e)
        } finally {
            setUpdatingId(null)
        }
    }

    const onLongPressStart = (id: string) => {
        longPressTimer.current = setTimeout(() => {
            setOpenMenuId(id)
            if (navigator && (navigator as any).vibrate) {
                (navigator as any).vibrate(50)
            }
        }, 600)
    }

    const onLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }

    if (loading) return (
        <div className="flex h-screen flex-col items-center justify-center bg-[#fbfbfb] gap-4 text-[#8b5a2b]">
            <Loader2 className="h-10 w-10 animate-spin" />
            <span className="font-black animate-pulse uppercase text-[10px] tracking-widest">Initialisation Bey...</span>
        </div>
    )

    return (
        <div className="flex h-screen overflow-hidden flex-col bg-[#fbf9f6] lg:flex-row font-sans">
            <Sidebar />

            <main className="flex-1 overflow-hidden h-full flex flex-col pt-16 lg:pt-0">
                {/* --- ULTRA COMPACT INTELLIGENT HEADER --- */}
                <div className="bg-white border-b border-[#e8dfcf] px-3 py-3 lg:px-6 lg:py-4 shadow-sm relative z-50">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 lg:h-12 lg:w-12 rounded-lg lg:rounded-2xl bg-[#3d2c1e] items-center justify-center shadow-lg shrink-0">
                                <Maximize2 className="h-4 w-4 lg:h-6 lg:w-6 text-[#8b5a2b]" />
                            </div>
                            <div className="flex flex-col tracking-tighter">
                                <h1 className="text-sm lg:text-2xl font-black text-[#3d2c1e] leading-none">
                                    Maître <span className="text-[#8b5a2b]">Placement</span>
                                </h1>
                                <p className="text-[8px] lg:text-[10px] font-bold text-[#8b5a2b]/60 uppercase tracking-widest mt-0.5">
                                    Vue Totale Hebdomadaire
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 lg:gap-4 justify-between md:justify-end">
                            <div className="flex p-0.5 bg-[#f1e9db] rounded-lg border border-[#c9b896]/20 shadow-inner overflow-hidden shrink-0">
                                <Link href="/calendar" className="px-2 lg:px-4 py-1.5 rounded-md text-[9px] lg:text-xs font-black transition-all text-[#8b5a2b]/40 hover:text-[#8b5a2b]">Journal</Link>
                                <Link href="/calendar/all" className="px-2 lg:px-4 py-1.5 rounded-md text-[9px] lg:text-xs font-black transition-all bg-[#8b5a2b] text-white shadow-sm">Touts</Link>
                                <Link href="/schedule" className="px-2 lg:px-4 py-1.5 rounded-md text-[9px] lg:text-xs font-black transition-all text-[#8b5a2b]/40 hover:text-[#8b5a2b]">Créer</Link>
                            </div>

                            <div className="relative group shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-[#8b5a2b]/40" />
                                <input
                                    type="text"
                                    placeholder="Nom..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-24 sm:w-48 lg:w-64 h-8 lg:h-10 pl-8 pr-3 rounded-lg bg-[#fbf9f6] border border-[#c9b896]/30 focus:border-[#8b5a2b] outline-none font-bold text-[#3d2c1e] text-[10px] lg:text-xs transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- INTELLIGENT SCROLLABLE VIEW: ALL DAYS IN ONE --- */}
                <div className="flex-1 overflow-auto bg-[#fdfbf9] relative scrollbar-hide select-none transition-all">
                    <table className="w-full border-separate border-spacing-0 table-fixed">
                        <thead className="sticky top-0 z-50">
                            <tr className="bg-[#2d1e12] text-white">
                                <th className="p-3 lg:p-4 text-left sticky left-0 z-50 bg-[#2d1e12] border-r border-white/10 w-[120px] lg:w-[15%]">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="h-3 w-3 text-[#8b5a2b]" />
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Shift</span>
                                    </div>
                                </th>
                                {DAYS.map(day => (
                                    <th key={day.key} className="p-2 lg:p-4 text-center border-r border-white/5 w-[100px] lg:w-[12%]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-tighter">{day.label}</span>
                                            <span className="text-[8px] font-bold opacity-30 mt-0.5">{day.short}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {depts.map((dept: any) => (
                                <React.Fragment key={dept}>
                                    <tr className="bg-[#f3ead8] relative z-40">
                                        <td colSpan={8} className="p-2 lg:p-3 sticky left-0 z-40 bg-[#f3ead8] border-b border-[#d4c5a9]">
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-3 w-3 text-[#8b5a2b]" />
                                                <span className="text-[10px] lg:text-xs font-black text-[#3d2c1e] uppercase tracking-tighter truncate">{dept}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {SHIFT_OPTIONS.filter(o => o.value !== "Doublage").map(shiftOpt => (
                                        <tr key={`${dept}-${shiftOpt.value}`} className={cn("group transition-colors", shiftOpt.bg, "hover:brightness-[0.98]")}>
                                            {/* Left Header for Shift Name */}
                                            <td className={cn(
                                                "p-2 lg:p-3 sticky left-0 z-30 border-r transition-colors shadow-sm",
                                                shiftOpt.bg, shiftOpt.border, "border-b-[3px] border-[#618774]"
                                            )}>
                                                <div className={cn("flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-2", shiftOpt.color)}>
                                                    <shiftOpt.icon className="h-3.5 w-3.5" />
                                                    <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-tighter leading-none">{shiftOpt.label}</span>
                                                </div>
                                            </td>

                                            {/* Cells for Days */}
                                            {DAYS.map(day => {
                                                const emps = filteredSchedules.filter((s: any) => {
                                                    const employeeShift = s[day.key];
                                                    const deptMatch = (s.departement || "Autre") === dept;

                                                    if (!deptMatch) return false;

                                                    if (shiftOpt.value === "Matin") {
                                                        return employeeShift === "Matin" || employeeShift === "Doublage";
                                                    }
                                                    if (shiftOpt.value === "Soir") {
                                                        return employeeShift === "Soir" || employeeShift === "Doublage";
                                                    }

                                                    // Default behavior for Repos, etc.
                                                    if (shiftOpt.value === null) return !employeeShift;
                                                    return employeeShift === shiftOpt.value;
                                                })

                                                return (
                                                    <td key={day.key} className={cn("p-1 lg:p-2 border-r align-top transition-colors", shiftOpt.border, "border-b-[3px] border-[#618774]")}>
                                                        <div className="flex flex-col gap-1 min-h-[30px] lg:min-h-[50px]">
                                                            {emps.map((emp: any) => {
                                                                const isUpdating = updatingId?.startsWith(`${emp.user_id}-${day.key}`)
                                                                const actualShift = emp[day.key];
                                                                const isDoublage = actualShift === "Doublage";
                                                                const displayStyle = isDoublage
                                                                    ? SHIFT_OPTIONS.find(o => o.value === "Doublage") || shiftOpt
                                                                    : shiftOpt;

                                                                return (
                                                                    <DropdownMenu
                                                                        key={emp.user_id}
                                                                        open={openMenuId === `${emp.user_id}-${day.key}`}
                                                                        onOpenChange={(open) => {
                                                                            if (!open) setOpenMenuId(null)
                                                                        }}
                                                                    >
                                                                        <DropdownMenuTrigger asChild>
                                                                            <button
                                                                                disabled={isUpdating}
                                                                                onPointerDown={() => onLongPressStart(`${emp.user_id}-${day.key}`)}
                                                                                onPointerUp={onLongPressEnd}
                                                                                onPointerLeave={onLongPressEnd}
                                                                                className={cn(
                                                                                    "flex items-center gap-2 px-1.5 py-1.5 rounded-lg transition-all active:scale-95 text-left w-full overflow-hidden border shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                                                                                    displayStyle.iconBg, "hover:shadow-md",
                                                                                    displayStyle.border,
                                                                                    isUpdating && "opacity-50 grayscale cursor-not-allowed"
                                                                                )}
                                                                            >
                                                                                {/* Photo/Avatar */}
                                                                                <div className="h-6 w-6 rounded-full bg-white border border-[#c9b896]/30 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                                                    {emp.photo ? (
                                                                                        <img src={emp.photo} className="h-full w-full object-cover" />
                                                                                    ) : (
                                                                                        <span className="text-[10px] font-black text-[#8b5a2b]">{emp.username.charAt(0)}</span>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-[9px] lg:text-[10px] font-black text-[#3d2c1e] truncate uppercase tracking-tight leading-none mb-0.5">
                                                                                        {emp.username}
                                                                                    </span>
                                                                                    <span className="text-[7px] font-bold text-[#8b5a2b]/50 uppercase tracking-widest leading-none">
                                                                                        {emp.departement || "Staff"}
                                                                                    </span>
                                                                                </div>
                                                                                {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-[#8b5a2b] ml-auto shrink-0" />}
                                                                            </button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="start" className="rounded-xl border border-[#c9b896]/30 p-1 bg-white shadow-2xl z-[100] w-[140px]">
                                                                            <div className="px-2 py-1 mb-1 bg-[#8b5a2b]/5 rounded-t-lg">
                                                                                <p className="text-[7px] font-black text-[#8b5a2b]/40 uppercase">{day.label}</p>
                                                                                <p className="text-[9px] font-black text-[#3d2c1e] truncate tracking-tight">{emp.username}</p>
                                                                            </div>
                                                                            {SHIFT_OPTIONS.filter(o => o.value !== null).map((opt) => (
                                                                                <DropdownMenuItem
                                                                                    key={opt.value}
                                                                                    onClick={() => handleUpdateShift(emp, day.key, opt.value!)}
                                                                                    className={cn(
                                                                                        "flex items-center gap-2 p-1.5 rounded-lg cursor-pointer font-black text-[9px] uppercase mb-0.5 last:mb-0 transition-all",
                                                                                        opt.iconBg, opt.color, opt.value === shiftOpt.value ? "ring-1 ring-[#8b5a2b] bg-white ring-offset-0 scale-100" : "hover:scale-[1.02] opacity-80 hover:opacity-100"
                                                                                    )}
                                                                                >
                                                                                    <opt.icon className="h-3.5 w-3.5" />
                                                                                    {opt.label}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                )
                                                            })}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>

            {/* --- INJECTED GLOBAL STYLES FOR TABLE PERFORMANCE --- */}
            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        table { border-collapse: separate; border-spacing: 0; }
        tbody tr:last-child td { border-bottom: none; }
      `}</style>
        </div>
    )
}
