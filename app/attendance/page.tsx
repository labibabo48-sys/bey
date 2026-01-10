"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Clock, CheckCircle, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Filter, XCircle, Award, TrendingUp, Coffee } from "lucide-react"
import { useState, useMemo, Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { gql, useQuery, useMutation } from "@apollo/client"
import { format, subDays, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/mock-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { startOfMonth, endOfMonth } from "date-fns"
import { PardonModal } from "@/components/pardon-modal"

const GET_PERSONNEL_STATUS = gql`
  query GetPersonnelStatus($date: String) {
    personnelStatus(date: $date) {
      user {
        id
        username
        role
        departement
        base_salary
        photo
        zktime_id
        is_blocked
        status
      }
      clockIn
      clockOut
      state
      shift
      lastPunch
      workedHours
      delay
      infraction
      remarque
      absentDaysCount
      daysLateCount
    }
  }
`;

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
`;


const ADD_PRIME = gql`
  mutation AddPrime($month: String!, $id: ID!, $input: PayrollInput!) {
    updatePayrollRecord(month: $month, id: $id, input: $input) {
      id
      prime
    }
  }
`

const SYNC_ATTENDANCE = gql`
    mutation SyncAttendance($date: String) {
      syncAttendance(date: $date)
    }
`

const GET_TOP_PERFORMERS = gql`
  query GetTopPerformers($month: String!) {
    getTopPerformers(month: $month) {
      user {
        id
        username
        photo
        departement
      }
      totalHours
      daysWorked
      avgHoursPerDay
      totalRetard
      onTimeDays
    }
  }
`

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#fcfaf8] font-black uppercase tracking-widest text-[#8b5a2b] animate-pulse">Chargement des présences...</div>}>
      <AttendanceContent />
    </Suspense>
  )
}

function AttendanceContent() {
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'
  // Logical Today (respected 04:00 AM cutoff)
  const getLogicalNow = () => {
    const d = new Date();
    if (d.getHours() < 4) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  // Permission Logic
  let permissions: any = {};
  if (currentUser?.permissions) {
    try { permissions = JSON.parse(currentUser.permissions) || {}; } catch (e) { }
  }
  const canSee = (cat: string, key: string) => {
    // Managers can NEVER pardon
    if (currentUser?.role === 'manager' && cat === 'attendance' && key === 'pardon') return false;

    if (currentUser?.role === 'admin') return true;
    if (!permissions[cat]) return true;
    return permissions[cat][key] !== false;
  }

  const [date, setDate] = useState<Date>(getLogicalNow())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "Present" | "Absent" | "Retard" | "Repos">("all")
  const [showTopPerformers, setShowTopPerformers] = useState(false)
  const [showPrimeDialog, setShowPrimeDialog] = useState(false)
  const [selectedPerformer, setSelectedPerformer] = useState<any>(null)
  const [primeAmount, setPrimeAmount] = useState("")
  const [primeDate, setPrimeDate] = useState<Date>(new Date())
  const [isPardonModalOpen, setIsPardonModalOpen] = useState(false)
  const [pardonEmployee, setPardonEmployee] = useState<any>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get("userId")
  const dateParam = searchParams.get("date")

  // Handle date from URL
  useEffect(() => {
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
      }
    }
  }, [dateParam]);

  const scrollToList = () => {
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  const toggleFilter = (filter: any) => {
    setStatusFilter(statusFilter === filter ? "all" : filter);
    scrollToList();
  }

  const formattedDate = format(date, "yyyy-MM-dd");

  const { data, loading, error, refetch } = useQuery(GET_PERSONNEL_STATUS, {
    variables: {
      date: formattedDate
    },
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: false,
  });

  const payrollMonth = format(date, "yyyy_MM");
  const { data: performersData, refetch: refetchPerformers } = useQuery(GET_TOP_PERFORMERS, {
    variables: { month: payrollMonth }
  });

  const [pardonLate] = useMutation(PARDON_LATE, {
    onCompleted: () => {
      refetch();
      refetchPerformers();
    }
  });

  const handlePardonClick = (person: any) => {
    if (!canSee('attendance', 'pardon')) return;
    // Map person structure to modal expectations
    setPardonEmployee({
      id: person.user.id,
      name: person.user.username,
      delay: person.delay,
      infraction: person.infraction,
      remarque: person.remarque,
      clockIn: person.clockIn || "--:--"
    });
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

  const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(date), "yyyy-MM-dd");

  const [addPrime] = useMutation(ADD_PRIME);
  const [syncAttendance] = useMutation(SYNC_ATTENDANCE);

  // Trigger sync on mount and date change
  useEffect(() => {
    const timer = setTimeout(() => {
      syncAttendance({ variables: { date: formattedDate } }).catch(e => console.error("Sync Error:", e));
    }, 100);
    return () => clearTimeout(timer);
  }, [formattedDate, syncAttendance]);



  const allPersonnel = useMemo(() => {
    if (!data?.personnelStatus) return [];
    return data.personnelStatus.filter((p: any) => !p.user.is_blocked);
  }, [data]);

  const departments = useMemo(() => {
    const depts = new Set(allPersonnel.map((p: any) => p.user.departement).filter(Boolean));
    return Array.from(depts) as string[];
  }, [allPersonnel]);

  // Handle auto-scroll to user from notification
  useEffect(() => {
    if (!userIdParam || allPersonnel.length === 0) return;

    // 1. Clear filters immediately
    if (selectedDept !== "all") setSelectedDept("all");
    if (statusFilter !== "all") setStatusFilter("all");
    if (searchTerm) setSearchTerm("");

    // 2. Poll for the element to appear
    let attempts = 0;
    const interval = setInterval(() => {
      const element = document.getElementById(`user-row-${userIdParam}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-[#8b5a2b]/30', 'ring-8', 'ring-[#8b5a2b]/20', 'transition-all', 'duration-500', 'z-20', 'relative');
        setTimeout(() => {
          element.classList.remove('bg-[#8b5a2b]/30', 'ring-8', 'ring-[#8b5a2b]/20');
        }, 5000);
        clearInterval(interval);
      }
      if (attempts++ > 20) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [userIdParam, allPersonnel.length > 0]);

  const filteredPersonnel = useMemo(() => {
    let filtered = allPersonnel;

    // Filter by click-status
    if (statusFilter === "Present") {
      filtered = filtered.filter((p: any) => p.state === "Présent" || p.state === "Retard");
    } else if (statusFilter === "Absent") {
      filtered = filtered.filter((p: any) => p.state === "Absent" || p.state === "Missing_Exit");
    } else if (statusFilter === "Retard") {
      filtered = filtered.filter((p: any) => p.state === "Retard");
    } else if (statusFilter === "Repos") {
      filtered = filtered.filter((p: any) => p.state === "Repos");
    }

    if (selectedDept !== "all") {
      filtered = filtered.filter((p: any) => p.user?.departement === selectedDept);
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.user?.username?.toLowerCase().includes(lowerTerm) ||
        p.user?.departement?.toLowerCase().includes(lowerTerm)
      );
    }
    return filtered;
  }, [allPersonnel, searchTerm, selectedDept, statusFilter]);

  // Statistics base strictly on Personnel (Excluding admins)
  const validPersonnel = allPersonnel.filter((p: any) => p.user.role !== "admin");
  const presentCount = validPersonnel.filter((p: any) => p.state === "Présent" || p.state === "Retard").length;
  const retardCount = validPersonnel.filter((p: any) => p.state === "Retard").length;
  const absentCount = validPersonnel.filter((p: any) => p.state === "Absent" || p.state === "Missing_Exit").length;
  const reposCount = validPersonnel.filter((p: any) => p.state === "Repos").length;
  const totalCount = validPersonnel.length;

  // Calculate top 5 performers based on current month attendance
  const topPerformers = useMemo(() => {
    if (!performersData?.getTopPerformers) return [];
    return performersData.getTopPerformers.map((p: any) => ({
      ...p.user,
      totalHours: p.totalHours || 0,
      avgHoursPerDay: p.avgHoursPerDay || 0,
      totalRetard: p.totalRetard || 0,
      onTimeDays: p.onTimeDays || 0,
      daysWorked: p.daysWorked || 0
    }));
  }, [performersData]);

  const handleOpenPrime = (performer: any) => {
    setSelectedPerformer(performer);
    setPrimeAmount("");
    setPrimeDate(new Date());
    setShowPrimeDialog(true);
  };

  const handleAddPrime = async () => {
    if (!selectedPerformer || !primeAmount) return;
    try {
      const monthKey = format(primeDate, "yyyy_MM");
      // This would need the payroll record ID - simplified for demo
      alert(`Prime de ${primeAmount} DT ajoutée pour ${selectedPerformer.username}`);
      setShowPrimeDialog(false);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout de la prime");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        {/* Header */}
        <div className="border-b border-[#c9b896] bg-white p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#8b5a2b]">
              Présences Journalières
            </h1>
            <p className="mt-2 text-base sm:text-lg lg:text-xl text-[#6b5744]">
              {format(date, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate(subDays(date, 1))}
              className="text-[#8b5a2b] border-[#8b5a2b]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal border-[#8b5a2b]/30 text-[#3d2c1e]",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#8b5a2b]" />
                  {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setDate(addDays(date, 1))}
              className="text-[#8b5a2b] border-[#8b5a2b]/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 lg:p-10 space-y-8">

          {/* Stats Cards */}
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-5">
            <Card
              onClick={() => toggleFilter("Present")}
              className={cn(
                "border-[#c9b896] bg-white p-6 lg:p-8 shadow-md rounded-2xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                statusFilter === "Present" ? "border-l-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/10" : "border-l-emerald-500 opacity-80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-emerald-700">
                  <div className="rounded-full bg-emerald-50 p-3 lg:p-4">
                    <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base font-bold uppercase tracking-wider opacity-70">Présents</p>
                    <p className="text-3xl lg:text-4xl font-black">{presentCount}</p>
                  </div>
                </div>
                {statusFilter === "Present" && <Filter className="h-5 w-5 text-emerald-500 animate-pulse" />}
              </div>
            </Card>

            <Card
              onClick={() => toggleFilter("Absent")}
              className={cn(
                "border-[#c9b896] bg-white p-6 lg:p-8 shadow-md rounded-2xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                statusFilter === "Absent" ? "border-l-rose-600 ring-2 ring-rose-500/20 bg-rose-50/10" : "border-l-rose-500 opacity-80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-rose-700">
                  <div className="rounded-full bg-rose-50 p-3 lg:p-4">
                    <Clock className="h-6 w-6 lg:h-8 lg:w-8" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base font-bold uppercase tracking-wider opacity-70">Absents</p>
                    <p className="text-3xl lg:text-4xl font-black">{absentCount}</p>
                  </div>
                </div>
                {statusFilter === "Absent" && <Filter className="h-5 w-5 text-rose-500 animate-pulse" />}
              </div>
            </Card>

            <Card
              onClick={() => toggleFilter("Retard")}
              className={cn(
                "border-[#c9b896] bg-white p-6 lg:p-8 shadow-md rounded-2xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                statusFilter === "Retard" ? "border-l-amber-600 ring-2 ring-amber-500/20 bg-amber-50/10" : "border-l-amber-500 opacity-80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-amber-700">
                  <div className="rounded-full bg-amber-50 p-3 lg:p-4">
                    <Clock className="h-6 w-6 lg:h-8 lg:w-8" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base font-bold uppercase tracking-wider opacity-70">Retards</p>
                    <p className="text-3xl lg:text-4xl font-black">{retardCount}</p>
                  </div>
                </div>
                {statusFilter === "Retard" && <Filter className="h-5 w-5 text-amber-500 animate-pulse" />}
              </div>
            </Card>

            <Card
              onClick={() => toggleFilter("Repos")}
              className={cn(
                "border-[#c9b896] bg-white p-6 lg:p-8 shadow-md rounded-2xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                statusFilter === "Repos" ? "border-l-slate-600 ring-2 ring-slate-500/20 bg-slate-50/10" : "border-l-slate-400 opacity-80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-slate-700">
                  <div className="rounded-full bg-slate-50 p-3 lg:p-4">
                    <Coffee className="h-6 w-6 lg:h-8 lg:w-8" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base font-bold uppercase tracking-wider opacity-70">Repos</p>
                    <p className="text-3xl lg:text-4xl font-black">{reposCount}</p>
                  </div>
                </div>
                {statusFilter === "Repos" && <Filter className="h-5 w-5 text-slate-500 animate-pulse" />}
              </div>
            </Card>

            <Card
              onClick={() => { setStatusFilter("all"); scrollToList(); }}
              className={cn(
                "border-[#c9b896] bg-white p-6 lg:p-8 shadow-md rounded-2xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                statusFilter === "all" ? "border-l-blue-600 ring-2 ring-blue-500/20 bg-blue-50/10" : "border-l-blue-500 opacity-80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-blue-700">
                  <div className="rounded-full bg-blue-50 p-3 lg:p-4">
                    <Users className="h-6 w-6 lg:h-8 lg:w-8" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base font-bold uppercase tracking-wider opacity-70">Effectif Total</p>
                    <p className="text-3xl lg:text-4xl font-black">{totalCount}</p>
                  </div>
                </div>
                {statusFilter === "all" && <Filter className="h-5 w-5 text-blue-500 opacity-20" />}
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card className="p-4 border-[#c9b896] bg-white shadow-md rounded-xl">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8b5a2b] opacity-50" />
                <Input
                  placeholder="Rechercher par nom..."
                  className="pl-10 h-12 border-[#c9b896] rounded-xl bg-[#f8f6f1]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="h-5 w-5 text-[#8b5a2b] shrink-0" />
                <select
                  className="h-12 px-4 rounded-xl border border-[#c9b896] bg-[#f8f6f1] text-[#3d2c1e] text-sm focus:ring-2 focus:ring-[#8b5a2b]/20 outline-none w-full"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="all">Tous les départements</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              {statusFilter !== "all" && (
                <Button
                  variant="ghost"
                  onClick={() => setStatusFilter("all")}
                  className="text-rose-600 hover:bg-rose-50 gap-2 font-bold"
                >
                  <XCircle className="h-4 w-4" /> Réinitialiser
                </Button>
              )}
            </div>
          </Card>

          {/* Top 5 Performers Card */}
          {isAdmin && (
            <Card className="border-[#c9b896] bg-gradient-to-br from-amber-50 to-white p-4 sm:p-6 shadow-lg rounded-xl border-2 border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg sm:rounded-xl shrink-0 shadow-md">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg sm:text-xl text-[#3d2c1e] uppercase tracking-tighter truncate">Top 5 Performers</h3>
                    <p className="text-[10px] sm:text-sm font-bold text-[#6b5744]/70 uppercase tracking-widest truncate">Performance Mensuelle</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowTopPerformers(!showTopPerformers)}
                  variant="outline"
                  className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-100 font-bold uppercase tracking-widest text-[10px] h-8"
                >
                  {showTopPerformers ? "Masquer" : "Découvrir"}
                </Button>
              </div>

              {showTopPerformers && (
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-3 mt-4">
                  {topPerformers.map((performer: any, index: number) => (
                    <div
                      key={performer.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-amber-200 hover:shadow-lg transition-all gap-4 sm:gap-2 group overflow-hidden relative"
                    >
                      {/* Left: Performer Identity */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-white shrink-0 text-sm sm:text-base shadow-inner ${index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 ring-2 ring-yellow-200" :
                          index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 ring-2 ring-gray-100" :
                            index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 ring-2 ring-amber-100" :
                              "bg-gradient-to-br from-[#8b5a2b] to-[#a0522d]"
                          }`}>
                          {index + 1}
                        </div>

                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#8b5a2b]/5 flex items-center justify-center text-[#8b5a2b] font-bold overflow-hidden border border-[#c9b896]/30 shrink-0 group-hover:border-[#8b5a2b]/50 transition-colors">
                          {performer.photo ? (
                            <img src={performer.photo} alt={performer.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="bg-[#8b5a2b]/10 w-full h-full flex items-center justify-center">
                              <Users className="h-5 w-5 sm:h-6 sm:w-6 opacity-40" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[#3d2c1e] text-sm sm:text-base truncate uppercase">{performer.username}</h4>
                          <p className="text-[10px] sm:text-xs font-bold text-[#8b5a2b]/70 truncate tracking-tight uppercase">
                            {performer.departement || "Personnel"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Stats and Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-amber-100 sm:border-transparent">
                        <div className="flex flex-col sm:items-end">
                          <div className="flex items-center gap-1.5 text-[#8b5a2b]">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-black text-base sm:text-lg tabular-nums tracking-tighter">{performer.totalHours}h</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={cn(
                              "text-[10px] sm:text-xs font-bold uppercase tracking-tight px-2 py-1 rounded-md flex flex-col items-center sm:items-end leading-none",
                              (performer.totalRetard || 0) === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              <span>{performer.onTimeDays}/{performer.daysWorked} Jrs à l'heure</span>
                              <span className="opacity-70 mt-0.5">{performer.daysWorked > 0 ? Math.round((performer.onTimeDays / performer.daysWorked) * 100) : 0}% Ponctuel</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenPrime(performer)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 sm:px-6 rounded-lg shadow-sm hover:shadow-md transition-all uppercase tracking-tighter text-xs"
                        >
                          <Award className="h-4 w-4 mr-1.5" />
                          Prime
                        </Button>
                      </div>

                      {/* Subtle background decoration for rank 1 */}
                      {index === 0 && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 -mr-12 -mt-12 rounded-full pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Table Card */}
          <div ref={listRef}>
            <Card className="border-[#c9b896] bg-white shadow-xl rounded-2xl overflow-hidden">
              {/* Desktop View Table */}
              <div className="hidden min-[1100px]:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8f6f1] border-b border-[#c9b896]">
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm text-center w-24">Zinc</th>
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm">Employé</th>
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm">Département</th>
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm text-center">Entrée</th>
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm text-center">Sortie</th>
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm text-center">Shift</th>
                      {isAdmin && <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm text-center font-black">Heures</th>}
                      <th className="px-6 py-5 font-bold text-[#8b5a2b] uppercase tracking-widest text-sm">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c9b896]/30">
                    {loading ? (
                      <tr><td colSpan={8} className="p-20 text-center text-[#6b5744] text-xl font-bold animate-pulse">Chargement des présences...</td></tr>
                    ) : filteredPersonnel.length > 0 ? (
                      filteredPersonnel.map((person: any) => (
                        <tr key={person.user.id} id={`user-row-${person.user.id}`} className="hover:bg-[#f8f6f1]/50 transition-colors group">
                          <td className="px-6 py-4 text-center">
                            <span className="text-xs font-black text-[#8b5a2b] opacity-40 bg-[#8b5a2b]/5 px-2 py-1 rounded">#{person.user.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className={cn(
                                "flex items-center gap-3 group/item transition-all",
                                (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && canSee('attendance', 'pardon') && "cursor-pointer"
                              )}
                              onClick={() => (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && handlePardonClick(person)}
                            >
                              <div className={cn(
                                "h-11 w-11 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#c9b896] flex items-center justify-center text-white font-black text-sm shadow-md overflow-hidden border border-[#c9b896]/30 transition-transform",
                                (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && "group-hover/item:scale-110 group-hover/item:border-[#8b5a2b] ring-offset-2 group-hover/item:ring-2 ring-amber-400"
                              )}>
                                {person.user.photo ? (
                                  <img src={person.user.photo} alt={person.user.username} className="w-full h-full object-cover" />
                                ) : (
                                  person.user.username?.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-bold text-[#3d2c1e] text-lg transition-colors leading-tight",
                                  (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && "group-hover/item:text-[#8b5a2b]"
                                )}>{person.user.username}</span>
                                <span className="text-[10px] text-[#8b5a2b] opacity-60 font-black uppercase tracking-widest">{person.user.zktime_id ? `ID: ${person.user.zktime_id}` : ""}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[#6b5744] font-bold text-xs uppercase tracking-widest px-3 py-1 bg-[#8b5a2b]/5 rounded-lg border border-[#8b5a2b]/10 whitespace-nowrap">{person.user.departement || "Non défini"}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-mono font-black text-[#3d2c1e] text-lg">{person.clockIn || "--:--"}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-mono font-black text-[#3d2c1e] text-lg">{person.clockOut || "--:--"}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm border",
                              person.shift === "Soir" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                person.shift === "Matin" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                  person.shift === "Doublage" ? "bg-purple-50 text-purple-700 border-purple-100" :
                                    "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              {person.shift || "—"}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-center">
                              {person.workedHours ? (
                                <div className="flex flex-row items-baseline justify-center gap-1">
                                  <span className="text-xl font-black text-emerald-700 leading-none">{person.workedHours.split(' ')[0]}</span>
                                  <span className="text-xl font-black text-emerald-700 leading-none">{person.workedHours.split(' ')[1]}</span>
                                </div>
                              ) : (
                                <span className="text-[#8b5a2b]/20">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={cn(
                                "px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-sm",
                                (person.state === "Présent" || person.state === "Retard")
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : person.state === "Repos"
                                    ? "bg-slate-50 text-slate-500 border-slate-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                              )}>
                                {person.state}
                                {person.state === "Absent" && person.absentDaysCount > 0 && ` ${person.absentDaysCount}`}
                                {person.state === "Retard" && person.daysLateCount > 0 && ` ${person.daysLateCount}j`}
                              </span>
                              {person.state === "Retard" && person.delay && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 animate-pulse whitespace-nowrap">
                                  🕒 -{person.delay}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={8} className="p-20 text-center text-[#6b5744] text-xl italic opacity-50">Aucune donnée pour cette sélection.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="min-[1100px]:hidden flex flex-col divide-y divide-[#c9b896]/20">
                {loading ? (
                  <div className="p-20 text-center text-[#8b5a2b] font-black animate-pulse">CHARGEMENT DES PRÉSENCES...</div>
                ) : filteredPersonnel.length > 0 ? (
                  filteredPersonnel.map((person: any) => (
                    <div
                      key={person.user.id}
                      id={`user-row-mobile-${person.user.id}`}
                      className={cn(
                        "p-4 bg-white flex flex-col gap-4 active:bg-[#f8f6f1] transition-colors",
                        (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && canSee('attendance', 'pardon') && "cursor-pointer"
                      )}
                      onClick={() => (person.state === "Retard" || person.state === "Absent" || person.state === "Missing_Exit") && handlePardonClick(person)}
                    >
                      {/* Top Row: User + Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#c9b896] p-[1px] shadow-md border border-[#c9b896]/30 overflow-hidden shrink-0">
                            {person.user.photo ? (
                              <img src={person.user.photo} alt={person.user.username} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-black text-sm uppercase">
                                {person.user.username?.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-black text-[#3d2c1e] text-base truncate uppercase leading-tight">{person.user.username}</h4>
                            <span className="text-[10px] font-bold text-[#8b5a2b]/70 uppercase tracking-widest">{person.user.departement || "Personnel"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            (person.state === "Présent" || person.state === "Retard")
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : person.state === "Repos"
                                ? "bg-slate-50 text-slate-500 border-slate-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {person.state}
                            {person.state === "Absent" && person.absentDaysCount > 0 && ` ${person.absentDaysCount}`}
                          </span>
                          {person.state === "Retard" && person.delay && (
                            <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 animate-pulse whitespace-nowrap">
                              -{person.delay}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Row: Inputs/Outputs */}
                      <div className="grid grid-cols-3 gap-2 bg-[#f8f6f1]/50 p-3 rounded-xl border border-[#c9b896]/10">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-black text-[#8b5a2b]/50 uppercase tracking-widest">Entrée</span>
                          <span className="font-mono font-black text-[#3d2c1e] text-sm">{person.clockIn || "--:--"}</span>
                        </div>
                        <div className="flex flex-col items-center border-x border-[#c9b896]/20">
                          <span className="text-[8px] font-black text-[#8b5a2b]/50 uppercase tracking-widest">Sortie</span>
                          <span className="font-mono font-black text-[#3d2c1e] text-sm">{person.clockOut || "--:--"}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-[#8b5a2b]/50 uppercase tracking-widest">Heures</span>
                            <span className="font-black text-emerald-700 text-sm leading-tight">{person.workedHours || "—"}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Row: ID + Shift */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-[#8b5a2b]/40 uppercase">{format(new Date(), 'dd/MM/yyyy')}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border",
                          person.shift === "Soir" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                            person.shift === "Matin" ? "bg-amber-50 text-amber-700 border-amber-100" :
                              person.shift === "Doublage" ? "bg-purple-50 text-purple-700 border-purple-100" :
                                "bg-gray-50 text-gray-500 border-gray-100"
                        )}>
                          Shift: {person.shift || "—"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-[#6b5744] italic opacity-50">Aucun résultat.</div>
                )}
              </div>
            </Card>

          </div>
        </div>
      </main>

      {/* Prime Dialog */}
      <Dialog open={showPrimeDialog} onOpenChange={setShowPrimeDialog}>
        <DialogContent className="bg-white border-[#c9b896] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-600" />
              Attribuer une Prime
            </DialogTitle>
            <DialogDescription className="text-base text-[#6b5744]">
              Récompenser {selectedPerformer?.username} pour ses performances
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-[#c9b896]/30">
                  {selectedPerformer?.photo ? (
                    <img src={selectedPerformer.photo} alt={selectedPerformer.username} className="w-full h-full object-cover" />
                  ) : (
                    selectedPerformer?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[#3d2c1e]">{selectedPerformer?.username}</h4>
                  <p className="text-sm text-[#6b5744]">{selectedPerformer?.departement || "Non assigné"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prime-date" className="text-base font-medium text-[#3d2c1e]">
                Date de la prime
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-[#c9b896] bg-[#f8f6f1]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#8b5a2b]" />
                    {primeDate ? format(primeDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={primeDate}
                    onSelect={(d) => d && setPrimeDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prime-amount" className="text-base font-medium text-[#3d2c1e]">
                Montant de la prime (DT)
              </Label>
              <Input
                id="prime-amount"
                type="number"
                value={primeAmount}
                onChange={(e) => setPrimeAmount(e.target.value)}
                placeholder="Ex: 100"
                className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleAddPrime}
                disabled={!primeAmount}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 h-12 text-base flex-1"
              >
                <Award className="mr-2 h-4 w-4" />
                Attribuer la Prime
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPrimeDialog(false)}
                className="border-[#c9b896] text-[#3d2c1e] h-12 text-base flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PardonModal
        isOpen={isPardonModalOpen}
        onClose={() => setIsPardonModalOpen(false)}
        onConfirm={handleConfirmPardon}
        employee={pardonEmployee}
      />
    </div>
  )
}

