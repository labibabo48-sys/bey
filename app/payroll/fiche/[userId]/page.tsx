"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ChevronLeft, FileText, Printer, Save, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Wallet, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { gql, useQuery, useMutation } from "@apollo/client"
import { useParams, useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { NotificationBell } from "@/components/notification-bell"
import { cn } from "@/lib/utils"

const GET_USER_DATA = gql`
  query GetUserData($userId: ID!) {
    getUser(id: $userId) {
      id
      username
      departement
      role
      base_salary
      phone
      cin
    }
  }
`


const GET_PAYROLL = gql`
  query GetPayroll($month: String!, $userId: ID) {
    getPayroll(month: $month, userId: $userId) {
      id
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
      clock_in
      clock_out
    }
  }
`

const INIT_PAYROLL = gql`
  mutation InitPayroll($month: String!) {
    initPayrollMonth(month: $month)
  }
`

const SYNC_ATTENDANCE = gql`
  mutation SyncAttendance($date: String) {
    syncAttendance(date: $date)
  }
`

const UPDATE_PAYROLL_RECORD = gql`
  mutation UpdatePayrollRecord($month: String!, $id: ID!, $input: PayrollInput!) {
    updatePayrollRecord(month: $month, id: $id, input: $input) {
      id
      present
      acompte
      extra
      prime
      infraction
      mise_a_pied
      retard
      remarque
      doublage
      clock_in
      clock_out
    }
  }
`

export default function UserFichePage() {
    const { userId } = useParams()
    const router = useRouter()
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy_MM"))

    const { data: userData, error: userError } = useQuery(GET_USER_DATA, {
        variables: { userId: userId ? String(userId) : "" },
        skip: !userId
    })
    const user = userData?.getUser


    const { data: payrollData, refetch: refetchPayroll, loading: loadingPayroll, error: payrollError } = useQuery(GET_PAYROLL, {
        variables: {
            month: selectedMonth,
            userId: userId ? String(userId) : ""
        },
        skip: !userId,
        fetchPolicy: "cache-and-network"
    })

    if (userError) console.error("User Query Error:", userError);
    if (payrollError) console.error("Payroll Query Error:", payrollError);

    const [initPayroll] = useMutation(INIT_PAYROLL)
    const [syncAttendance, { loading: syncing }] = useMutation(SYNC_ATTENDANCE)
    const [updateRecord] = useMutation(UPDATE_PAYROLL_RECORD)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [showRedirectDialog, setShowRedirectDialog] = useState(false)
    const [editForm, setEditForm] = useState<any>({
        present: 1,
        acompte: 0,
        extra: 0,
        prime: 0,
        infraction: 0,
        retard: 0,
        mise_a_pied: 0,
        remarque: "",
        doublage: 0
    })
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const formatDuration = (mins: number) => {
        if (!mins || mins <= 0) return "-"
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) {
            return m > 0 ? `${h}h ${m}m` : `${h}h`
        }
        return `${m} min`
    }

    // Initialize month if data empty
    useEffect(() => {
        if (!loadingPayroll && (!payrollData?.getPayroll || payrollData.getPayroll.length === 0)) {
            initPayroll({ variables: { month: selectedMonth } }).then(() => refetchPayroll())
        }
    }, [payrollData, loadingPayroll, selectedMonth, initPayroll, refetchPayroll])

    const payroll = payrollData?.getPayroll || []

    // Calculations
    const stats = useMemo(() => {
        const totalDays = payroll.reduce((sum: number, r: any) => sum + (r.present ? 1 : 0), 0)
        const totalRetardMins = payroll.reduce((sum: number, r: any) => sum + (r.retard || 0), 0)
        // Rule: Each retard > 30 mins = -30 DT (Handled in DB via infraction column)
        const retardPenaltyTotal = payroll.reduce((sum: number, r: any) => sum + (r.retard > 30 ? 30 : 0), 0)

        const [y, m] = selectedMonth.split('_').map(Number)
        const daysInMonth = new Date(y, m, 0).getDate()
        const baseSalary = user?.base_salary || 0
        const dayValue = baseSalary / daysInMonth

        const today = new Date()
        const isCurrentMonth = format(today, 'yyyy_MM') === selectedMonth
        const todayStr = format(today, 'yyyy-MM-dd')

        const totalAbsents = payroll.filter((r: any) => {
            if (isCurrentMonth) return r.date <= todayStr && r.present === 0
            return r.present === 0
        }).length

        const totalPassed = payroll.filter((r: any) => {
            if (isCurrentMonth) return r.date <= todayStr
            return true
        }).length

        const workedDaysCount = payroll.filter((r: any) => {
            if (isCurrentMonth) return r.date <= todayStr && r.present === 1
            return r.present === 1
        }).length

        const extraDaysCount = payroll.filter((r: any) => (r.extra || 0) > 0).length
        const effectivePassed = Math.max(0, totalPassed - extraDaysCount)
        const effectiveWorked = Math.max(0, workedDaysCount - extraDaysCount)

        // Rule: If absences > 4, only pay for WORKED days (minus extras). If absences <= 4, pay for PASSED days (minus extras).
        const paidDays = totalAbsents > 4 ? effectiveWorked : effectivePassed
        const calculatedSalary = paidDays * dayValue

        const totalAdvances = payroll.reduce((sum: number, r: any) => sum + (r.acompte || 0), 0)
        const totalPrimes = payroll.reduce((sum: number, r: any) => sum + (r.prime || 0), 0)
        const totalInfractions = payroll.reduce((sum: number, r: any) => sum + (r.infraction || 0), 0)
        const totalExtras = payroll.reduce((sum: number, r: any) => sum + (r.extra || 0), 0)
        const totalDoublages = payroll.reduce((sum: number, r: any) => sum + (r.doublage || 0), 0)

        // Net Salary: Presence - Infractions - Advances
        const netSalary = calculatedSalary - totalInfractions - totalAdvances

        return {
            totalDays: workedDaysCount,
            totalAbsents,
            totalRetardMins: totalRetardMins,
            retardPenaltyTotal: retardPenaltyTotal,
            calculatedSalary: calculatedSalary,
            totalAdvances: totalAdvances,
            totalPrimes: totalPrimes,
            totalInfractions: totalInfractions,
            totalExtras: totalExtras,
            totalDoublages: totalDoublages,
            netSalary: netSalary
        }
    }, [payroll, user, selectedMonth])

    const handleSync = async () => {
        // Sync today and yesterday
        await syncAttendance({ variables: { date: format(new Date(), 'yyyy-MM-dd') } })
        await refetchPayroll()
    }

    const startEdit = (record: any) => {
        setEditingId(record.id)
        setEditForm({
            present: record.present,
            acompte: record.acompte || 0,
            extra: record.extra || 0,
            prime: record.prime || 0,
            infraction: record.infraction || 0,
            retard: record.retard || 0,
            mise_a_pied: record.mise_a_pied || 0,
            remarque: record.remarque || "",
            doublage: record.doublage || 0
        })
        setIsEditDialogOpen(true)
    }

    const handleFieldChange = (field: string, value: any) => {
        setEditForm({ ...editForm, [field]: value });
    }

    const saveEdit = async () => {
        if (!editingId || isSaving) return
        setIsSaving(true)
        try {
            const input = {
                present: parseInt(String(editForm.present)),
                acompte: parseFloat(String(editForm.acompte || 0)),
                extra: parseFloat(String(editForm.extra || 0)),
                prime: parseFloat(String(editForm.prime || 0)),
                infraction: parseFloat(String(editForm.infraction || 0)),
                retard: parseInt(String(editForm.retard || 0)),
                mise_a_pied: parseFloat(String(editForm.mise_a_pied || 0)),
                doublage: parseFloat(String(editForm.doublage || 0)),
                remarque: editForm.remarque
            };

            await updateRecord({
                variables: {
                    month: selectedMonth,
                    id: editingId,
                    input
                }
            })

            setIsEditDialogOpen(false)
            setEditingId(null)
        } catch (err) {
            console.error("Update Error:", err)
            alert("Erreur lors de l'enregistrement.")
        } finally {
            setIsSaving(false)
        }
    }

    const months = useMemo(() => {
        const list = []
        const now = new Date()
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            list.push({
                value: format(d, "yyyy_MM"),
                label: format(d, "MMMM yyyy", { locale: fr })
            })
        }
        return list
    }, [])

    if (!user && !userError) return <div className="p-10 font-bold text-[#8b5a2b]">Chargement des données employé...</div>
    if (userError) return <div className="p-10 text-red-600 font-bold">Erreur de chargement employé: {userError.message}</div>
    if (payrollError) return <div className="p-10 text-red-600 font-bold">Erreur de chargement paie: {payrollError.message}</div>
    if (!user) return <div className="p-10 text-[#8b5a2b]">Employé introuvable (ID: {userId})</div>

    return (
        <div className="flex min-h-screen flex-col bg-[#f8f6f1] lg:flex-row print:block">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 print:pt-0 print:overflow-visible print:w-full print:p-0 print:m-0">
                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0 !important;
                        }
                        body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                        }
                        .print-container {
                            width: 100% !important;
                            padding: 8mm 10mm !important;
                            margin: 0 !important;
                            overflow: visible !important;
                        }
                        .print-hidden, [class*="print:hidden"] {
                            display: none !important;
                        }
                        main, .print-container, main > div {
                            width: 100% !important;
                            display: block !important;
                            visibility: visible !important;
                            max-width: none !important;
                            overflow: visible !important;
                            height: auto !important;
                        }
                        .card-print {
                            box-shadow: none !important;
                            border: 1px solid #3d2c1e !important;
                            padding: 3mm !important;
                            width: 100% !important;
                            height: auto !important;
                            min-height: 0 !important;
                            display: flex !important;
                            flex-direction: column !important;
                            overflow: visible !important;
                            border-radius: 0 !important;
                        }
                        table {
                            font-size: 10px !important;
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: collapse !important;
                        }
                        tr {
                            page-break-inside: avoid !important;
                        }
                        th, td {
                            padding: 2px 4px !important;
                            line-height: 1 !important;
                            border: 1px solid #3d2c1e !important;
                        }
                        .signatures {
                            margin-top: 5mm !important;
                            padding-top: 2mm !important;
                            padding-bottom: 2mm !important;
                        }
                        .summary-section {
                            margin-top: 3mm !important;
                        }
                        .overflow-x-auto {
                            overflow: visible !important;
                        }
                    }
                `}</style>
                <div className="border-b border-[#c9b896] bg-white p-6 sm:p-8 lg:p-10 shadow-sm print:hidden">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push("/payroll/fiche")}
                                className="text-[#8b5a2b] hover:bg-[#f8f6f1]"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <div>
                                <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#8b5a2b]">
                                    Fiche de Paie — {user.username}
                                </h1>
                                <p className="text-[#6b5744]">Détails du salaire et présences</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[200px] border-[#c9b896] bg-[#f8f6f1]">
                                    <SelectValue placeholder="Choisir le mois" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button onClick={handleSync} disabled={syncing} className="bg-[#8b5a2b] text-white hover:opacity-90">
                                <RefreshCw className={cn("h-5 w-5 mr-2", syncing && "animate-spin")} />
                                Sync
                            </Button>

                            <Button
                                onClick={() => {
                                    const oldTitle = document.title;
                                    document.title = `${user.username}_Fiche_Paie_${selectedMonth}`;
                                    window.print();
                                    document.title = oldTitle;
                                }}
                                variant="outline"
                                className="border-[#c9b896] text-[#8b5a2b]"
                            >
                                <Printer className="h-5 w-5 mr-2" />
                                Imprimer
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto print:p-0 print:max-w-none print:m-0 print-container">
                    {/* Printable Sheet */}
                    <Card className="bg-white border-[#c9b896] shadow-xl p-8 sm:p-12 print:p-2 print:border-px print:border-[#3d2c1e] print:shadow-none min-h-[900px] print:min-h-0 print:w-full print:rounded-none card-print">
                        {/* Header section identical to photo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#3d2c1e] print:text-[12px] print:p-0">
                            <div className="p-4 print:p-2 border-r sm:border-r border-b border-[#3d2c1e] space-y-1">
                                <p className="text-sm print:text-[11.5px]"><strong>Nom:</strong> {user.username.split(' ')[1] || ""}</p>
                                <p className="text-sm print:text-[11.5px]"><strong>Prénom:</strong> {user.username.split(' ')[0] || ""}</p>
                                <p className="text-sm print:text-[11.5px]"><strong>Poste:</strong> {user.departement}</p>
                                <p className="text-sm print:text-[11.5px]"><strong>Salaire Base:</strong> {user.base_salary} DT</p>
                            </div>
                            <div className="p-4 print:p-2 border-b border-[#3d2c1e] space-y-1">
                                <p className="text-sm print:text-[11.5px]"><strong>Tél:</strong> {user.phone || "-"}</p>
                                <p className="text-sm print:text-[11.5px]"><strong>CIN:</strong> {user.cin || "-"}</p>
                                <p className="text-sm print:text-[11.5px] text-gray-500">Mois: {months.find(m => m.value === selectedMonth)?.label}</p>
                            </div>
                        </div>
                        {/* Main Table */}
                        <div className="mt-2 print:mt-2">
                            {/* Unified Table View - Visible on all devices with horizontal scroll */}
                            <div className="block print:block overflow-x-auto">
                                <table className="w-full border-collapse border border-[#3d2c1e] print:text-[10px] print:leading-none min-w-[800px] md:min-w-0">
                                    <thead>
                                        <tr className="bg-[#f8f6f1]/50">
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-left w-24">Date</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-left w-24">Jour</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-center w-20">Présence</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-center w-20">Retard</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-center w-20">Entrée</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-center w-20">Sortie</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-right w-24">Acompte</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-right w-24">Extra</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-right w-20">Double</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-right w-24">Prime</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-right w-24">Infraction</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-1 text-xs print:text-[10px] font-bold uppercase text-left">Remarque</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payroll.map((record: any) => {
                                            const date = new Date(record.date)
                                            const dayName = format(date, "eeee", { locale: fr })
                                            const isWeekend = date.getDay() === 0 // Dimanche

                                            return (
                                                <tr key={record.id} onClick={() => startEdit(record)} className={cn("hover:bg-[#f8f6f1]/30 cursor-pointer transition-colors group", isWeekend && "bg-gray-50")}>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] group-hover:bg-[#8b5a2b]/5 transition-colors">{format(date, "dd/MM/yyyy")}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] capitalize group-hover:bg-[#8b5a2b]/5 transition-colors">{dayName}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-center font-bold group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.present === 1 ? "1" : record.present === 0 ? "0" : ""}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-center text-orange-600 group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.retard > 0 ? formatDuration(record.retard) : "-"}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-center font-mono group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.clock_in || "-"}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-center font-mono group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.clock_out || "-"}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-right group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.acompte > 0 ? `${record.acompte} DT` : ""}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-right text-emerald-600 group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.extra > 0 ? `${record.extra} DT` : ""}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-right text-cyan-600 group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.doublage > 0 ? `${record.doublage} DT` : ""}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-right text-blue-600 group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.prime > 0 ? `${record.prime} DT` : "-"}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] text-right text-red-600 group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.infraction > 0 ? `${record.infraction} DT` : "-"}
                                                    </td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-sm print:text-[9px] italic group-hover:bg-[#8b5a2b]/5 transition-colors">
                                                        {record.remarque || (record.present === 0 ? "ABSENT" : "")}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Summaries - Redesigned as a single cohesive block */}
                        <div className="mt-2 print:mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-x-4 summary-section">
                            {/* Column 1: Presence & Base Stats */}
                            <div className="space-y-2">
                                <table className="w-full border-collapse border border-[#3d2c1e] print:text-[11.5px]">
                                    <thead>
                                        <tr className="bg-[#f8f6f1]">
                                            <th colSpan={2} className="border border-[#3d2c1e] p-1 print:p-0.5 font-black uppercase text-center text-[#8b5a2b]">Statistiques & Présence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold">Total Jours Travail</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black">{stats.totalDays}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold">Total Jours Absence</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black text-red-600">{stats.totalAbsents}</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold">Total Retards</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black">{formatDuration(stats.totalRetardMins)}</td>
                                        </tr>
                                        <tr className="bg-[#f8f6f1]/30">
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold text-[#8b5a2b]">Salaire (Présence)</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black text-[#8b5a2b]">
                                                {stats.calculatedSalary.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Primes & Extras Box (Separate because they are separately paid) */}
                                <div className="p-2 border-2 border-dashed border-[#8b5a2b]/30 rounded-xl bg-[#f8f6f1]/20 print:p-1 print:border-px space-y-0.5">
                                    <h4 className="text-[9px] print:text-[8px] font-black uppercase text-[#8b5a2b]">Gains Hors Salaire (Espèces)</h4>
                                    <div className="flex justify-between items-center text-xs print:text-[8.5px]">
                                        <span className="font-medium text-blue-700">Total Primes</span>
                                        <span className="font-black text-blue-700">{stats.totalPrimes.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs print:text-[8.5px]">
                                        <span className="font-medium text-emerald-700">Total Extras</span>
                                        <span className="font-black text-emerald-700">{stats.totalExtras.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs print:text-[8.5px]">
                                        <span className="font-medium text-cyan-700">Total Doublages (Espèces)</span>
                                        <span className="font-black text-cyan-700">{stats.totalDoublages.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Deductions & Final Total */}
                            <div className="space-y-2">
                                <table className="w-full border-collapse border border-[#3d2c1e] print:text-[11.5px]">
                                    <thead>
                                        <tr className="bg-[#f8f6f1]">
                                            <th colSpan={2} className="border border-[#3d2c1e] p-1 print:p-0.5 font-black uppercase text-center text-red-700">Déductions & Avances</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold">Avances (Acomptes)</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black text-red-600">-{stats.totalAdvances.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 font-bold">Infractions (Automatiques + Manuelles)</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-right font-black text-red-600">-{stats.totalInfractions.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</td>
                                        </tr>
                                        <tr className="bg-[#8b5a2b] text-white print:h-10">
                                            <td className="border border-[#3d2c1e] p-2 print:p-1 text-sm font-black uppercase">Net à Payer</td>
                                            <td className="border border-[#3d2c1e] p-2 print:p-1 text-lg print:text-base text-right font-black">
                                                {stats.netSalary.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signature areas */}
                        <div className="mt-4 print:mt-2 flex justify-between px-10 signatures">
                            <div className="text-center">
                                <p className="font-bold underline text-xs print:text-[10px]">Signature Employeur</p>
                                <div className="h-6 print:h-6"></div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold underline text-xs print:text-[10px]">Signature Employé</p>
                                <div className="h-6 print:h-6"></div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="bg-white border-[#c9b896] sm:max-w-[500px] rounded-3xl p-8 shadow-2xl overflow-hidden">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-[#8b5a2b] flex items-center gap-3">
                                <FileText className="h-7 w-7" /> Modifier la journée
                            </DialogTitle>
                            <p className="text-sm font-medium text-[#6b5744] opacity-70">Ajustement manuel du relevé</p>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-5 mt-6 py-2">
                            <div className="space-y-2 col-span-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Statut de Présence</Label>
                                <div className="flex bg-[#f8f6f1] p-1.5 rounded-2xl gap-2 border border-[#c9b896]/30">
                                    <button
                                        onClick={() => handleFieldChange('present', 1)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2",
                                            editForm.present === 1 ? "bg-emerald-600 text-white shadow-lg scale-[1.02]" : "text-[#6b5744] hover:bg-white"
                                        )}
                                    ><CheckCircle className="h-4 w-4" /> Présent</button>
                                    <button
                                        onClick={() => handleFieldChange('present', 0)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2",
                                            editForm.present === 0 ? "bg-red-600 text-white shadow-lg scale-[1.02]" : "text-[#6b5744] hover:bg-white"
                                        )}
                                    ><XCircle className="h-4 w-4" /> Absent</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Retard (Min)</Label>
                                <Input
                                    type="number"
                                    value={editForm.retard}
                                    onChange={e => handleFieldChange('retard', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-[#f8f6f1]/50 font-bold focus:bg-white transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Mise à pied (Jours)</Label>
                                <Input
                                    type="number"
                                    value={editForm.mise_a_pied}
                                    onChange={e => handleFieldChange('mise_a_pied', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-[#f8f6f1]/50 font-bold focus:bg-white transition-all text-red-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Prime (DT)</Label>
                                <Input
                                    type="number"
                                    value={editForm.prime}
                                    onChange={e => handleFieldChange('prime', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-blue-50/50 font-bold focus:bg-white transition-all text-blue-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Infraction (DT)</Label>
                                <Input
                                    type="number"
                                    value={editForm.infraction}
                                    onChange={e => handleFieldChange('infraction', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-red-50/50 font-bold focus:bg-white transition-all text-red-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Acompte (DT)</Label>
                                <Input
                                    type="number"
                                    value={editForm.acompte}
                                    onChange={e => handleFieldChange('acompte', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-gray-50/50 font-bold focus:bg-white transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Extra (DT)</Label>
                                <Input
                                    type="number"
                                    value={editForm.extra}
                                    onChange={e => handleFieldChange('extra', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-emerald-50/50 font-bold focus:bg-white transition-all text-emerald-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Doublage (DT)</Label>
                                <Input
                                    type="number"
                                    value={editForm.doublage}
                                    onChange={e => handleFieldChange('doublage', e.target.value)}
                                    className="h-12 rounded-2xl border-[#c9b896] bg-cyan-50/50 font-bold focus:bg-white transition-all text-cyan-700"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label className="text-[10px] font-black uppercase text-[#8b5a2b] ml-1">Notes / Remarque</Label>
                                <Input
                                    value={editForm.remarque}
                                    onChange={e => setEditForm({ ...editForm, remarque: e.target.value })}
                                    placeholder="Détails de l'ajustement..."
                                    className="h-12 rounded-2xl border-[#c9b896] bg-[#f8f6f1]/50 font-bold focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-8 gap-3 sm:flex-row flex-col">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditDialogOpen(false)}
                                className="h-12 px-6 rounded-2xl text-[#6b5744] font-black uppercase text-[11px] tracking-widest order-2 sm:order-1"
                            >Annuler</Button>
                            <Button
                                onClick={saveEdit}
                                disabled={isSaving}
                                className="h-12 px-10 rounded-2xl bg-[#8b5a2b] hover:bg-[#6b4521] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#8b5a2b]/20 flex items-center justify-center gap-2 flex-1 sm:flex-none order-1 sm:order-2"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
