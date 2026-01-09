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
  Book
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"
import { gql, useQuery } from "@apollo/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import React from 'react'

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

const DAYS = [
  { key: "lun", label: "Lundi", short: "Lun" },
  { key: "mar", label: "Mardi", short: "Mar" },
  { key: "mer", label: "Mercredi", short: "Mer" },
  { key: "jeu", label: "Jeudi", short: "Jeu" },
  { key: "ven", label: "Vendredi", short: "Ven" },
  { key: "sam", label: "Samedi", short: "Sam" },
  { key: "dim", label: "Dimanche", short: "Dim" },
]

const SHIFT_THEMES: any = {
  Matin: { icon: Sun, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  Soir: { icon: Moon, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  Doublage: { icon: ShieldAlert, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  Repos: { icon: Coffee, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  "Non configuré": { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"placement" | "weekly">("placement")
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    const map = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
    return map[today];
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedDept, setExpandedDept] = useState<string | null>(null)

  const { data, loading, error } = useQuery(GET_ALL_SCHEDULES)

  const schedules = data?.getAllSchedules || []

  const filteredSchedules = useMemo(() => {
    if (!searchQuery) return schedules
    return schedules.filter((s: any) =>
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.departement || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [schedules, searchQuery])

  // Group by department then by shift for the placement view
  const placementData = useMemo(() => {
    const grouped: any = {}
    filteredSchedules.forEach((s: any) => {
      const dept = s.departement || "Autre"
      const shift = s[selectedDayKey] || "Non configuré"
      if (!grouped[dept]) grouped[dept] = { Matin: [], Soir: [], Doublage: [], Repos: [], "Non configuré": [] }
      if (grouped[dept][shift]) grouped[dept][shift].push({ username: s.username, photo: s.photo })
    })
    return grouped
  }, [filteredSchedules, selectedDayKey])

  // Group by department for the weekly view
  const weeklyGroupedByDept = useMemo(() => {
    const grouped: any = {}
    filteredSchedules.forEach((s: any) => {
      const dept = s.departement || "Autre"
      if (!grouped[dept]) grouped[dept] = []
      grouped[dept].push(s)
    })
    return grouped
  }, [filteredSchedules])

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#fbfbfb] gap-4">
      <div className="h-12 w-12 border-4 border-[#8b5a2b]/20 border-t-[#8b5a2b] rounded-full animate-spin" />
      <span className="text-[#8b5a2b] font-bold animate-pulse">Bey Intelligence...</span>
    </div>
  )

  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#fbfbfb] gap-4">
      <ShieldAlert className="h-12 w-12 text-red-500" />
      <span className="text-red-500 font-bold">Erreur de connexion</span>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#fbf9f6] lg:flex-row font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto h-full scrollbar-hide lg:pb-10 pt-20 lg:pt-0">
        {/* --- DYNAMIC HEADER --- */}
        <div className="bg-white border-b border-[#e8dfcf] lg:border-none px-3 py-3 lg:p-10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 lg:gap-4">
              <div className="hidden lg:flex items-center gap-6">
                <div className="flex h-10 w-10 lg:h-16 lg:w-16 rounded-xl lg:rounded-3xl bg-[#8b5a2b] items-center justify-center shadow-2xl shadow-[#8b5a2b]/30">
                  <CalendarIcon className="h-5 w-5 lg:h-9 lg:w-9 text-white" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-4xl font-black text-[#3d2c1e] tracking-tight leading-none">
                    <span className="xs:inline hidden">Planning </span><span className="text-[#8b5a2b]">Bey</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 lg:mt-2">
                    <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-[#8b5a2b]/40" />
                    <p className="text-[10px] lg:text-sm font-bold text-[#8b5a2b]/60 uppercase tracking-[0.2em]">
                      {viewMode === "placement" ? `Placement ${DAYS.find(d => d.key === selectedDayKey)?.short}` : "Hebdo"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-between lg:justify-end gap-2">
                <div className="lg:hidden flex flex-col">
                  <h1 className="text-lg font-black text-[#8b5a2b] leading-tight">Bey</h1>
                  <p className="text-[9px] uppercase font-bold text-[#8b5a2b]/40 tracking-tighter">Planning</p>
                </div>
                {/* View Switchers */}
                <div className="flex flex-wrap items-center gap-1.5 lg:gap-4">
                  {/* Main Navigation Buttons */}
                  <div className="flex p-0.5 bg-[#f1e9db] rounded-lg lg:rounded-2xl border border-[#c9b896]/20">
                    <Link
                      href="/calendar"
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all",
                        viewMode !== "weekly" ? "bg-white text-[#8b5a2b] shadow-sm lg:shadow-xl" : "text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                      )}
                    >
                      <Book className="h-3 w-3 lg:h-5 lg:w-5" />
                      <span>Journal</span>
                    </Link>
                    <Link
                      href="/calendar/all"
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                      )}
                    >
                      <Users className="h-3 w-3 lg:h-5 lg:w-5" />
                      <span>Touts</span>
                    </Link>
                    <Link
                      href="/schedule"
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                      )}
                    >
                      <Edit3 className="h-3 w-3 lg:h-5 lg:w-5" />
                      <span>Créer</span>
                    </Link>
                  </div>

                  <div className="flex p-0.5 bg-[#8b5a2b]/5 rounded-lg lg:rounded-2xl border border-[#8b5a2b]/10">
                    <button
                      onClick={() => setViewMode("placement")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all",
                        viewMode === "placement" ? "bg-[#8b5a2b] text-white shadow-sm lg:shadow-xl" : "text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                      )}
                    >
                      <LayoutGrid className="h-3 w-3 lg:h-5 lg:w-5" />
                      <span>Focus</span>
                    </button>
                    <button
                      onClick={() => setViewMode("weekly")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all",
                        viewMode === "weekly" ? "bg-[#8b5a2b] text-white shadow-sm lg:shadow-xl" : "text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                      )}
                    >
                      <TableIcon className="h-3 w-3 lg:h-5 lg:w-5" />
                      <span>Table</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- GLOBAL SEARCH & DAY PICKER --- */}
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b5a2b]/40 group-focus-within:text-[#8b5a2b] transition-colors" />
                <input
                  type="text"
                  placeholder="Chercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 lg:h-16 pl-12 pr-4 rounded-xl lg:rounded-3xl bg-white lg:bg-white/50 border-2 border-[#c9b896]/20 focus:border-[#8b5a2b] focus:ring-8 focus:ring-[#8b5a2b]/5 outline-none font-bold text-[#3d2c1e] transition-all placeholder:text-[#8b5a2b]/30 text-sm lg:text-base"
                />
              </div>

              {viewMode === "placement" && (
                <div className="flex overflow-x-auto lg:overflow-visible gap-1 pb-1 sm:pb-0 scroll-smooth no-scrollbar">
                  {DAYS.map((day) => (
                    <button
                      key={day.key}
                      onClick={() => setSelectedDayKey(day.key)}
                      className={cn(
                        "flex-shrink-0 lg:flex-1 min-w-[60px] h-9 lg:h-16 rounded-lg lg:rounded-3xl font-black text-[10px] lg:text-sm transition-all border-2",
                        selectedDayKey === day.key
                          ? "bg-[#8b5a2b] border-[#8b5a2b] text-white shadow-lg"
                          : "bg-white border-transparent text-[#8b5a2b]/60 hover:bg-[#8b5a2b]/5"
                      )}
                    >
                      <span className="lg:hidden">{day.short}</span>
                      <span className="hidden lg:inline">{day.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- PLACEMENT VIEW (Mobile Optimized Accordions) --- */}
        {viewMode === "placement" && (
          <div className="px-4 lg:px-10 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 max-w-[1600px] mx-auto mt-6">
            {Object.keys(placementData).length > 0 ? (
              Object.keys(placementData).sort().map((dept) => (
                <div key={dept} className="lg:space-y-6">
                  {/* --- MOBILE ACCORDION (Visible only on lg:hidden) --- */}
                  <div className="lg:hidden border-2 border-[#e8dfcf] bg-white rounded-[2rem] overflow-hidden shadow-lg transition-all">
                    <button
                      onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}
                      className="w-full flex items-center justify-between p-6 bg-white active:bg-[#fbf9f6] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-[#8b5a2b]/5 border border-[#8b5a2b]/20 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-[#8b5a2b]" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold text-[#8b5a2b]/40 uppercase tracking-widest">Section</span>
                          <span className="text-xl font-black text-[#3d2c1e]">{dept}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#8b5a2b] text-white font-black">{Object.values(placementData[dept]).flat().length}</Badge>
                        <ChevronDown className={cn("h-6 w-6 text-[#8b5a2b] transition-transform duration-500", expandedDept === dept ? "rotate-180" : "")} />
                      </div>
                    </button>

                    {expandedDept === dept && (
                      <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {Object.keys(SHIFT_THEMES).map(shiftKey => {
                          const theme = SHIFT_THEMES[shiftKey]
                          const names = placementData[dept][shiftKey] || []
                          const Icon = theme.icon
                          if (shiftKey === "Repos" && names.length === 0) return null

                          return (
                            <div key={shiftKey} className={cn("p-4 rounded-2xl border-2 transition-all", theme.border, theme.bg)}>
                              <div className="flex items-center justify-between mb-3">
                                <div className={cn("flex items-center gap-2 font-black uppercase text-xs tracking-widest", theme.color)}>
                                  <Icon className="h-4 w-4" />
                                  {shiftKey}
                                </div>
                                <span className={cn("text-xs font-black", theme.color)}>{names.length}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {names.map((emp: any) => (
                                  <span key={emp.username} className="pl-1 pr-3 py-1 rounded-full bg-white text-[#3d2c1e] text-[10px] font-bold border border-[#c9b896]/20 shadow-sm flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-[#8b5a2b]/10 border border-[#8b5a2b]/20 flex items-center justify-center overflow-hidden">
                                      {emp.photo ? <img src={emp.photo} className="h-full w-full object-cover" /> : emp.username.charAt(0)}
                                    </div>
                                    {emp.username}
                                  </span>
                                ))}
                                {names.length === 0 && <span className="text-[10px] font-bold text-[#8b5a2b]/30 italic">Libre</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* --- DESKTOP GRID (Visible only on lg:flex) --- */}
                  <div className="hidden lg:block space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-2 rounded-full bg-[#8b5a2b]" />
                        <h2 className="text-3xl font-black text-[#3d2c1e] tracking-tight">{dept}</h2>
                        <Badge className="bg-[#8b5a2b]/10 text-[#8b5a2b] border-[#8b5a2b]/20 font-black h-8 px-4 rounded-xl ml-2">
                          {Object.values(placementData[dept]).flat().length} membres
                        </Badge>
                      </div>
                      <button className="flex items-center gap-2 text-[#8b5a2b] font-bold text-sm hover:translate-x-1 transition-transform">
                        Détails <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-8">
                      {Object.keys(SHIFT_THEMES).map(shiftKey => {
                        const theme = SHIFT_THEMES[shiftKey]
                        const names = placementData[dept][shiftKey] || []
                        const Icon = theme.icon
                        if (shiftKey === "Repos" && names.length === 0) return null

                        return (
                          <Card key={shiftKey} className={cn("p-8 rounded-[3rem] border-2 bg-white transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group/card", theme.border, names.length === 0 ? "opacity-30 grayscale" : "shadow-xl shadow-[#8b5a2b]/5")}>
                            <div className="flex items-center justify-between mb-8 relative z-10">
                              <div className={cn("flex items-center gap-4", theme.color)}>
                                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border-2 shadow-inner", theme.bg, theme.border)}>
                                  <Icon className="h-8 w-8" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Service</span>
                                  <span className="text-2xl font-[900] uppercase tracking-tighter">{shiftKey}</span>
                                </div>
                              </div>
                              <div className={cn("h-12 w-12 rounded-full flex items-center justify-center font-black text-xl", theme.bg, theme.color)}>
                                {names.length}
                              </div>
                            </div>

                            <div className="space-y-3 relative z-10">
                              {names.map((emp: any) => (
                                <div key={emp.username} className="flex items-center gap-4 p-4 rounded-2xl bg-[#fbf9f6] border border-[#c9b896]/20 transition-all hover:bg-white hover:border-[#8b5a2b] hover:shadow-lg hover:scale-105 group/name">
                                  <div className="h-12 w-12 rounded-full bg-[#8b5a2b]/5 flex items-center justify-center text-[#8b5a2b] font-black text-sm border-2 border-[#8b5a2b]/10 group-hover/name:bg-[#8b5a2b] group-hover/name:text-white transition-all overflow-hidden flex-shrink-0">
                                    {emp.photo ? <img src={emp.photo} className="h-full w-full object-cover" /> : emp.username.charAt(0)}
                                  </div>
                                  <span className="font-black text-[#3d2c1e] text-lg truncate">{emp.username}</span>
                                </div>
                              ))}
                              {names.length === 0 && (
                                <div className="py-8 text-center text-[#c9b896] italic font-bold">Aucun employé</div>
                              )}
                            </div>
                            <div className={cn("absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-5 group-hover/card:scale-150 transition-transform duration-1000", theme.bg)} />
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-40 gap-8">
                <div className="h-32 w-32 rounded-full bg-[#8b5a2b]/5 flex items-center justify-center animate-pulse">
                  <Search className="h-12 w-12 text-[#8b5a2b]/20" />
                </div>
                <p className="text-2xl font-black text-[#3d2c1e]/30">Désolé, aucun Bey n'a été trouvé.</p>
              </div>
            )}
          </div>
        )}

        {/* --- WEEKLY VIEW (Ultra Responsive) --- */}
        {viewMode === "weekly" && (
          <div className="px-4 lg:px-10 pb-24 animate-in zoom-in-95 duration-500 max-w-[1600px] mx-auto mt-6">
            <Card className="hidden lg:block rounded-[4rem] border-[#c9b896]/30 shadow-[0_40px_100px_-20px_rgba(139,90,43,0.15)] overflow-hidden bg-white">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#2d1e12] text-white uppercase text-[10px] font-black tracking-[0.3em]">
                      <th className="p-12 text-left sticky left-0 z-20 bg-[#2d1e12] border-r border-[#c9b896]/10 min-w-[320px]">Collaborateur</th>
                      {DAYS.map(day => (
                        <th key={day.key} className="p-8 text-center border-r border-[#c9b896]/10 min-w-[180px]">{day.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1e9db]">
                    {Object.keys(weeklyGroupedByDept).sort().map(dept => (
                      <React.Fragment key={dept}>
                        <tr className="bg-[#fcf8f3]">
                          <td colSpan={8} className="p-8 sticky left-0 z-10 bg-[#fcf8f3] border-b border-[#c9b896]/20">
                            <div className="flex items-center gap-4">
                              <Layers className="h-6 w-6 text-[#8b5a2b]" />
                              <span className="text-2xl font-black text-[#3d2c1e]">{dept}</span>
                            </div>
                          </td>
                        </tr>
                        {weeklyGroupedByDept[dept].map((emp: any) => (
                          <tr key={emp.user_id} className="group hover:bg-[#8b5a2b]/5 transition-colors">
                            <td className="p-8 sticky left-0 z-10 bg-white border-r border-[#f1e9db] transition-colors group-hover:bg-[#fcf8f3]">
                              <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-white border-2 border-[#c9b896]/20 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all overflow-hidden">
                                  {emp.photo ? <img src={emp.photo} className="h-full w-full object-cover" /> : <UserIcon className="h-7 w-7 text-[#8b5a2b]" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xl font-black text-[#3d2c1e] tracking-tight">{emp.username}</span>
                                  <span className="text-xs font-bold text-[#8b5a2b]/50">Réf: {emp.user_id}</span>
                                </div>
                              </div>
                            </td>
                            {DAYS.map(day => {
                              const shift = emp[day.key] || "Non configuré"
                              const theme = SHIFT_THEMES[shift]
                              const Icon = theme.icon
                              return (
                                <td key={day.key} className="p-6 text-center border-r border-[#f1e9db]">
                                  <div className={cn("inline-flex flex-col items-center justify-center gap-2 p-6 rounded-[2.5rem] border-2 transition-all w-[140px] shadow-sm", theme.bg, theme.border, theme.color, (shift === "Repos" || shift === "Non configuré") && "opacity-30")}>
                                    <Icon className="h-6 w-6" />
                                    <span className="text-[10px] font-black uppercase">{shift}</span>
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
            </Card>

            {/* Mobile Weekly View (Compact Employee Cards) */}
            <div className="lg:hidden space-y-10 mt-6">
              {Object.keys(weeklyGroupedByDept).sort().map(dept => (
                <div key={dept} className="space-y-6">
                  <div className="flex items-center gap-4 px-2">
                    <div className="h-8 w-1 rounded-full bg-[#8b5a2b]" />
                    <h3 className="text-2xl font-black text-[#3d2c1e]">{dept}</h3>
                  </div>
                  <div className="space-y-6 px-1">
                    {weeklyGroupedByDept[dept].map((emp: any) => (
                      <Card key={emp.user_id} className="p-6 rounded-[2.5rem] border-2 border-[#e8dfcf] bg-white shadow-xl overflow-hidden active:scale-95 transition-transform">
                        <div className="flex items-center gap-5 mb-8">
                          <div className="h-14 w-14 rounded-2xl bg-[#8b5a2b] flex items-center justify-center text-white shadow-lg overflow-hidden">
                            {emp.photo ? <img src={emp.photo} className="h-full w-full object-cover" /> : <UserIcon className="h-7 w-7" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-[#3d2c1e] tracking-tight">{emp.username}</span>
                            <span className="text-xs font-bold text-[#8b5a2b]/40">Planning Semaine</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 xs:grid-cols-7 gap-2 xs:gap-3">
                          {DAYS.map(day => {
                            const shift = emp[day.key] || "Non configuré"
                            const theme = SHIFT_THEMES[shift]
                            return (
                              <div key={day.key} className={cn("flex flex-col items-center gap-1.5 xs:gap-2 p-2 xs:p-3 rounded-2xl border-2", theme.bg, theme.border, theme.color, (shift === "Repos" || shift === "Non configuré") && "opacity-40")}>
                                <span className="text-[9px] xs:text-[10px] font-black">{day.short}</span>
                                <theme.icon className="h-4 w-4 xs:h-5 xs:w-5" />
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- LEGEND (Premium Interactive) --- */}
        <div className="px-4 lg:px-10 mb-32 max-w-[1600px] mx-auto mt-12">
          <Card className="bg-[#2d1e12] p-8 lg:p-16 rounded-[2.5rem] lg:rounded-[5rem] text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center text-center gap-10">
              <div className="space-y-3">
                <h4 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter">Légende Officielle Bey</h4>
                <div className="h-1 w-24 bg-[#8b5a2b] mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-16 w-full max-w-4xl">
                {Object.keys(SHIFT_THEMES).map(key => {
                  const theme = SHIFT_THEMES[key]
                  const Icon = theme.icon
                  return (
                    <div key={key} className="flex flex-col items-center gap-4 group/item cursor-pointer">
                      <div className={cn("h-16 w-16 lg:h-24 lg:w-24 rounded-[2rem] flex items-center justify-center transition-all group-hover/item:rotate-12 group-hover/item:scale-110 shadow-2xl", theme.bg, theme.color)}>
                        <Icon className="h-8 w-8 lg:h-12 lg:w-12" />
                      </div>
                      <span className="text-xs lg:text-base font-black uppercase tracking-[0.2em] opacity-60 group-hover/item:opacity-100">{key}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Artistic flair */}
            <div className="absolute top-0 right-0 h-full w-1/4 bg-white/5 skew-x-[30deg] translate-x-12" />
            <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#8b5a2b]/20 blur-[100px]" />
          </Card>
        </div>
      </main>
    </div>
  )
}
