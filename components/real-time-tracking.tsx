"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowUpRight, Radio, RefreshCw, Calendar as CalendarIcon } from "lucide-react"
import { gql, useQuery, useMutation } from "@apollo/client"
import { AttendanceHistoryModal } from "./attendance-history-modal"
import { PardonModal } from "./pardon-modal"
import { LiveFeedModal } from "./live-feed-modal" // Added import
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/mock-data"

const GET_PERSONNEL_STATUS = gql`
  query GetPersonnelStatus($date: String) {
    personnelStatus(date: $date) {
      user {
        id
        username
        zktime_id
        departement
        photo
        is_blocked
      }
      clockIn
      clockOut
      state
      shift
      lastPunch
      delay
      infraction
      remarque
    }
  }
`
const PARDON_LATE = gql`
  mutation PardonLate($userId: ID!, $date: String!) {
    pardonLate(userId: $userId, date: $date) {
      id
      retard
      infraction
      clock_in
      clock_out
    }
  }
`

type FilterType = "tous" | "avec" | "sans"

export function RealTimeTracking({ initialData }: { initialData?: any }) {
  const getLogicalNow = () => {
    const d = new Date();
    if (d.getHours() < 4) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  const logicalNow = getLogicalNow();
  const year = logicalNow.getFullYear();
  const month = String(logicalNow.getMonth() + 1).padStart(2, '0');
  const day = String(logicalNow.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Ideally, manage date as Date object for Calendar, string for API
  const [date, setDate] = useState<Date | undefined>(logicalNow)
  const [liveMonitorStart, setLiveMonitorStart] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("tous")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string | null, name: string }>({ id: null, name: "" })
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false) // Added state
  const [isPardonModalOpen, setIsPardonModalOpen] = useState(false)
  const [pardonEmployee, setPardonEmployee] = useState<any>(null)

  const [pardonLate] = useMutation(PARDON_LATE, {
    onCompleted: () => {
      refetch();
    }
  });

  const sessionUser = getCurrentUser();
  const permissions = sessionUser?.permissions ? (JSON.parse(sessionUser.permissions) || {}) : {};
  const canPardon = sessionUser?.role !== 'manager' && (permissions?.attendance?.pardon) !== false;

  const handlePardonClick = (emp: any) => {
    if (!canPardon) return;
    setPardonEmployee(emp);
    setIsPardonModalOpen(true);
  };

  const handleConfirmPardon = async () => {
    if (!pardonEmployee) return;
    try {
      await pardonLate({
        variables: {
          userId: pardonEmployee.id,
          date: formattedDate
        }
      });
      setIsPardonModalOpen(false);
      setPardonEmployee(null);
    } catch (e: any) {
      alert("Erreur: " + e.message);
    }
  };

  // Format date for API
  const formattedDate = date ? format(date, "yyyy-MM-dd") : todayStr;

  const { data: queryData, loading, error, refetch } = useQuery(GET_PERSONNEL_STATUS, {
    variables: { date: formattedDate },
    pollInterval: isLiveFeedOpen ? 5000 : 0, // Poll every 5s when live view is active
    fetchPolicy: formattedDate === todayStr && !isLiveFeedOpen ? "cache-first" : "cache-and-network",
    nextFetchPolicy: "cache-first",
    skip: !!initialData && formattedDate === todayStr && !isLiveFeedOpen,
    notifyOnNetworkStatusChange: false,
  })

  // Merge initialData with queryData
  const data = (formattedDate === todayStr && initialData && !queryData) ? { personnelStatus: initialData } : queryData;

  // Start Real Time Monitor
  const handleStartRealTime = () => {
    const now = new Date();
    setLiveMonitorStart(now);
    setIsLiveFeedOpen(true); // Added this line
    setDate(now); // Ensure we are looking at Today
    refetch();
  }

  // Combine employee data with attendance status from API
  const employeeStatus = useMemo(() => {
    if (!data?.personnelStatus) return []

    return data.personnelStatus
      .filter((item: any) => {
        // Filter out blocked users and admins from basic processing
        return !item.user.is_blocked && item.user.role !== 'admin'
      })
      .map((item: any) => {
        const { user, clockIn, clockOut, shift, lastPunch, state: apiState } = item

        let status = apiState || "Absent"
        if (status === "Présent" && clockOut) status = "Terminé"

        // Calculate total minutes worked
        let totalMins = 0;
        if (clockIn && clockOut) {
          try {
            const [h1, m1] = clockIn.split(':').map(Number);
            const [h2, m2] = clockOut.split(':').map(Number);
            let startMins = h1 * 60 + m1;
            let endMins = h2 * 60 + m2;
            if (endMins < startMins) endMins += 24 * 60; // Overnight
            totalMins = endMins - startMins;
          } catch (e) { }
        }

        return {
          id: user.id,
          name: user.username,
          photo: user.photo,
          zktecoId: user.zktime_id?.toString() || "-",
          department: user.departement || user.department || "Personnel",
          clockIn: clockIn || "--:--",
          clockOut: clockOut || "--:--",
          totalMins: totalMins,
          shift: shift || "-",
          isConnected: !!clockIn || !!clockOut || apiState === 'Présent' || apiState === 'Retard',
          status: status,
          delay: item.delay,
          infraction: item.infraction,
          remarque: item.remarque,
          lastPunch: lastPunch // ISO String
        }
      })
  }, [data])

  // Apply filters for the DISPLAY TABLE
  const filteredEmployees = useMemo(() => {
    // START with all employees for this day
    let result = employeeStatus

    // DEFAULT FILTER: If no explicit search/filter, only show "Active" people
    // This keeps the dashboard empty/clean when nobody is working
    if (!searchQuery && filter === "tous") {
      result = result.filter((emp: any) =>
        emp.status === "Présent" ||
        emp.status === "Retard" ||
        emp.status === "Terminé" ||
        emp.status === "Missing_Exit"
      );
    }

    // Explicit Filter overrides
    if (filter === "avec") {
      result = result.filter((emp: any) => emp.isConnected)
    } else if (filter === "sans") {
      // Show people who SHOULD be here but aren't
      result = employeeStatus.filter((emp: any) => !emp.isConnected && emp.status !== "Repos")
    }

    // Search re-expands to full list
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = employeeStatus.filter(
        (emp: any) =>
          emp.name?.toLowerCase().includes(searchLower) ||
          emp.zktecoId?.includes(searchQuery)
      )
    }

    return result
  }, [employeeStatus, searchQuery, filter])

  if (loading && !data) {
    return <div className="p-8 text-center text-[#6b5744]">Chargement des données en temps réel...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Erreur de chargement: {error.message}</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl font-bold text-[#8b5a2b]">
          Suivi en Temps Réel
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-[#8b5a2b] text-[#8b5a2b] hover:bg-[#8b5a2b] hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button
            onClick={handleStartRealTime}
            className="bg-[#8b5a2b] hover:bg-[#6b4423] text-white gap-2 flex-1 sm:flex-none"
          >
            <Radio className="h-4 w-4 animate-pulse" />
            <span className="hidden sm:inline">Afficher</span> Temps Réel
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="bg-white border-[#c9b896] p-4 sm:p-6 shadow-md">
        {/* Card Header */}
        <div className="mb-6">
          <h3 className="font-[family-name:var(--font-heading)] text-lg sm:text-xl font-semibold text-[#3d2c1e]">
            État du Personnel
          </h3>
          <p className="text-sm text-[#6b5744]">État actuel de tout le personnel du restaurant</p>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Date Range - Styled Calendar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal border-[#c9b896] text-[#3d2c1e] bg-[#faf8f5] hover:bg-[#f5f0e8]",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#8b5a2b]" />
                  {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  classNames={{
                    day_selected: "bg-[#8b5a2b] text-white hover:bg-[#8b5a2b] hover:text-white focus:bg-[#8b5a2b] focus:text-white",
                    day_today: "bg-[#f5f0e8] text-[#3d2c1e]",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b5744]" />
            <Input
              placeholder="Rechercher par nom ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#c9b896] bg-[#faf8f5] text-[#3d2c1e] placeholder:text-[#a89a8c]"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === "avec" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === "avec" ? "tous" : "avec")}
              className={
                filter === "avec"
                  ? "bg-[#8b5a2b] text-white hover:bg-[#6b4423]"
                  : "border-[#c9b896] text-[#6b5744] hover:bg-[#f5f0e8]"
              }
            >
              Avec Pointage
            </Button>
            <Button
              variant={filter === "sans" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === "sans" ? "tous" : "sans")}
              className={
                filter === "sans"
                  ? "bg-[#8b5a2b] text-white hover:bg-[#6b4423]"
                  : "border-[#c9b896] text-[#6b5744] hover:bg-[#f5f0e8]"
              }
            >
              Sans Pointage
            </Button>
            <Button
              variant={filter === "tous" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("tous")}
              className={
                filter === "tous"
                  ? "bg-[#8b5a2b] text-white hover:bg-[#6b4423]"
                  : "border-[#c9b896] text-[#6b5744] hover:bg-[#f5f0e8]"
              }
            >
              Tous
            </Button>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden min-[1100px]:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f6f1] border-b border-[#c9b896]">
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs">ID</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs">Employé</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs">Département</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-center">Entrée</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-center">Sortie</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-center">Shift</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-center">État</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-center">Heures</th>
                <th className="px-4 py-4 font-bold text-[#8b5a2b] uppercase tracking-widest text-[10px] sm:text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c9b896]/30">
              {filteredEmployees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-[#f8f6f1]/50 transition-colors group">
                  <td className="px-4 py-4">
                    <span className="text-xs font-black text-[#8b5a2b] opacity-40 bg-[#8b5a2b]/5 px-2 py-1 rounded">#{emp.zktecoId || emp.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div
                      className={cn(
                        "flex items-center gap-3 group/item transition-all",
                        emp.status === "Retard" && canPardon && "cursor-pointer"
                      )}
                      onClick={() => emp.status === "Retard" && canPardon && handlePardonClick(emp)}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#c9b896] flex items-center justify-center text-white font-black text-xs shadow-md overflow-hidden border border-[#c9b896]/30 transition-transform",
                        emp.status === "Retard" && "group-hover/item:scale-110 group-hover/item:border-[#8b5a2b] ring-offset-2 group-hover/item:ring-2 ring-amber-400"
                      )}>
                        {emp.photo ? (
                          <img src={emp.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          emp.name?.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "font-bold text-[#3d2c1e] text-base leading-tight",
                          emp.status === "Retard" && "group-hover/item:text-[#8b5a2b]"
                        )}>{emp.name}</span>
                        <span className="text-[10px] text-[#8b5a2b] opacity-60 font-black uppercase tracking-widest">
                          📅 {format(date || new Date(), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[#6b5744] font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 bg-[#8b5a2b]/5 rounded border border-[#8b5a2b]/10">{emp.department}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-mono font-black text-[#3d2c1e] text-base">{emp.clockIn}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-mono font-black text-[#3d2c1e] text-base">{emp.clockOut}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border",
                      emp.shift === "Soir" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                        emp.shift === "Matin" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          emp.shift === "Doublage" ? "bg-purple-50 text-purple-700 border-purple-100" :
                            "bg-gray-50 text-gray-500 border-gray-100"
                    )}>
                      {emp.shift || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-sm",
                          (emp.status === "Connecté" || emp.status === "Présent")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : emp.status === "Terminé"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : emp.status === "Retard"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : emp.status === "Missing_Exit"
                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : emp.status === "Repos"
                                    ? "bg-slate-50 text-slate-500 border-slate-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {emp.status === "Missing_Exit" ? "Sortie Manquante" : (emp.status === "Connecté" ? "Présent" : emp.status)}
                      </span>
                      {emp.status === "Retard" && emp.delay && (
                        <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 animate-pulse whitespace-nowrap">
                          -{emp.delay}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-base font-black text-emerald-700">{emp.totalMins > 0 ? `${Math.floor(emp.totalMins / 60)}h ${emp.totalMins % 60}m` : "0h"}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-[#8b5a2b] border-[#c9b896] hover:bg-[#8b5a2b] hover:text-white transition-all shadow-sm rounded-lg"
                      onClick={() => {
                        setSelectedUser({ id: emp.id, name: emp.name });
                        setIsModalOpen(true);
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="min-[1100px]:hidden flex flex-col divide-y divide-[#c9b896]/20">
          {filteredEmployees.map((emp: any) => (
            <div
              key={emp.id}
              className="group relative p-5 bg-white flex flex-col gap-4 border-b border-[#c9b896]/20 active:bg-[#fcfbf9] transition-all duration-300"
              onClick={() => {
                if (emp.status === "Retard" && canPardon) {
                  handlePardonClick(emp);
                } else {
                  setSelectedUser({ id: emp.id, name: emp.name });
                  setIsModalOpen(true);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#8b5a2b] to-[#c9b896] p-[1px] shadow-sm overflow-hidden border border-[#c9b896]/30">
                      {emp.photo ? (
                        <img src={emp.photo} alt="" className="w-full h-full object-cover rounded-[15px]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg uppercase bg-[#8b5a2b]">
                          {emp.name?.substring(0, 1)}
                        </div>
                      )}
                    </div>
                    {/* Active Pulse indicator if present */}
                    {(emp.status === "Connecté" || emp.status === "Présent") && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5 shadow-sm">
                        <div className="h-full w-full rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-bold text-[#3d2c1e] text-lg leading-tight truncate">
                      {emp.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-[#8b5a2b]/60 uppercase tracking-widest bg-[#8b5a2b]/5 px-1.5 py-0.5 rounded">
                        {emp.department}
                      </span>
                      <span className="text-[10px] text-[#8b5a2b]/40 font-bold">
                        #{emp.zktecoId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 text-[#8b5a2b] border-[#c9b896]/50 bg-white hover:bg-[#8b5a2b] hover:text-white transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser({ id: emp.id, name: emp.name });
                      setIsModalOpen(true);
                    }}
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Status Band */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-sm",
                      (emp.status === "Connecté" || emp.status === "Présent")
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : emp.status === "Terminé"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : emp.status === "Retard"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : emp.status === "Missing_Exit"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : emp.status === "Repos"
                                ? "bg-slate-50 text-slate-500 border-slate-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {emp.status === "Missing_Exit" ? "Sortie Manquante" : (emp.status === "Connecté" ? "Présent" : emp.status)}
                  </span>
                  {emp.status === "Retard" && emp.delay && (
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 animate-pulse">
                      -{emp.delay}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-[#f8f6f1] px-2 py-1 rounded-lg border border-[#c9b896]/10">
                  <span className="text-[9px] font-black text-[#8b5a2b]/70 uppercase tracking-tighter">
                    {emp.shift || "—"}
                  </span>
                </div>
              </div>

              {/* Time Details Grid */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="bg-[#faf8f5] p-3 rounded-2xl border border-[#c9b896]/10 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[8px] font-black text-[#8b5a2b]/40 uppercase tracking-widest">Entrée</span>
                  <span className="font-mono font-black text-[#3d2c1e] text-base">{emp.clockIn || "--:--"}</span>
                </div>
                <div className="bg-[#faf8f5] p-3 rounded-2xl border border-[#c9b896]/10 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[8px] font-black text-[#8b5a2b]/40 uppercase tracking-widest">Sortie</span>
                  <span className="font-mono font-black text-[#3d2c1e] text-base">{emp.clockOut || "--:--"}</span>
                </div>
                <div className="bg-[#f0f9f4] p-3 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[8px] font-black text-emerald-700/50 uppercase tracking-widest">Temps</span>
                  <span className="font-black text-emerald-700 text-base">
                    {emp.totalMins > 0 ? `${Math.floor(emp.totalMins / 60)}h ${emp.totalMins % 60}m` : "0h"}
                  </span>
                </div>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-[9px] font-bold text-[#8b5a2b]/30 uppercase tracking-[0.2em] px-1">
                <span>Business Bey — L'aouina</span>
                <span>{format(date || new Date(), "dd/MM/yyyy")}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {
          filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-[#6b5744]">
              <p>Aucun employé trouvé avec ces critères.</p>
            </div>
          )
        }

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-[#c9b896] flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span className="text-[#6b5744]">
              Présents: {employeeStatus.filter((e: any) => e.status === "Connecté" || e.status === "Présent" || e.status === "Terminé").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500"></span>
            <span className="text-[#6b5744]">
              Retards: {employeeStatus.filter((e: any) => e.status === "Retard").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500"></span>
            <span className="text-[#6b5744]">
              Absents: {employeeStatus.filter((e: any) => e.status === "Absent" || e.status === "Missing_Exit").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-400"></span>
            <span className="text-[#6b5744]">
              En Repos: {employeeStatus.filter((e: any) => e.status === "Repos").length}
            </span>
          </div>
        </div>
      </Card >

      <AttendanceHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUser.id}
        userName={selectedUser.name}
      />

      <LiveFeedModal
        isOpen={isLiveFeedOpen}
        onClose={() => setIsLiveFeedOpen(false)}
        startTime={liveMonitorStart}
        data={employeeStatus}
      />

      <PardonModal
        isOpen={isPardonModalOpen}
        onClose={() => setIsPardonModalOpen(false)}
        onConfirm={handleConfirmPardon}
        employee={pardonEmployee}
      />
    </div >
  )
}
