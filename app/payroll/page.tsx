"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DollarSign,
  Download,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Award,
  Wallet,
  Search,
  Layers,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { PayrollListView } from "./PayrollListView"
import { useSearchParams, useRouter } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"
import { getCurrentUser } from "@/lib/mock-data"
import { gql, useQuery, useMutation } from "@apollo/client"
import { format, getDaysInMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

// GraphQL Definitions
const GET_CORE_DATA = gql`
  query GetCoreData {
    getUsers {
      id
      username
      departement
      base_salary
      photo
      is_blocked
      nbmonth
    }
    getAllSchedules {
      user_id
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

const GET_PAYROLL_DATA = gql`
  query GetPayrollData($month: String!) {
    getPayroll(month: $month) {
      id
      user_id
      date
      present
      acompte
      extra
      prime
      infraction
      mise_a_pied
      retard
      remarque
      doublage
      paid
    }
  }
`

const GET_LISTS_DATA = gql`
  query GetListsData($month: String!) {
    getExtras(month: $month) {
      id
      user_id
      montant
      date_extra
      motif
    }
    getDoublages(month: $month) {
      id
      user_id
      username
      montant
      date
    }
    getAdvances(month: $month) {
      id
      user_id
      username
      montant
      date
      motif
      statut
    }
  }
`

const ADD_EXTRA = gql`
  mutation AddExtra($user_id: ID!, $montant: Float!, $date_extra: String!, $motif: String) {
    addExtra(user_id: $user_id, montant: $montant, date_extra: $date_extra, motif: $motif) {
      id
    }
  }
`

const UPDATE_EXTRA = gql`
  mutation UpdateExtra($id: ID!, $montant: Float, $motif: String, $date_extra: String) {
    updateExtra(id: $id, montant: $montant, motif: $motif, date_extra: $date_extra) {
      id
      montant
      motif
      date_extra
    }
  }
`

const UPDATE_DOUBLAGE = gql`
  mutation UpdateDoublage($id: ID!, $montant: Float, $date: String) {
    updateDoublage(id: $id, montant: $montant, date: $date) {
      id
      montant
      date
    }
  }
`

const DELETE_DOUBLAGE = gql`
  mutation DeleteDoublage($id: ID!) {
    deleteDoublage(id: $id)
  }
`

const DELETE_EXTRA = gql`
  mutation DeleteExtra($id: ID!) {
    deleteExtra(id: $id)
  }
`

const ADD_DOUBLAGE = gql`
  mutation AddDoublage($user_id: ID!, $montant: Float!, $date: String!) {
    addDoublage(user_id: $user_id, montant: $montant, date: $date) {
      id
    }
  }
`


const INIT_PAYROLL = gql`
  mutation InitPayroll($month: String!) {
    initPayrollMonth(month: $month)
  }
`

const PAY_USER = gql`
  mutation PayUser($month: String!, $userId: ID!) {
    payUser(month: $month, userId: $userId)
  }
`

const UNPAY_USER = gql`
  mutation UnpayUser($month: String!, $userId: ID!) {
    unpayUser(month: $month, userId: $userId)
  }
`


// Helper to calculate stats
const calculateUserStats = (user: any, userRecords: any[], userSchedule: any, monthDate: Date) => {
  const daysInMonth = getDaysInMonth(monthDate);
  const divisor = Number(user.nbmonth) || daysInMonth; // Ensure number
  const presentDays = userRecords.filter((r: any) => r.present === 1).length;

  const baseSalary = user.base_salary || 0;
  const dayValue = baseSalary / divisor;

  // USER LOGIC: (BaseSalary / Divisor) * PresentDays
  const paidDays = presentDays;
  const calculatedSalary = dayValue * paidDays;

  const totalPrimes = userRecords.reduce((sum: number, r: any) => sum + (r.prime || 0), 0);
  const totalExtras = userRecords.reduce((sum: number, r: any) => sum + (r.extra || 0), 0);
  const totalInfractions = userRecords.reduce((sum: number, r: any) => sum + (r.infraction || 0), 0);
  const totalAdvances = userRecords.reduce((sum: number, r: any) => sum + (r.acompte || 0), 0);
  const totalRetardMins = userRecords.reduce((sum: number, r: any) => sum + (r.retard || 0), 0);
  const totalDoublages = userRecords.reduce((sum: number, r: any) => sum + (r.doublage || 0), 0);

  const deductions = totalInfractions + totalAdvances;

  // USER LOGIC: Net Salary does NOT include primes/extras/doublages because they are paid immediately
  const netSalary = calculatedSalary - deductions;

  // For display of "Jours Abs", we show how many days were NOT paid vs the contract (divisor)
  const absentDays = Math.max(0, divisor - paidDays);

  return {
    baseSalary,
    calculatedSalary,
    presentDays,
    absentDays,
    totalPrimes,
    totalExtras,
    totalInfractions,
    totalAdvances,
    totalDoublages,
    netSalary,
    totalRetardMins,
    formattedRetard: totalRetardMins >= 60 ? `${Math.floor(totalRetardMins / 60)}h ${totalRetardMins % 60}m` : `${totalRetardMins} min`
  };
}

const formatDuration = (mins: number) => {
  if (!mins || mins <= 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m} min`;
};

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const payrollMonthKey = format(selectedMonth, "yyyy_MM")

  const { data: coreData, refetch: refetchCore } = useQuery(GET_CORE_DATA, {
    fetchPolicy: "cache-and-network"
  })

  const { data: payrollData, loading: payrollLoading, refetch: refetchPayroll } = useQuery(GET_PAYROLL_DATA, {
    variables: { month: payrollMonthKey },
    fetchPolicy: "cache-and-network"
  })

  const { data: listsData, loading: listsLoading, refetch: refetchLists } = useQuery(GET_LISTS_DATA, {
    variables: { month: payrollMonthKey },
    fetchPolicy: "cache-and-network"
  })

  const loading = payrollLoading || listsLoading

  const refetch = async () => {
    return Promise.all([refetchPayroll(), refetchLists(), refetchCore()])
  }



  // Permission Logic
  const currentUser = getCurrentUser();
  let permissions: any = {};
  if (currentUser?.permissions) {
    try { permissions = JSON.parse(currentUser.permissions); } catch (e) { }
  }

  const canSee = useCallback((cat: string, key: string) => {
    if (currentUser?.role === 'admin') return true;
    if (!permissions[cat]) return true;
    return permissions[cat][key] !== false;
  }, [currentUser, permissions])

  // Polling removed as per user request

  const [initPayroll] = useMutation(INIT_PAYROLL)

  // Init payroll if empty result?
  // Warning: If we init automatically, we might overwrite?
  // Usually initPayroll checks if exists. 
  useEffect(() => {
    if (payrollData?.getPayroll && payrollData.getPayroll.length === 0 && !loading && coreData?.getUsers?.length > 0) {
      // Only init if we have users but no payroll
      initPayroll({ variables: { month: payrollMonthKey } }).then(() => refetch().catch(console.error)).catch(console.error)
    }
  }, [payrollData, loading, coreData, payrollMonthKey, initPayroll])

  const users = useMemo(() => {
    if (!coreData?.getUsers) return [];
    return coreData.getUsers.filter((u: any) => !u.is_blocked);
  }, [coreData]);
  const payrollRecords = useMemo(() => payrollData?.getPayroll || [], [payrollData]);
  const schedules = useMemo(() => coreData?.getAllSchedules || [], [coreData]);
  const extrasList = useMemo(() => listsData?.getExtras || [], [listsData]);

  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u: any) => map.set(String(u.id), u));
    return map;
  }, [users]);

  const payrollSummary = useMemo(() => {
    // Pre-group records by user_id
    const recordsByUser = new Map<string, any[]>();
    payrollRecords.forEach((r: any) => {
      const uid = String(r.user_id);
      if (!recordsByUser.has(uid)) recordsByUser.set(uid, []);
      recordsByUser.get(uid)!.push(r);
    });

    const scheduleByUser = new Map<string, any>();
    schedules.forEach((s: any) => {
      scheduleByUser.set(String(s.user_id), s);
    });

    return users.map((user: any) => {
      const uId = String(user.id);
      const userRecords = recordsByUser.get(uId) || [];
      const userSchedule = scheduleByUser.get(uId);

      const stats = calculateUserStats(user, userRecords, userSchedule, selectedMonth);

      // Check if user is paid
      const isPaid = userRecords.some((r: any) => r.paid === true);

      return {
        userId: user.id,
        user,
        month: format(selectedMonth, "MMMM yyyy", { locale: fr }),
        isPaid,
        ...stats
      }
    })
  }, [users, payrollRecords, schedules, selectedMonth]);

  const paidUsersSet = useMemo(() => {
    const set = new Set<string>();
    payrollSummary.forEach((p: any) => {
      if (p.isPaid) set.add(String(p.userId));
    });
    return set;
  }, [payrollSummary]);




  // Planning Dialog State
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)

  // Extra Dialog State
  const [extraDialogOpen, setExtraDialogOpen] = useState(false)
  const [extraUserId, setExtraUserId] = useState("")
  const [extraAmount, setExtraAmount] = useState("")
  const [extraDate, setExtraDate] = useState<Date | undefined>(new Date())

  // Doublage Dialog State
  const [doublageDialogOpen, setDoublageDialogOpen] = useState(false)
  const [doublageUserId, setDoublageUserId] = useState("")
  const [doublageAmount, setDoublageAmount] = useState("")
  const [doublageDate, setDoublageDate] = useState<Date | undefined>(new Date())
  const [doublageSearchTerm, setDoublageSearchTerm] = useState("")
  const [doublageSelectedDepartment, setDoublageSelectedDepartment] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [unpayConfirmOpen, setUnpayConfirmOpen] = useState(false)
  const [unpayTargetId, setUnpayTargetId] = useState<string | null>(null)
  const [viewDoublagesSelectedDepartment, setViewDoublagesSelectedDepartment] = useState("all")
  const [viewExtrasSelectedDepartment, setViewExtrasSelectedDepartment] = useState("all")
  const [viewPrimesSelectedDepartment, setViewPrimesSelectedDepartment] = useState("all")
  const [viewAdvancesSelectedDepartment, setViewAdvancesSelectedDepartment] = useState("all")
  const [viewPaidSelectedDepartment, setViewPaidSelectedDepartment] = useState("all")

  // Auto-scroll Logic
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");

  useEffect(() => {
    if (!userIdParam || !payrollData?.getPayroll) return;

    // 1. Clear filters
    if (searchTerm) setSearchTerm("");
    if (selectedDepartment !== "all") setSelectedDepartment("all");

    // 2. Poll for the row/card
    let attempts = 0;
    const interval = setInterval(() => {
      const desktopEl = document.getElementById(`payroll-desktop-${userIdParam}`);
      const mobileEl = document.getElementById(`payroll-mobile-${userIdParam}`);
      // Select the one that is likely visible (offsetParent is null if display:none)
      const element = (desktopEl && desktopEl.offsetParent !== null) ? desktopEl : mobileEl;

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-[#8b5a2b]/30', 'ring-4', 'ring-[#8b5a2b]/30', 'transition-all', 'duration-500', 'z-20', 'relative');
        setTimeout(() => {
          element.classList.remove('bg-[#8b5a2b]/30', 'ring-4', 'ring-[#8b5a2b]/30');
        }, 3000);
        clearInterval(interval);
      }
      if (attempts++ > 20) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [userIdParam, payrollData?.getPayroll]);

  // Extra Dialog Filters
  const [extraSearchTerm, setExtraSearchTerm] = useState("")
  const [extraSelectedDepartment, setExtraSelectedDepartment] = useState("all")

  // Prime Dialog State
  const [primeDialogOpen, setPrimeDialogOpen] = useState(false)
  const [primeUserId, setPrimeUserId] = useState("")
  const [primeAmount, setPrimeAmount] = useState("")
  const [primeDate, setPrimeDate] = useState<Date | undefined>(new Date())
  const [primeSearchTerm, setPrimeSearchTerm] = useState("")
  const [primeSelectedDepartment, setPrimeSelectedDepartment] = useState("all")

  // Doublage View Dialog State
  const [viewDoublagesOpen, setViewDoublagesOpen] = useState(false)

  // Extras View Dialog State
  const [viewExtrasOpen, setViewExtrasOpen] = useState(false)

  // Primes View Dialog State
  const [viewPrimesOpen, setViewPrimesOpen] = useState(false)

  // Advances View Dialog State
  const [viewAdvancesOpen, setViewAdvancesOpen] = useState(false)

  // Paid View Dialog State
  const [viewPaidOpen, setViewPaidOpen] = useState(false)


  // Header Button Dialogs (Grouped View with Dates)
  const [listeDoublageOpen, setListeDoublageOpen] = useState(false)
  const [listeExtrasOpen, setListeExtrasOpen] = useState(false)
  const [listePrimesOpen, setListePrimesOpen] = useState(false)
  const [listeAvancesOpen, setListeAvancesOpen] = useState(false)
  const [addExtra, { loading: addingExtra }] = useMutation(ADD_EXTRA)
  const [addDoublage, { loading: addingDoublage }] = useMutation(ADD_DOUBLAGE)
  const [payUser, { loading: payingUser }] = useMutation(PAY_USER)
  const [unpayUser, { loading: unpayingUser }] = useMutation(UNPAY_USER)
  const [updateExtra] = useMutation(UPDATE_EXTRA)
  const [deleteExtra] = useMutation(DELETE_EXTRA)
  const [updateDoublage] = useMutation(UPDATE_DOUBLAGE)
  const [deleteDoublage] = useMutation(DELETE_DOUBLAGE)

  const [editingExtraId, setEditingExtraId] = useState<string | null>(null)
  const [editExtraAmount, setEditExtraAmount] = useState("")
  const [editExtraDate, setEditExtraDate] = useState<Date | undefined>(undefined)

  const [editingDoublageId, setEditingDoublageId] = useState<string | null>(null)
  const [editDoublageAmount, setEditDoublageAmount] = useState("")
  const [editDoublageDate, setEditDoublageDate] = useState<Date | undefined>(undefined)

  const [doublageCalendarOpen, setDoublageCalendarOpen] = useState(false)
  const [extraCalendarOpen, setExtraCalendarOpen] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<"extra" | "doublage">("extra")

  const handleAddExtra = async () => {
    if (!extraUserId || !extraAmount || !extraDate) return

    try {
      await addExtra({
        variables: {
          user_id: extraUserId,
          montant: parseFloat(extraAmount),
          date_extra: format(extraDate, 'yyyy-MM-dd'),
          motif: "Extra"
        }
      })
      setExtraDialogOpen(false)
      setExtraUserId("")
      setExtraAmount("")
      setExtraDate(new Date())
      await refetch()
    } catch (error) {
      console.error("Error adding extra:", error)
    }
  }

  const handleAddDoublage = async () => {
    if (!doublageUserId || !doublageAmount || !doublageDate) return

    try {
      await addDoublage({
        variables: {
          user_id: doublageUserId,
          montant: parseFloat(doublageAmount),
          date: format(doublageDate, 'yyyy-MM-dd')
        }
      })
      setDoublageDialogOpen(false)
      setDoublageUserId("")
      setDoublageAmount("")
      setDoublageDate(new Date())
      await refetch()
    } catch (error) {
      console.error("Error adding doublage:", error)
    }
  }

  const handleAddPrime = async () => {
    if (!primeUserId || !primeAmount || !primeDate) return

    try {
      await addExtra({
        variables: {
          user_id: primeUserId,
          montant: parseFloat(primeAmount),
          date_extra: format(primeDate, 'yyyy-MM-dd'),
          motif: "prime"
        }
      })
      setPrimeDialogOpen(false)
      setPrimeUserId("")
      setPrimeAmount("")
      setPrimeDate(new Date())
      await refetch()
    } catch (error) {
      console.error("Error adding prime:", error)
    }
  }

  const handleUpdateExtra = async (id: string) => {
    if (!editExtraAmount) return
    try {
      await updateExtra({
        variables: {
          id,
          montant: parseFloat(editExtraAmount),
          date_extra: editExtraDate ? format(editExtraDate, 'yyyy-MM-dd') : undefined
        }
      })
      await refetch()
      setEditingExtraId(null)
      setEditExtraAmount("")
      setEditExtraDate(undefined)
    } catch (error) {
      console.error("Error updating extra:", error)
    }
  }

  const handleDeleteExtra = async () => {
    if (!deleteTargetId) return
    try {
      if (deleteType === "extra") {
        await deleteExtra({
          variables: { id: deleteTargetId }
        })
      } else {
        await deleteDoublage({
          variables: { id: deleteTargetId }
        })
      }
      await refetch()
      setDeleteConfirmOpen(false)
      setDeleteTargetId(null)
    } catch (error) {
      console.error("Error deleting item:", error)
    }
  }

  const handleUpdateDoublage = async (id: string) => {
    if (!editDoublageAmount) return
    try {
      await updateDoublage({
        variables: {
          id,
          montant: parseFloat(editDoublageAmount),
          date: editDoublageDate ? format(editDoublageDate, 'yyyy-MM-dd') : undefined
        }
      })
      await refetch()
      setEditingDoublageId(null)
      setEditDoublageAmount("")
      setEditDoublageDate(undefined)
    } catch (error) {
      console.error("Error updating doublage:", error)
    }
  }

  const handlePayUser = useCallback(async (userId: string) => {
    try {
      await payUser({
        variables: {
          month: payrollMonthKey,
          userId: userId
        }
      })
      await refetch()
    } catch (error) {
      console.error("Error paying user:", error)
    }
  }, [payUser, payrollMonthKey, refetch])

  const handleUnpayUser = async () => {
    if (!unpayTargetId) return
    try {
      await unpayUser({
        variables: {
          month: payrollMonthKey,
          userId: unpayTargetId
        }
      })
      await refetch()
      setUnpayConfirmOpen(false)
      setUnpayTargetId(null)
    } catch (error) {
      console.error("Error unpaying user:", error)
    }
  }

  const openEmployeePlanning = useCallback((userData: any) => {
    setSelectedEmployee(userData)
    setPlanningDialogOpen(true)
  }, [])

  const navigateMonth = (direction: "prev" | "next") => {
    setSelectedMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1)
      else newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  // Generate Calendar Grid for Planning Dialog
  const calendarGrid = useMemo(() => {
    if (!selectedEmployee) return []

    // Use the global selected month
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const userSched = schedules.find((s: any) => String(s.user_id) === String(selectedEmployee.userId));
    const userRecords = payrollRecords.filter((r: any) => String(r.user_id) === String(selectedEmployee.userId));

    const dayKeys = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

    const grid = [];

    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon=0

    for (let i = 0; i < adjustedFirstDay; i++) grid.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeekIndex = date.getDay();
      const schedKey = dayKeys[dayOfWeekIndex];

      let shiftType = "Repos";
      if (userSched) {
        // @ts-ignore
        shiftType = userSched[schedKey] || "Repos";
      }

      // Find existing record
      const dateStr = format(date, 'yyyy-MM-dd');
      const record = userRecords.find((r: any) => r.date === dateStr);

      // Visual Type
      let type: "shift" | "doublage" | "repos" = "repos";
      if (shiftType === "Matin" || shiftType === "Soir") type = "shift";
      if (shiftType === "Doublage") type = "doublage";

      grid.push({
        day,
        type,
        shiftName: shiftType,
        record,
        isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6
      })
    }
    return grid;
  }, [selectedEmployee, selectedMonth, schedules, payrollRecords]);

  // Filtered Data
  const filteredPayrollSummary = useMemo(() => {
    return payrollSummary.filter((p: any) => {
      const matchesSearch = p.user.username.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDep = selectedDepartment === "all" || p.user.departement === selectedDepartment
      return matchesSearch && matchesDep
    })
  }, [payrollSummary, searchTerm, selectedDepartment])

  const globalStats = useMemo(() => {
    return {
      totalPay: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + curr.baseSalary, 0),
      totalAdvances: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + curr.totalAdvances, 0),
      totalPrimes: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + curr.totalPrimes, 0),
      totalExtras: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + curr.totalExtras, 0),
      totalDoublages: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + curr.totalDoublages, 0),
      totalNet: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + (curr.isPaid ? 0 : curr.netSalary), 0),
      totalPaid: filteredPayrollSummary.reduce((acc: number, curr: any) => acc + (curr.isPaid ? curr.netSalary : 0), 0),
    }
  }, [filteredPayrollSummary]);

  // Get unique departments
  const departments = useMemo(() => {
    const deps = new Set(users.map((u: any) => u.departement).filter(Boolean))
    return Array.from(deps)
  }, [users])

  // Memoized Lists for Modals
  const filteredDoublagesList = useMemo(() => {
    const doublageList = listsData?.getDoublages || [];
    return doublageList.filter((d: any) => {
      const user = usersMap.get(String(d.user_id));
      const userDep = user?.departement || "Autre";
      if (viewDoublagesSelectedDepartment !== "all" && userDep !== viewDoublagesSelectedDepartment) {
        return false;
      }
      return true;
    });
  }, [listsData?.getDoublages, viewDoublagesSelectedDepartment, usersMap]);

  const filteredExtrasList = useMemo(() => {
    const rawExtras = listsData?.getExtras || [];
    return rawExtras.filter((e: any) => {
      if ((e.motif || "Extra").toLowerCase() !== "extra") return false;
      const user = usersMap.get(String(e.user_id));
      const userDep = user?.departement || "Autre";
      if (viewExtrasSelectedDepartment !== "all" && userDep !== viewExtrasSelectedDepartment) return false;
      return true;
    });
  }, [listsData?.getExtras, viewExtrasSelectedDepartment, usersMap]);

  const filteredPrimesList = useMemo(() => {
    const rawExtras = listsData?.getExtras || [];
    return rawExtras.filter((e: any) => {
      if ((e.motif || "").toLowerCase() !== "prime") return false;
      const user = usersMap.get(String(e.user_id));
      const userDep = user?.departement || "Autre";
      if (viewPrimesSelectedDepartment !== "all" && userDep !== viewPrimesSelectedDepartment) return false;
      return true;
    });
  }, [listsData?.getExtras, viewPrimesSelectedDepartment, usersMap]);

  const filteredAvancesList = useMemo(() => {
    const rawAdvances = listsData?.getAdvances || [];
    return rawAdvances.filter((a: any) => {
      const user = usersMap.get(String(a.user_id));
      const userDep = user?.departement || "Autre";
      if (viewAdvancesSelectedDepartment !== "all" && userDep !== viewAdvancesSelectedDepartment) return false;
      return true;
    });
  }, [listsData?.getAdvances, viewAdvancesSelectedDepartment, usersMap]);

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        <div className="border-b border-[#c9b896] bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5a2b]">
                Gestion de la Paie
              </h1>
              <div className="flex items-center gap-2 mt-1 sm:mt-2">
                <p className="text-sm sm:text-base lg:text-lg text-[#6b5744]">
                  Traiter et gérer les salaires —
                </p>
                <div className="flex items-center gap-2 bg-[#f8f6f1] rounded-md px-2 py-0.5 border border-[#c9b896]">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth("prev")} className="h-6 w-6">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-bold text-[#3d2c1e] text-sm uppercase">{format(selectedMonth, 'MMMM yyyy', { locale: fr })}</span>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth("next")} className="h-6 w-6">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <NotificationBell />
              {canSee('payroll', 'action_prime') && (
                <Dialog open={primeDialogOpen} onOpenChange={setPrimeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:opacity-90 shadow-md h-10 sm:h-11 lg:h-12 px-4 sm:px-5 lg:px-6 text-sm sm:text-base">
                      <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Prime
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-[#c9b896] text-[#3d2c1e] max-w-[calc(100vw-2rem)] sm:max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-[#8b5a2b] flex items-center gap-2 sm:gap-3">
                        Ajouter Prime
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Label>Employé</Label>

                      {/* Prime Dialog Filters */}
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Rechercher..."
                          value={primeSearchTerm}
                          onChange={e => setPrimeSearchTerm(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Select value={primeSelectedDepartment} onValueChange={setPrimeSelectedDepartment}>
                          <SelectTrigger className="h-9 w-[130px] text-xs">
                            <SelectValue placeholder="Dép." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            <SelectItem value="all">Tous</SelectItem>
                            {departments.map((dep: any) => (
                              <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-4 bg-[#f8f6f1] p-3 rounded-2xl border border-[#c9b896]/30">
                        <div className="h-12 w-12 rounded-xl bg-[#8b5a2b] flex items-center justify-center text-white font-black overflow-hidden shadow-md">
                          {(() => {
                            const user = usersMap.get(String(primeUserId));
                            return user?.photo ? <img src={user.photo} className="h-full w-full object-cover" /> : user?.username?.charAt(0) || "?";
                          })()}
                        </div>
                        <Select value={primeUserId} onValueChange={setPrimeUserId}>
                          <SelectTrigger className="flex-1 bg-transparent border-none shadow-none focus:ring-0 text-[#3d2c1e] font-bold">
                            <SelectValue placeholder="Choisir un employé..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            {users
                              .filter((u: any) => {
                                const isPaid = paidUsersSet.has(String(u.id));
                                const matchesSearch = u.username.toLowerCase().includes(primeSearchTerm.toLowerCase())
                                const matchesDep = primeSelectedDepartment === "all" || u.departement === primeSelectedDepartment
                                return matchesSearch && matchesDep && !isPaid
                              })
                              .map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                      {u.photo ? (
                                        <img src={u.photo} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-gray-400">{u.username.charAt(0)}</span>
                                      )}
                                    </div>
                                    <span>{u.username}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {primeDate ? format(primeDate, 'dd/MM/yyyy') : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white"><Calendar mode="single" selected={primeDate} onSelect={setPrimeDate} /></PopoverContent>
                      </Popover>

                      <Label>Montant (TND)</Label>
                      <Input type="number" value={primeAmount} onChange={e => setPrimeAmount(e.target.value)} placeholder="0.0" />

                      <Button onClick={handleAddPrime} disabled={addingExtra} className="w-full bg-amber-600 text-white">Ajouter</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {canSee('payroll', 'action_extra') && (
                <Dialog open={extraDialogOpen} onOpenChange={setExtraDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:opacity-90 shadow-md h-10 sm:h-11 lg:h-12 px-4 sm:px-5 lg:px-6 text-sm sm:text-base">
                      <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Extra
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-[#c9b896] text-[#3d2c1e] max-w-[calc(100vw-2rem)] sm:max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-[#8b5a2b] flex items-center gap-2 sm:gap-3">
                        Ajouter Extra
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Label>Employé</Label>

                      {/* Extra Dialog Filters */}
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Rechercher..."
                          value={extraSearchTerm}
                          onChange={e => setExtraSearchTerm(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Select value={extraSelectedDepartment} onValueChange={setExtraSelectedDepartment}>
                          <SelectTrigger className="h-9 w-[130px] text-xs">
                            <SelectValue placeholder="Dép." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            <SelectItem value="all">Tous</SelectItem>
                            {departments.map((dep: any) => (
                              <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-4 bg-[#f8f6f1] p-3 rounded-2xl border border-[#c9b896]/30">
                        <div className="h-12 w-12 rounded-xl bg-[#8b5a2b] flex items-center justify-center text-white font-black overflow-hidden shadow-md">
                          {(() => {
                            const user = usersMap.get(String(extraUserId));
                            return user?.photo ? <img src={user.photo} className="h-full w-full object-cover" /> : user?.username?.charAt(0) || "?";
                          })()}
                        </div>
                        <Select value={extraUserId} onValueChange={setExtraUserId}>
                          <SelectTrigger className="flex-1 bg-transparent border-none shadow-none focus:ring-0 text-[#3d2c1e] font-bold">
                            <SelectValue placeholder="Choisir un employé..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            {users
                              .filter((u: any) => {
                                const isPaid = paidUsersSet.has(String(u.id));
                                const matchesSearch = u.username.toLowerCase().includes(extraSearchTerm.toLowerCase())
                                const matchesDep = extraSelectedDepartment === "all" || u.departement === extraSelectedDepartment
                                return matchesSearch && matchesDep && !isPaid
                              })
                              .map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                      {u.photo ? (
                                        <img src={u.photo} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-gray-400">{u.username.charAt(0)}</span>
                                      )}
                                    </div>
                                    <span>{u.username}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {extraDate ? format(extraDate, 'dd/MM/yyyy') : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white"><Calendar mode="single" selected={extraDate} onSelect={setExtraDate} /></PopoverContent>
                      </Popover>

                      <Label>Montant (TND)</Label>
                      <Input type="number" value={extraAmount} onChange={e => setExtraAmount(e.target.value)} placeholder="0.0" />

                      <Button onClick={handleAddExtra} disabled={addingExtra} className="w-full bg-emerald-600 text-white">Ajouter</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {canSee('payroll', 'action_doublage') && (
                <Dialog open={doublageDialogOpen} onOpenChange={setDoublageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:opacity-90 shadow-md h-10 sm:h-11 lg:h-12 px-4 sm:px-5 lg:px-6 text-sm sm:text-base">
                      <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Doublage
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-[#c9b896] text-[#3d2c1e] max-w-[calc(100vw-2rem)] sm:max-w-md mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-[#8b5a2b] flex items-center gap-2 sm:gap-3">
                        Ajouter Doublage
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Label>Employé</Label>

                      {/* Doublage Dialog Filters */}
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Rechercher..."
                          value={doublageSearchTerm}
                          onChange={e => setDoublageSearchTerm(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Select value={doublageSelectedDepartment} onValueChange={setDoublageSelectedDepartment}>
                          <SelectTrigger className="h-9 w-[130px] text-xs">
                            <SelectValue placeholder="Dép." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            <SelectItem value="all">Tous</SelectItem>
                            {departments.map((dep: any) => (
                              <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-4 bg-[#f8f6f1] p-3 rounded-2xl border border-[#c9b896]/30">
                        <div className="h-12 w-12 rounded-xl bg-[#8b5a2b] flex items-center justify-center text-white font-black overflow-hidden shadow-md">
                          {(() => {
                            const user = usersMap.get(String(doublageUserId));
                            return user?.photo ? <img src={user.photo} className="h-full w-full object-cover" /> : user?.username?.charAt(0) || "?";
                          })()}
                        </div>
                        <Select value={doublageUserId} onValueChange={setDoublageUserId}>
                          <SelectTrigger className="flex-1 bg-transparent border-none shadow-none focus:ring-0 text-[#3d2c1e] font-bold">
                            <SelectValue placeholder="Choisir un employé..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#c9b896]">
                            {users
                              .filter((u: any) => {
                                const isPaid = paidUsersSet.has(String(u.id));
                                const matchesSearch = u.username.toLowerCase().includes(doublageSearchTerm.toLowerCase())
                                const matchesDep = doublageSelectedDepartment === "all" || u.departement === doublageSelectedDepartment
                                return matchesSearch && matchesDep && !isPaid
                              })
                              .map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                      {u.photo ? (
                                        <img src={u.photo} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-gray-400">{u.username.charAt(0)}</span>
                                      )}
                                    </div>
                                    <span>{u.username}</span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {doublageDate ? format(doublageDate, 'dd/MM/yyyy') : "Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white"><Calendar mode="single" selected={doublageDate} onSelect={setDoublageDate} /></PopoverContent>
                      </Popover>

                      <Label>Montant (TND)</Label>
                      <Input type="number" value={doublageAmount} onChange={e => setDoublageAmount(e.target.value)} placeholder="0.0" />

                      <Button onClick={handleAddDoublage} disabled={addingDoublage} className="w-full bg-cyan-600 text-white">Ajouter</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Confirmation Dialog for Unpaying */}
          <AlertDialog open={unpayConfirmOpen} onOpenChange={setUnpayConfirmOpen}>
            <AlertDialogContent className="bg-white border-[#c9b896] rounded-2xl shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#8b5a2b] font-bold text-xl flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-red-600" /> Annuler le paiement ?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#6b5744] text-base">
                  Cette action va marquer le salaire comme **non payé**. Le statut de l'employé redeviendra "En attente".
                  Voulez-vous continuer ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="rounded-xl border-[#c9b896] text-[#3d2c1e] hover:bg-gray-50 uppercase text-xs font-black tracking-widest">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUnpayUser}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white uppercase text-xs font-black tracking-widest px-6"
                >
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* --- INJECTED GLOBAL STYLES FOR TABLE PERFORMANCE --- */}
          <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {canSee('payroll', 'stats_total_base') && (
              <Card className="border-[#c9b896] bg-white p-4 shadow-md">
                <p className="text-sm text-[#6b5744]">Total Salaires Base {selectedDepartment !== "all" ? `(${selectedDepartment})` : (searchTerm ? "(Filtré)" : "")}</p>
                <p className="text-2xl font-bold text-[#3d2c1e]">{globalStats.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT</p>
              </Card>
            )}
            {canSee('payroll', 'stats_avances') && (
              <Card
                className="border-[#c9b896] bg-white p-4 shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setListeAvancesOpen(true)}
              >
                <p className="text-sm text-[#6b5744]">Avances {selectedDepartment !== "all" ? `(${selectedDepartment})` : (searchTerm ? "(Filtré)" : "")}</p>
                <p className="text-2xl font-bold text-[#a0522d]">{globalStats.totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT</p>
              </Card>
            )}
            {canSee('payroll', 'stats_net_global') && (
              <Card className="border-[#c9b896] bg-white p-4 shadow-md">
                <p className="text-sm text-[#6b5744]">Net Global {selectedDepartment !== "all" ? `(${selectedDepartment})` : (searchTerm ? "(Filtré)" : "")}</p>
                <p className="text-2xl font-bold text-[#c9a227]">{globalStats.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT</p>
              </Card>
            )}
            <Card
              className="border-green-500 bg-green-50 p-4 shadow-md cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => setViewPaidOpen(true)}
            >
              <p className="text-sm text-green-700 font-semibold">Total Payé {selectedDepartment !== "all" ? `(${selectedDepartment})` : (searchTerm ? "(Filtré)" : "")}</p>
              <p className="text-2xl font-bold text-green-700">{globalStats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT</p>
            </Card>
            {canSee('payroll', 'stats_primes') && (
              <Card
                className="border-amber-500 bg-amber-50 p-4 shadow-md cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => setListePrimesOpen(true)}
              >
                <p className="text-sm text-amber-700 font-semibold">Total Primes</p>
                <p className="text-2xl font-bold text-amber-700">{Math.round(globalStats.totalPrimes)} DT</p>
              </Card>
            )}
            {canSee('payroll', 'stats_extras') && (
              <Card
                className="border-emerald-500 bg-emerald-50 p-4 shadow-md cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => setListeExtrasOpen(true)}
              >
                <p className="text-sm text-emerald-700 font-semibold">Total Extras</p>
                <p className="text-2xl font-bold text-emerald-700">{Math.round(globalStats.totalExtras)} DT</p>
              </Card>
            )}
            {canSee('payroll', 'stats_doublages') && (
              <Card
                className="border-cyan-500 bg-cyan-50 p-4 shadow-md cursor-pointer hover:bg-cyan-100 transition-colors"
                onClick={() => setListeDoublageOpen(true)}
              >
                <p className="text-sm text-cyan-700 font-semibold">Total Doublages</p>
                <p className="text-2xl font-bold text-cyan-700">{Math.round(globalStats.totalDoublages)} DT</p>
              </Card>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center bg-white p-4 rounded-lg border border-[#c9b896] shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6b5744]" />
              <Input
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-[#c9b896] bg-[#f8f6f1] text-[#3d2c1e]"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => setViewPrimesOpen(true)}
                className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 shadow-sm font-bold"
              >
                Liste Primes
              </Button>
              <Button
                onClick={() => setViewExtrasOpen(true)}
                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 shadow-sm font-bold"
              >
                Liste Extras
              </Button>
              <Button
                onClick={() => setViewDoublagesOpen(true)}
                className="bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border border-cyan-200 shadow-sm font-bold"
              >
                Liste Doublage
              </Button>
              <Button
                onClick={() => setViewAdvancesOpen(true)}
                className="bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 shadow-sm font-bold"
              >
                Liste Avances
              </Button>
            </div>
            <div className="w-full sm:w-56">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="border-[#c9b896] bg-[#f8f6f1] text-[#3d2c1e]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PayrollListView
            summary={filteredPayrollSummary}
            canSee={canSee}
            openEmployeePlanning={openEmployeePlanning}
            handlePayUser={handlePayUser}
            payingUser={payingUser}
            unpayingUser={unpayingUser}
            setUnpayTargetId={setUnpayTargetId}
            setUnpayConfirmOpen={setUnpayConfirmOpen}
          />
        </div>
      </main>

      {/* Planning Dialog */}
      <Dialog open={planningDialogOpen} onOpenChange={setPlanningDialogOpen}>
        <DialogContent className="bg-white border-[#c9b896] text-[#3d2c1e] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg lg:text-2xl font-bold text-[#8b5a2b] flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-600" />
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-[#c9b896]/30 shrink-0 bg-[#8b5a2b] flex items-center justify-center text-white font-bold">
                {selectedEmployee?.user?.photo ? (
                  <img src={selectedEmployee.user.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedEmployee?.user?.username?.charAt(0)
                )}
              </div>
              <span className="truncate">Planning du mois — {selectedEmployee?.user?.username}</span>
            </DialogTitle>
            <p className="text-[#6b5744] text-xs sm:text-sm lg:text-base mt-2">
              Points: 1 = shift simple, 2 = doublage. Mois affiché: {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
            </p>
          </DialogHeader>

          <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#f8f6f1] rounded-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-[#c9b896]">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-cyan-500"></div>
                <span className="text-xs sm:text-sm text-[#3d2c1e]">Shift simple</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#f8f6f1] rounded-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-[#c9b896]">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs sm:text-sm text-[#3d2c1e]">Doublage</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#f8f6f1] rounded-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-[#c9b896]">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-500"></div>
                <span className="text-xs sm:text-sm text-[#3d2c1e]">Repos / Non travaillé</span>
              </div>

              {/* Month navigation */}
              <div className="flex items-center gap-1 sm:gap-2 ml-auto bg-[#f8f6f1] rounded-lg px-1 sm:px-2 py-1 border border-[#c9b896]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="text-[#6b5744] hover:text-[#8b5a2b] hover:bg-white h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <span className="text-[#3d2c1e] font-medium px-1 sm:px-2 min-w-[100px] sm:min-w-[140px] text-center text-xs sm:text-sm">
                  {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="text-[#6b5744] hover:text-[#8b5a2b] hover:bg-white h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 lg:p-6 border border-[#c9b896]">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 lg:gap-2 mb-2">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[#6b5744] text-[10px] sm:text-xs lg:text-sm font-medium py-1 sm:py-2"
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 lg:gap-2">
                {calendarGrid.map((cell, idx) => (
                  <div
                    key={idx}
                    className={`
    aspect-square rounded-md sm:rounded-lg flex flex-col items-center justify-center p-0.5 sm:p-1 lg:p-2 relative
                      ${cell === null ? "bg-transparent" : cell.isWeekend ? "bg-blue-50" : "bg-white"}
                      ${cell !== null ? "border border-[#c9b896]/50" : ""}
    `}
                  >
                    {cell && (
                      <>
                        <span className="text-[#3d2c1e] text-[10px] sm:text-xs lg:text-sm font-medium">{cell.day}</span>
                        <div className="mt-0.5 sm:mt-1">
                          <div
                            className={`
    px-1 sm:px-1.5 lg:px-2 py-0.5 rounded text-[8px] sm:text-[10px] lg:text-xs font-medium
                              ${cell.type === "shift"
                                ? "bg-cyan-100 text-cyan-700 border border-cyan-200"
                                : cell.type === "doublage"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-gray-100 text-gray-700 border border-gray-200"
                              }
    `}
                          >
                            <span className="hidden sm:inline">
                              {cell.shiftName ? cell.shiftName.substring(0, 3).toUpperCase() : "REP"}
                            </span>
                            <span className="sm:hidden">
                              {cell.shiftName ? cell.shiftName.charAt(0) : "R"}
                            </span>
                          </div>
                        </div>
                        {/* Actual Status Dot */}
                        {cell.record && (
                          <div className={cn(
                            "absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                            cell.record.present === 1 ? "bg-emerald-500" : "bg-red-500"
                          )} title={cell.record.present === 1 ? "Présent" : "Absent"} />
                        )}
                        {cell.record && cell.record.retard > 0 && (
                          <div className="absolute top-0.5 left-0.5 text-[8px] text-amber-600 font-bold">
                            {formatDuration(cell.record.retard)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Statistics */}
            <div className="bg-[#f8f6f1] rounded-xl p-3 sm:p-4 lg:p-6 border border-[#c9b896]">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#8b5a2b] flex items-center gap-2 mb-4 sm:mb-6">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                Statistiques du mois
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Présence */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-[#6b5744] font-semibold uppercase text-[10px] sm:text-xs lg:text-sm tracking-wide">
                    Présence
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center bg-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 border border-[#c9b896]/50">
                      <span className="text-[#3d2c1e] text-xs sm:text-sm">Jours Travaillés</span>
                      <span className="text-[#3d2c1e] font-bold text-sm sm:text-base lg:text-lg">
                        {selectedEmployee?.presentDays || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                      <span className="text-red-700 text-xs sm:text-sm">Jours Absences</span>
                      <span className="text-red-700 font-bold text-sm sm:text-base lg:text-lg">
                        {selectedEmployee?.absentDays || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-[#6b5744] font-semibold uppercase text-[10px] sm:text-xs lg:text-sm tracking-wide">
                    Performance
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center bg-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 border border-[#c9b896]/50">
                      <span className="text-[#3d2c1e] text-xs sm:text-sm">Infractions (DT)</span>
                      <span className="text-[#3d2c1e] font-bold text-sm sm:text-base lg:text-lg">
                        {Math.round(selectedEmployee?.totalInfractions || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 border border-[#c9b896]/50">
                      <span className="text-[#3d2c1e] text-xs sm:text-sm">Retards (h, m)</span>
                      <span className="text-[#3d2c1e] font-bold text-sm sm:text-base lg:text-lg">
                        {selectedEmployee?.formattedRetard}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                      <span className="text-emerald-700 text-xs sm:text-sm">Prime</span>
                      <span className="text-emerald-700 font-bold text-sm sm:text-base lg:text-lg">
                        +{Math.round(selectedEmployee?.totalPrimes || 0)} DT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-[#6b5744] font-semibold uppercase text-[10px] sm:text-xs lg:text-sm tracking-wide">
                    Action
                  </h4>
                  <div className="bg-white rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center border border-[#c9b896]">
                    <div className="p-3 sm:p-4 rounded-full bg-emerald-600/10 border border-emerald-600/20 mb-3 sm:mb-4">
                      <Wallet className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-emerald-600" />
                    </div>
                    <span className="text-[#6b5744] text-xs sm:text-sm mb-1">Salaire calculé</span>
                    <span className="text-2xl sm:text-3xl font-bold text-[#3d2c1e] mb-3 sm:mb-4">
                      {Math.round(selectedEmployee?.netSalary || 0)} DT
                    </span>
                    <Button
                      onClick={() => {
                        if (selectedEmployee?.isPaid) {
                          setUnpayTargetId(selectedEmployee.userId)
                          setUnpayConfirmOpen(true)
                        } else if (selectedEmployee) {
                          handlePayUser(selectedEmployee.userId)
                        }
                      }}
                      disabled={payingUser || unpayingUser || !selectedEmployee}
                      className={cn(
                        "w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base lg:text-lg font-semibold transition-all shadow-lg",
                        selectedEmployee?.isPaid
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:opacity-90"
                      )}
                    >
                      {selectedEmployee?.isPaid ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Annuler Paiement
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Payer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doublages List Dialog */}
      <Dialog open={viewDoublagesOpen} onOpenChange={setViewDoublagesOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-600" /> Liste des Doublages
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Doublages pour {format(selectedMonth, 'MMMM yyyy', { locale: fr })}</p>
              <Select value={viewDoublagesSelectedDepartment} onValueChange={setViewDoublagesSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {(() => {
            const localTotal = filteredDoublagesList.reduce((acc: number, d: any) => acc + d.montant, 0);

            return (
              <>
                <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredDoublagesList.length === 0 ? (
                    <div className="text-center py-8 text-[#6b5744]">Aucun doublage trouvé</div>
                  ) : (
                    filteredDoublagesList.map((record: any) => {
                      const user = users.find((u: any) => u.id === record.user_id);
                      return (
                        <div key={record.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30 hover:bg-[#f8f6f1] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                                {user?.photo ? (
                                  <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                                    {user?.username?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#3d2c1e] text-sm">{user?.username}</p>
                                <p className="text-[10px] text-[#6b5744]">{format(new Date(record.date), 'dd/MM/yyyy', { locale: fr })}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {editingDoublageId === record.id ? (
                                <div className="flex items-center gap-2">
                                  <Popover open={doublageCalendarOpen} onOpenChange={setDoublageCalendarOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "h-8 justify-start text-left font-normal text-[10px] w-[110px] bg-white border-[#c9b896]/30",
                                          !editDoublageDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-1 h-3 w-3 text-[#8b5a2b]" />
                                        {editDoublageDate ? format(editDoublageDate, "dd/MM/yyyy") : "Date"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white border-[#c9b896]" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={editDoublageDate}
                                        onSelect={(date) => {
                                          setEditDoublageDate(date)
                                          setDoublageCalendarOpen(false)
                                        }}
                                        initialFocus
                                        locale={fr}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    type="number"
                                    value={editDoublageAmount}
                                    onChange={(e) => setEditDoublageAmount(e.target.value)}
                                    className="h-8 w-16 text-[10px] bg-white border-[#c9b896]/30"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateDoublage(record.id)} className="h-8 bg-[#3d2c1e] text-white px-2 text-[10px] font-black">OK</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingDoublageId(null)} className="h-8 px-2 text-[#6b5744] text-[10px]">X</Button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-cyan-600 font-black text-sm mr-2">
                                    {record.montant.toLocaleString()} DT
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingDoublageId(record.id);
                                      setEditDoublageAmount(record.montant.toString());
                                      setEditDoublageDate(new Date(record.date));
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <RotateCcw className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteTargetId(record.id);
                                      setDeleteType("doublage");
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
                  <span>TOTAL GLOBAL</span>
                  <span className="text-xl text-cyan-700">{Math.round(localTotal).toLocaleString()} DT</span>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Extras List Dialog */}
      <Dialog open={viewExtrasOpen} onOpenChange={setViewExtrasOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" /> Liste des Extras
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Extras pour {format(selectedMonth, 'MMMM yyyy', { locale: fr })}</p>
              <Select value={viewExtrasSelectedDepartment} onValueChange={setViewExtrasSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {(() => {
            const localTotal = filteredExtrasList.reduce((acc: number, e: any) => acc + e.montant, 0);

            return (
              <>
                <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredExtrasList.length === 0 ? (
                    <div className="text-center py-8 text-[#6b5744]">Aucun extra trouvé</div>
                  ) : (
                    filteredExtrasList.map((record: any) => {
                      const user = usersMap.get(String(record.user_id));
                      return (
                        <div key={record.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30 hover:bg-[#f8f6f1] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                                {user?.photo ? (
                                  <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                                    {user?.username?.charAt(0) || "?"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#3d2c1e] text-sm">{user?.username || "Inconnu"}</p>
                                <p className="text-[10px] text-[#6b5744]">{format(new Date(record.date_extra), 'dd MMM yyyy', { locale: fr })}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingExtraId === record.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    className="h-8 text-xs border rounded px-1"
                                    value={editExtraDate ? format(editExtraDate, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setEditExtraDate(e.target.valueAsDate || undefined)}
                                  />
                                  <Input
                                    type="number"
                                    value={editExtraAmount}
                                    onChange={(e) => setEditExtraAmount(e.target.value)}
                                    className="h-8 w-20 text-xs"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateExtra(record.id)} className="h-8 bg-black text-white px-2">OK</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingExtraId(null); setEditExtraDate(undefined); }} className="h-8 px-2">X</Button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-emerald-600 font-black text-sm mr-2">
                                    {record.montant.toLocaleString()} DT
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingExtraId(record.id);
                                      setEditExtraAmount(record.montant.toString());
                                      setEditExtraDate(new Date(record.date_extra));
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <RotateCcw className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteTargetId(record.id);
                                      setDeleteType("extra");
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
                  <span>TOTAL GLOBAL</span>
                  <span className="text-xl text-emerald-700">{Math.round(localTotal).toLocaleString()} DT</span>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Primes List Dialog */}
      <Dialog open={viewPrimesOpen} onOpenChange={setViewPrimesOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" /> Liste des Primes
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Primes pour {format(selectedMonth, 'MMMM yyyy', { locale: fr })}</p>
              <Select value={viewPrimesSelectedDepartment} onValueChange={setViewPrimesSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {(() => {
            const localTotal = filteredPrimesList.reduce((acc: number, e: any) => acc + e.montant, 0);

            return (
              <>
                <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredPrimesList.length === 0 ? (
                    <div className="text-center py-8 text-[#6b5744]">Aucune prime trouvée</div>
                  ) : (
                    filteredPrimesList.map((record: any) => {
                      const user = usersMap.get(String(record.user_id));
                      return (
                        <div key={record.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30 hover:bg-[#f8f6f1] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                                {user?.photo ? (
                                  <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                                    {user?.username?.charAt(0) || "?"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-[#3d2c1e] text-sm">{user?.username || "Inconnu"}</p>
                                <p className="text-[10px] text-[#6b5744]">{format(new Date(record.date_extra), 'dd MMM yyyy', { locale: fr })}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingExtraId === record.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    className="h-8 text-xs border rounded px-1"
                                    value={editExtraDate ? format(editExtraDate, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setEditExtraDate(e.target.valueAsDate || undefined)}
                                  />
                                  <Input
                                    type="number"
                                    value={editExtraAmount}
                                    onChange={(e) => setEditExtraAmount(e.target.value)}
                                    className="h-8 w-20 text-xs"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateExtra(record.id)} className="h-8 bg-black text-white px-2">OK</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditingExtraId(null); setEditExtraDate(undefined); }} className="h-8 px-2">X</Button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-amber-600 font-black text-sm mr-2">
                                    {record.montant.toLocaleString()} DT
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingExtraId(record.id);
                                      setEditExtraAmount(record.montant.toString());
                                      setEditExtraDate(new Date(record.date_extra));
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <RotateCcw className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDeleteTargetId(record.id);
                                      setDeleteConfirmOpen(true);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
                  <span>TOTAL GLOBAL</span>
                  <span className="text-xl text-amber-700">{Math.round(localTotal).toLocaleString()} DT</span>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Paid Users List Dialog */}
      <Dialog open={viewPaidOpen} onOpenChange={setViewPaidOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Liste des Salaires Payés
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Paiements effectués pour {format(selectedMonth, 'MMMM yyyy', { locale: fr })}</p>
              <Select value={viewPaidSelectedDepartment} onValueChange={setViewPaidSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {(() => {
            const filteredPaidUsers = payrollSummary.filter((p: any) => {
              const isPaid = p.isPaid;
              const matchesDep = viewPaidSelectedDepartment === "all" || p.user?.departement === viewPaidSelectedDepartment;
              return isPaid && matchesDep;
            });

            const currentTotal = filteredPaidUsers.reduce((acc: number, curr: any) => acc + curr.netSalary, 0);

            return (
              <>
                <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredPaidUsers.length === 0 ? (
                    <div className="text-center py-8 text-[#6b5744]">Aucun paiement trouvé</div>
                  ) : (
                    filteredPaidUsers.map((p: any) => (
                      <div key={p.userId} className="flex flex-col gap-2 p-4 rounded-xl border border-green-500/30 bg-green-50/30 hover:bg-green-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden border border-green-500/50 bg-white">
                              {p.user?.photo ? (
                                <img src={p.user.photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                                  {p.user?.username?.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-[#3d2c1e] text-sm">{p.user?.username}</p>
                            </div>
                          </div>
                          <div className="text-green-600 font-black text-sm">
                            {Math.round(p.netSalary).toLocaleString()} DT
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-green-500/10">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-[10px] font-bold text-green-700">PAYÉ</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
                  <span>TOTAL {viewPaidSelectedDepartment === "all" ? "PAYÉ" : viewPaidSelectedDepartment.toUpperCase()}</span>
                  <span className="text-xl text-green-700">{Math.round(currentTotal).toLocaleString()} DT</span>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* Grouped Doublages List Dialog (Summary View) */}
      <Dialog open={listeDoublageOpen} onOpenChange={setListeDoublageOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-600" /> Liste des Doublages
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Doublages groupés par employé</p>
              <Select value={viewDoublagesSelectedDepartment} onValueChange={setViewDoublagesSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(() => {
              const groupedByUser = new Map<string, { user: any, records: any[], total: number }>();
              filteredDoublagesList.forEach((record: any) => {
                const userId = String(record.user_id);
                if (!groupedByUser.has(userId)) {
                  groupedByUser.set(userId, { user: users.find((u: any) => u.id === record.user_id), records: [], total: 0 });
                }
                const group = groupedByUser.get(userId)!;
                group.records.push(record);
                group.total += record.montant;
              });

              if (groupedByUser.size === 0) return <div className="text-center py-8 text-[#6b5744]">Aucun doublage trouvé</div>;

              return Array.from(groupedByUser.values()).map(({ user, records, total }) => (
                <div key={user?.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                        {user?.photo ? (
                          <img src={user.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                            {user?.username?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#3d2c1e] text-sm">{user?.username}</p>
                        <p className="text-[10px] text-[#6b5744]">Dates travaillées:</p>
                      </div>
                    </div>
                    <div className="text-cyan-600 font-black text-lg">{total} DT</div>
                  </div>
                  <div className="ml-13 mt-2 flex flex-wrap gap-2">
                    {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record: any, idx: number) => (
                      <span key={idx} className="text-xs text-[#6b5744] bg-white px-2 py-1 rounded border border-[#c9b896]/30">
                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
            <span>TOTAL GLOBAL</span>
            <span className="text-xl text-cyan-700">{Math.round(filteredDoublagesList.reduce((acc: number, d: any) => acc + d.montant, 0)).toLocaleString()} DT</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped Extras List Dialog (Summary View) */}
      <Dialog open={listeExtrasOpen} onOpenChange={setListeExtrasOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" /> Liste des Extras
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Extras groupés par employé</p>
              <Select value={viewExtrasSelectedDepartment} onValueChange={setViewExtrasSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(() => {
              const groupedByUser = new Map<string, { user: any, records: any[], total: number }>();
              filteredExtrasList.forEach((record: any) => {
                const userId = String(record.user_id);
                if (!groupedByUser.has(userId)) {
                  groupedByUser.set(userId, { user: usersMap.get(userId), records: [], total: 0 });
                }
                const group = groupedByUser.get(userId)!;
                group.records.push(record);
                group.total += record.montant;
              });

              if (groupedByUser.size === 0) return <div className="text-center py-8 text-[#6b5744]">Aucun extra trouvé</div>;

              return Array.from(groupedByUser.values()).map(({ user, records, total }) => (
                <div key={user?.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                        {user?.photo ? (
                          <img src={user.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                            {user?.username?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#3d2c1e] text-sm">{user?.username || "Inconnu"}</p>
                        <p className="text-[10px] text-[#6b5744]">Dates travaillées:</p>
                      </div>
                    </div>
                    <div className="text-emerald-600 font-black text-lg">{total} DT</div>
                  </div>
                  <div className="ml-13 mt-2 flex flex-wrap gap-2">
                    {records.sort((a, b) => new Date(b.date_extra).getTime() - new Date(a.date_extra).getTime()).map((record: any, idx: number) => (
                      <span key={idx} className="text-xs text-[#6b5744] bg-white px-2 py-1 rounded border border-[#c9b896]/30">
                        {format(new Date(record.date_extra), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
            <span>TOTAL GLOBAL</span>
            <span className="text-xl text-emerald-700">{Math.round(filteredExtrasList.reduce((acc: number, e: any) => acc + e.montant, 0)).toLocaleString()} DT</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped Primes List Dialog (Summary View) */}
      <Dialog open={listePrimesOpen} onOpenChange={setListePrimesOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" /> Liste des Primes
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Primes groupées par employé</p>
              <Select value={viewPrimesSelectedDepartment} onValueChange={setViewPrimesSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(() => {
              const groupedByUser = new Map<string, { user: any, records: any[], total: number }>();
              filteredPrimesList.forEach((record: any) => {
                const userId = String(record.user_id);
                if (!groupedByUser.has(userId)) {
                  groupedByUser.set(userId, { user: usersMap.get(userId), records: [], total: 0 });
                }
                const group = groupedByUser.get(userId)!;
                group.records.push(record);
                group.total += record.montant;
              });

              if (groupedByUser.size === 0) return <div className="text-center py-8 text-[#6b5744]">Aucune prime trouvée</div>;

              return Array.from(groupedByUser.values()).map(({ user, records, total }) => (
                <div key={user?.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                        {user?.photo ? (
                          <img src={user.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                            {user?.username?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#3d2c1e] text-sm">{user?.username || "Inconnu"}</p>
                        <p className="text-[10px] text-[#6b5744]">Dates travaillées:</p>
                      </div>
                    </div>
                    <div className="text-amber-600 font-black text-lg">{total} DT</div>
                  </div>
                  <div className="ml-13 mt-2 flex flex-wrap gap-2">
                    {records.sort((a, b) => new Date(b.date_extra).getTime() - new Date(a.date_extra).getTime()).map((record: any, idx: number) => (
                      <span key={idx} className="text-xs text-[#6b5744] bg-white px-2 py-1 rounded border border-[#c9b896]/30">
                        {format(new Date(record.date_extra), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
            <span>TOTAL GLOBAL</span>
            <span className="text-xl text-amber-700">{Math.round(filteredPrimesList.reduce((acc: number, e: any) => acc + e.montant, 0)).toLocaleString()} DT</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advances View Dialog (Detailed List) */}
      <Dialog open={viewAdvancesOpen} onOpenChange={setViewAdvancesOpen}>
        <DialogContent className="bg-white border-[#c9b896] text-[#3d2c1e] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-0">
          <div className="sticky top-0 bg-white border-b border-[#c9b896]/30 p-6 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-600/10 border border-orange-600/20">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-[#8b5a2b]">Détail des Avances</DialogTitle>
                <p className="text-sm text-[#6b5744]">Toutes les avances de {format(selectedMonth, 'MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
            <Select value={viewAdvancesSelectedDepartment} onValueChange={setViewAdvancesSelectedDepartment}>
              <SelectTrigger className="w-[200px] bg-[#f8f6f1] border-[#c9b896]">
                <SelectValue placeholder="Département" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#c9b896]">
                <SelectItem value="all">Tous les départements</SelectItem>
                {departments.map((dep: any) => (
                  <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-6">
            <div className="grid gap-4">
              {filteredAvancesList.length === 0 ? (
                <div className="text-center py-12 bg-[#f8f6f1]/50 rounded-2xl border-2 border-dashed border-[#c9b896]/30">
                  <p className="text-[#6b5744] font-medium italic">Aucune avance enregistrée ce mois-ci.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#c9b896]/30 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f6f1] border-b border-[#c9b896]/30">
                      <tr>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-[#8b5a2b]">Employé</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-[#8b5a2b]">Date</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-[#8b5a2b]">Motif</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-[#8b5a2b] text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c9b896]/20">
                      {filteredAvancesList.map((a: any) => (
                        <tr key={a.id} className="hover:bg-[#f8f6f1]/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#8b5a2b] flex items-center justify-center text-white text-xs font-bold">
                                {a.username?.charAt(0) || "?"}
                              </div>
                              <span className="font-bold text-[#3d2c1e]">{a.username || "Inconnu"}</span>
                            </div>
                          </td>
                          <td className="p-4 text-[#6b5744] text-sm">
                            {format(new Date(a.date), 'dd/MM/yyyy', { locale: fr })}
                          </td>
                          <td className="p-4 text-[#6b5744] text-sm italic">
                            {a.motif || "Avance sur salaire"}
                          </td>
                          <td className="p-4 text-right font-black text-[#8b5a2b]">
                            {a.montant.toLocaleString()} DT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {filteredAvancesList.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="bg-[#8b5a2b] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-8">
                  <span className="text-sm font-black uppercase tracking-widest opacity-80">Total Global</span>
                  <span className="text-2xl font-black">
                    {filteredAvancesList.reduce((acc: number, a: any) => acc + a.montant, 0).toLocaleString()} DT
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grouped Avances List Dialog (Summary View - Click from Card) */}
      <Dialog open={listeAvancesOpen} onOpenChange={setListeAvancesOpen}>
        <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" /> Liste des Avances
            </DialogTitle>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-[#6b5744]">Avances groupées par employé</p>
              <Select value={viewAdvancesSelectedDepartment} onValueChange={setViewAdvancesSelectedDepartment}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-[#f8f6f1] border-[#c9b896]">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#c9b896]">
                  <SelectItem value="all">Tous les dép.</SelectItem>
                  {departments.map((dep: any) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(() => {
              const groupedByUser = new Map<string, { user: any, records: any[], total: number }>();
              filteredAvancesList.forEach((record: any) => {
                const userId = String(record.user_id);
                if (!groupedByUser.has(userId)) {
                  groupedByUser.set(userId, { user: usersMap.get(userId), records: [], total: 0 });
                }
                const group = groupedByUser.get(userId)!;
                group.records.push(record);
                group.total += record.montant;
              });

              if (groupedByUser.size === 0) return <div className="text-center py-8 text-[#6b5744]">Aucune avance trouvée</div>;

              return Array.from(groupedByUser.values()).map(({ user, records, total }) => (
                <div key={user?.id} className="flex flex-col gap-2 p-4 rounded-xl border border-[#c9b896]/30 bg-[#f8f6f1]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-[#c9b896]/50 bg-white">
                        {user?.photo ? (
                          <img src={user.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[#8b5a2b] font-bold">
                            {user?.username?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[#3d2c1e] text-sm">{user?.username}</p>
                        <p className="text-[10px] text-[#6b5744]">Dates des avances:</p>
                      </div>
                    </div>
                    <div className="text-orange-600 font-black text-lg">{total} DT</div>
                  </div>
                  <div className="ml-13 mt-2 flex flex-wrap gap-2">
                    {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record: any, idx: number) => (
                      <span key={idx} className="text-xs text-[#6b5744] bg-white px-2 py-1 rounded border border-[#c9b896]/30">
                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-[#c9b896]/30 flex justify-between items-center font-black text-[#8b5a2b]">
            <span>TOTAL GLOBAL</span>
            <span className="text-xl text-orange-700">{Math.round(filteredAvancesList.reduce((acc: number, a: any) => acc + a.montant, 0)).toLocaleString()} DT</span>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white border-[#c9b896] rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#8b5a2b] font-bold text-xl flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Supprimer cet élément ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6b5744] text-base">
              Cette action est irréversible. Le montant sera retiré de la fiche de paie de l'employé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-[#c9b896] text-[#3d2c1e] hover:bg-gray-50 uppercase text-xs font-black tracking-widest">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExtra}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white uppercase text-xs font-black tracking-widest px-6"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}