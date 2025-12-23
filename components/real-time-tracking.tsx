"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowUpRight, Radio, RefreshCw, Calendar as CalendarIcon } from "lucide-react"
import { gql, useQuery } from "@apollo/client"
import { AttendanceHistoryModal } from "./attendance-history-modal"
import { LiveFeedModal } from "./live-feed-modal" // Added import
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

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

        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full sm:min-w-[800px] px-4 sm:px-0">
            {/* Table Header */}
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 sm:gap-4 py-3 border-b border-[#c9b896] text-[9px] sm:text-sm font-bold sm:font-medium text-[#6b5744] uppercase sm:normal-case">
              <div className="hidden sm:block text-center sm:text-left">ID</div>
              <div className="col-span-2 sm:col-span-1">Employé</div>
              <div className="hidden md:block">Département</div>
              <div className="text-center sm:text-left">Entrée</div>
              <div className="text-center sm:text-left">Sortie</div>
              <div className="hidden sm:block">Shift</div>
              <div className="text-center sm:text-left">État</div>
              <div className="hidden sm:block">Heures</div>
              <div className="text-right sm:text-left">Action</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-[#e8e0d5]">
              {filteredEmployees.map((emp: any) => (
                <div key={emp.id} className="grid grid-cols-6 sm:grid-cols-9 gap-1 sm:gap-4 py-3 sm:py-4 items-center text-[10px] sm:text-sm">
                  <div className="hidden sm:block text-[#6b5744] font-mono">{emp.zktecoId}</div>

                  <div className="col-span-2 sm:col-span-1 font-bold sm:font-semibold text-[#3d2c1e] uppercase flex items-center gap-1 sm:gap-2 min-w-0">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#8b5a2b]/10 flex items-center justify-center text-[#8b5a2b] font-bold overflow-hidden border border-[#c9b896]/30 shrink-0">
                      {emp.photo ? (
                        <img src={emp.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] sm:text-[10px]">{emp.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 text-[9px] sm:text-sm">
                      <span className="truncate leading-tight font-semibold">{emp.name}</span>
                      <span className="text-[10px] sm:text-xs text-[#8b5a2b] font-bold truncate">
                        📅 {format(date || new Date(), 'dd/MM/yyyy')}
                      </span>
                      <span className="md:hidden text-[8px] text-[#6b5744] opacity-80 font-medium truncate tracking-tight">
                        {emp.department}
                      </span>
                    </div>
                  </div>

                  <div className="hidden md:block text-[#6b5744] truncate">{emp.department}</div>
                  <div className="text-[#3d2c1e] font-mono text-center sm:text-left">{emp.clockIn}</div>
                  <div className="text-[#3d2c1e] font-mono text-center sm:text-left">{emp.clockOut}</div>
                  <div className="hidden sm:block text-[#3d2c1e] font-bold">{emp.shift}</div>

                  <div className="flex flex-col justify-center sm:justify-start items-center sm:items-start gap-1">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-xs font-black uppercase tracking-tighter sm:tracking-normal ${(emp.status === "Connecté" || emp.status === "Présent")
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : emp.status === "Terminé"
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : emp.status === "Retard"
                            ? "bg-amber-100 text-amber-700 border border-amber-300"
                            : emp.status === "Missing_Exit"
                              ? "bg-orange-100 text-orange-700 border border-orange-300"
                              : emp.status === "Repos"
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : "bg-rose-100 text-rose-700 border border-rose-300"
                        }`}
                    >
                      {emp.status === "Missing_Exit" ? "Sortie Manquante" : (emp.status === "Connecté" ? "Présent" : emp.status)}
                    </span>
                    {emp.status === "Retard" && emp.delay && (
                      <span className="text-[9px] sm:text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 animate-pulse whitespace-nowrap">
                        -{emp.delay}
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:block font-medium text-[#3d2c1e]">
                    {emp.totalMins > 0 ? `${Math.floor(emp.totalMins / 60)}h ${emp.totalMins % 60}m` : "0h"}
                  </div>

                  <div className="text-right sm:text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-[#8b5a2b] hover:bg-[#f5f0e8]"
                      onClick={() => {
                        setSelectedUser({ id: emp.id, name: emp.name });
                        setIsModalOpen(true);
                      }}
                    >
                      <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
    </div >
  )
}
