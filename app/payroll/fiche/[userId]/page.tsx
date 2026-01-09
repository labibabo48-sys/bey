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
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ChevronLeft, FileText, Printer, Save, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Wallet, CheckCircle, XCircle, Loader2, RotateCcw, Clock, Edit2 } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { gql, useQuery, useMutation } from "@apollo/client"
import { useParams, useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDaysInMonth } from "date-fns"
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
      permissions
      nbmonth
      is_coupure
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
      p1_in
      p1_out
      p2_in
      p2_out
      paid
      salaire_net
    }
  }
`

const INIT_PAYROLL = gql`
  mutation InitPayroll($month: String!) {
    initPayrollMonth(month: $month)
  }
`

const SYNC_ATTENDANCE = gql`
  mutation SyncAttendance($date: String, $userId: ID, $month: String) {
    syncAttendance(date: $date, userId: $userId, month: $month)
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
      p1_in
      p1_out
      p2_in
      p2_out
      salaire_net
    }
  }
`

const PAY_USER = gql`
  mutation PayUser($month: String!, $userId: ID!, $netSalary: Float) {
    payUser(month: $month, userId: $userId, netSalary: $netSalary)
  }
`

const UNPAY_USER = gql`
  mutation UnpayUser($month: String!, $userId: ID!) {
    unpayUser(month: $month, userId: $userId)
  }
`

const UPDATE_NB_MONTH = gql`
  mutation UpdateNbMonth($userId: ID!, $nbmonth: Int!) {
    updateNbMonth(userId: $userId, nbmonth: $nbmonth)
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
    const [payUser, { loading: paying }] = useMutation(PAY_USER)
    const [unpayUser, { loading: unpaying }] = useMutation(UNPAY_USER)
    const [updateNbMonth] = useMutation(UPDATE_NB_MONTH)

    const [nbMonth, setNbMonth] = useState<number | ''>('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
    const [manualNetValue, setManualNetValue] = useState<string>("")

    const [editForm, setEditForm] = useState<any>({
        present: 1,
        acompte: 0,
        extra: 0,
        prime: 0,
        infraction: 0,
        retard: 0,
        mise_a_pied: 0,
        remarque: "",
        doublage: 0,
        p1_in: "",
        p1_out: "",
        p2_in: "",
        p2_out: "",
        salaire_net: 0,
        isCoupure: false
    })
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Initialize nbMonth from user data
    useEffect(() => {
        if (user && user.nbmonth !== undefined) {
            setNbMonth(user.nbmonth || getDaysInMonth(new Date(selectedMonth.replace("_", "-") + "-01")))
        }
    }, [user, selectedMonth])

    const handleFieldChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }))
    }

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
        const monthDate = new Date(selectedMonth.replace("_", "-") + "-01");
        const daysInMonth = getDaysInMonth(monthDate);
        const divisor = Number(nbMonth) || daysInMonth;

        const totalPresentOnWorkDays = payroll.reduce((sum: number, r: any) => sum + (parseFloat(r.present || 0)), 0)

        const baseSalary = user?.base_salary || 0
        const dayValue = baseSalary / divisor

        // USER LOGIC: (BaseSalary / Divisor) * PresentDays
        const paidDays = totalPresentOnWorkDays;
        const calculatedSalary = dayValue * paidDays;

        const totalAbsentsDisplay = daysInMonth - paidDays;

        const totalRetardMins = payroll.reduce((sum: number, r: any) => sum + (r.retard || 0), 0)
        const totalAdvances = payroll.reduce((sum: number, r: any) => sum + parseFloat(r.acompte || 0), 0)
        const totalPrimes = payroll.reduce((sum: number, r: any) => sum + parseFloat(r.prime || 0), 0)
        const totalInfractions = payroll.reduce((sum: number, r: any) => sum + parseFloat(r.infraction || 0), 0)
        const totalExtras = payroll.reduce((sum: number, r: any) => sum + parseFloat(r.extra || 0), 0)
        const totalDoublages = payroll.reduce((sum: number, r: any) => sum + parseFloat(r.doublage || 0), 0)

        const isPaid = payroll.some((r: any) => r.paid === true)
        const manualNetOverride = payroll.find((r: any) => (r.salaire_net || 0) > 0)?.salaire_net;

        // Net Salary: Presence - Infractions - Advances
        let netSalary = calculatedSalary - totalInfractions - totalAdvances
        if (manualNetOverride) netSalary = manualNetOverride;

        return {
            totalDays: totalPresentOnWorkDays,
            totalAbsents: totalAbsentsDisplay,
            totalRetardMins,
            calculatedSalary,
            totalAdvances,
            totalPrimes,
            totalInfractions,
            totalExtras,
            totalDoublages,
            netSalary,
            isPaid,
            isOverridden: !!manualNetOverride
        }
    }, [payroll, user, selectedMonth, nbMonth])

    const handleSync = async () => {
        if (stats.isPaid) return;
        if (nbMonth !== '' && nbMonth !== user?.nbmonth) {
            await updateNbMonth({
                variables: {
                    userId: String(userId),
                    nbmonth: Number(nbMonth)
                }
            })
        }
        await syncAttendance({
            variables: {
                userId: String(userId),
                month: selectedMonth
            }
        })
        await refetchPayroll()
    }

    const handlePay = async () => {
        if (!userId || paying || unpaying) return
        try {
            await payUser({
                variables: {
                    month: selectedMonth,
                    userId: String(userId),
                    netSalary: parseFloat(stats.netSalary.toFixed(3))
                }
            })
            await refetchPayroll()
        } catch (err) { console.error("Pay Error:", err) }
    }

    const handleUnpay = async () => {
        if (!userId || paying || unpaying) return
        try {
            await unpayUser({ variables: { month: selectedMonth, userId: String(userId) } })
            await refetchPayroll()
        } catch (err) { console.error("Unpay Error:", err) }
    }

    const startEdit = (record: any) => {
        if (stats.isPaid) return;
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
            doublage: record.doublage || 0,
            p1_in: record.p1_in || "",
            p1_out: record.p1_out || "",
            p2_in: record.p2_in || "",
            p2_out: record.p2_out || "",
            salaire_net: record.salaire_net || 0,
            isCoupure: !!(record.p1_in || record.p1_out || record.p2_in || record.p2_out)
        })
        setIsEditDialogOpen(true)
    }

    const saveEdit = async () => {
        if (!editingId || isSaving || stats.isPaid) return
        setIsSaving(true)
        try {
            const input = {
                present: parseFloat(String(editForm.present)),
                acompte: parseFloat(String(editForm.acompte || 0)),
                extra: parseFloat(String(editForm.extra || 0)),
                prime: parseFloat(String(editForm.prime || 0)),
                infraction: parseFloat(String(editForm.infraction || 0)),
                retard: parseInt(String(editForm.retard || 0)),
                mise_a_pied: parseFloat(String(editForm.mise_a_pied || 0)),
                doublage: parseFloat(String(editForm.doublage || 0)),
                remarque: editForm.remarque,
                p1_in: editForm.p1_in || null,
                p1_out: editForm.p1_out || null,
                p2_in: editForm.p2_in || null,
                p2_out: editForm.p2_out || null,
                salaire_net: parseFloat(String(editForm.salaire_net || 0))
            };
            await updateRecord({ variables: { month: selectedMonth, id: editingId, input } })
            setIsEditDialogOpen(false)
            setEditingId(null)
            refetchPayroll();
        } catch (err) {
            console.error("Update Error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleOverrideNet = async () => {
        if (payroll.length === 0) return;
        const firstId = payroll.find((r: any) => (r.salaire_net || 0) > 0)?.id || payroll[0].id;
        try {
            await updateRecord({
                variables: {
                    month: selectedMonth,
                    id: firstId,
                    input: { salaire_net: parseFloat(manualNetValue || "0") }
                }
            })
            setIsOverrideDialogOpen(false);
            refetchPayroll();
        } catch (e) {
            console.error(e);
        }
    }

    const handleResetNet = async () => {
        const overriddenRecord = payroll.find((r: any) => (r.salaire_net || 0) > 0);
        if (!overriddenRecord) {
            setIsOverrideDialogOpen(false);
            return;
        }
        try {
            await updateRecord({
                variables: {
                    month: selectedMonth,
                    id: overriddenRecord.id,
                    input: { salaire_net: 0 }
                }
            })
            setIsOverrideDialogOpen(false);
            refetchPayroll();
        } catch (e) {
            console.error(e);
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

    if (!user && !userError) return <div className="p-10 font-bold text-[#8b5a2b]">Chargement...</div>
    if (userError) return <div className="p-10 text-red-600 font-bold">Erreur: {userError.message}</div>
    if (!user) return <div className="p-10 text-[#8b5a2b]">Employé introuvable</div>

    const isCoupureMode = user.is_coupure;

    return (
        <div className="flex min-h-screen flex-col bg-[#f8f6f1] lg:flex-row print:block">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 print:pt-0 print:overflow-visible print:w-full print:p-0 print:m-0">
                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0 !important; /* This removes the default browser header/footer */
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: auto !important;
                            background: white !important;
                            overflow: visible !important;
                        }
                        .print-container {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 5mm 8mm !important; /* Balanced margins */
                            overflow: visible !important;
                            transform: scale(0.98); /* Slightly larger scale since we have more room */
                            transform-origin: top left;
                        }
                        .card-print {
                            border: 0.7pt solid #000 !important;
                            box-shadow: none !important;
                            border-radius: 0 !important;
                            padding: 4mm !important;
                            margin: 0 !important;
                            height: auto !important;
                            min-height: 0 !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                        .table-container {
                            overflow: visible !important;
                            border: none !important;
                        }
                        .print-hidden, .print\:hidden {
                            display: none !important;
                        }
                        table {
                            font-size: 8pt !important;
                            border-collapse: collapse !important;
                            width: 100% !important;
                            table-layout: auto !important;
                        }
                        th, td {
                            padding: 2.5px 4px !important;
                            line-height: 1.2 !important;
                            border: 0.7pt solid #000 !important;
                            overflow: visible !important;
                            white-space: nowrap !important;
                        }
                        td.italic {
                            white-space: normal !important;
                            font-size: 7pt !important;
                        }
                        .summary-section {
                            margin-top: 6mm !important;
                            page-break-inside: avoid !important;
                        }
                        .signatures {
                            margin-top: 12mm !important;
                        }
                        h1, h2, h3, h4, p, span {
                            color: black !important;
                        }
                        * {
                            overflow: visible !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}</style>
                <div className="border-b border-[#c9b896] bg-white p-6 sm:p-8 lg:p-10 shadow-sm print:hidden">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={() => router.push("/payroll/fiche")} className="text-[#8b5a2b] hover:bg-[#f8f6f1]">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <div>
                                <h1 className="font-[family-name:var(--font-heading)] text-xl sm:text-3xl font-bold text-[#8b5a2b] flex flex-wrap items-center gap-2 sm:gap-3">
                                    Fiche de Paie — {user.username}
                                    {stats.isPaid && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 uppercase font-black tracking-widest">Payé</span>}
                                </h1>
                                <p className="text-[#6b5744]">Détails du salaire et présences</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[180px] border-[#c9b896] bg-[#f8f6f1]">
                                    <SelectValue placeholder="Mois" />
                                </SelectTrigger>
                                <SelectContent>{months.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 bg-[#f8f6f1] border border-[#c9b896] rounded-md px-3 py-1">
                                <Label htmlFor="nbmonth" className="text-xs font-semibold text-[#8b5a2b]">Diviseur :</Label>
                                <Input
                                    id="nbmonth"
                                    type="number"
                                    value={nbMonth}
                                    onChange={(e) => setNbMonth(parseInt(e.target.value) || 0)}
                                    className="w-12 h-8 border-none bg-transparent p-0 text-center font-bold text-[#8b5a2b]"
                                />
                            </div>
                            <Button onClick={handleSync} disabled={syncing || stats.isPaid} className="bg-[#8b5a2b] text-white">
                                <RefreshCw className={cn("h-5 w-5 mr-2", syncing && "animate-spin")} /> {stats.isPaid ? "Verrouillé" : "Sync"}
                            </Button>

                            <Button
                                onClick={stats.isPaid ? handleUnpay : handlePay}
                                disabled={paying || unpaying}
                                className={cn(
                                    "font-bold transition-all flex items-center gap-2 px-6",
                                    stats.isPaid
                                        ? "bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                                )}
                            >
                                {stats.isPaid ? <RotateCcw className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                                {stats.isPaid ? "Annuler le paiement" : "Payer"}
                            </Button>

                            <Button onClick={() => window.print()} variant="outline" className="border-[#c9b896] text-[#8b5a2b]">
                                <Printer className="h-5 w-5 mr-2" /> Imprimer
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto print:p-0 print:max-w-none print:m-0 print-container">
                    <Card className={cn(
                        "border-[#3d2c1e] shadow-xl p-8 print:p-2 print:border-px print:shadow-none card-print relative min-h-[900px] print:min-h-0 overflow-hidden",
                        stats.isPaid ? "bg-gray-100/80" : "bg-white"
                    )}>
                        {stats.isPaid && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.08] print:opacity-[0.05]">
                                <span className="text-[180px] font-black border-[20px] border-gray-900 p-20 rounded-[100px] -rotate-[35deg] tracking-[20px] uppercase">
                                    PAYÉ
                                </span>
                            </div>
                        )}
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="grid grid-cols-2 border border-[#3d2c1e] print:text-[9.5px] mb-2">
                                <div className="p-4 print:p-2 border-r border-[#3d2c1e] space-y-1">
                                    <p><strong>Nom:</strong> {user.username.split(' ').slice(1).join(' ') || user.username}</p>
                                    <p><strong>Prénom:</strong> {user.username.split(' ')[0]}</p>
                                    <p><strong>Poste:</strong> {user.departement}</p>
                                    <p><strong>Salaire Base:</strong> {user.base_salary} DT</p>
                                </div>
                                <div className="p-4 print:p-2 space-y-1">
                                    <p><strong>Tél:</strong> {user.phone || "-"}</p>
                                    <p><strong>CIN:</strong> {user.cin || "-"}</p>
                                    <p><strong>Mois:</strong> {months.find(m => m.value === selectedMonth)?.label}</p>
                                </div>
                            </div>

                            <div className="table-container overflow-x-auto print:overflow-visible">
                                <table className="w-full border-collapse border border-[#3d2c1e] print:text-[7pt] print:table-auto">
                                    <thead>
                                        <tr className="bg-[#f8f6f1]">
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-left w-24 print:w-[10%]">Date</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-left w-20 print:w-[8%]">Jour</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-center w-12 print:w-[4%]">PRÉS.</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-center w-12 print:w-[5%]">RET.</th>
                                            {!isCoupureMode ? (
                                                <>
                                                    <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-center w-16 print:w-[8%]">ENTRÉE</th>
                                                    <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-center w-16 print:w-[8%]">SORTIE</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] uppercase text-center print:w-[6%]">DÉB P1</th>
                                                    <th className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] uppercase text-center print:w-[6%]">FIN P1</th>
                                                    <th className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] uppercase text-center print:w-[6%]">DÉB P2</th>
                                                    <th className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] uppercase text-center print:w-[6%]">FIN P2</th>
                                                </>
                                            )}
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-right w-16 print:w-[6%]">ACOMPTE</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-right w-16 print:w-[6%]">EXTRA</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-right w-12 print:w-[4%]">DBL</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-right w-16 print:w-[6%]">PRIME</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-right w-16 print:w-[6%]">INFRACT.</th>
                                            <th className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs font-bold uppercase text-left print:w-[25%]">REMARQUE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payroll.map((r: any) => {
                                            const date = new Date(r.date);
                                            return (
                                                <tr key={r.id} onClick={() => !stats.isPaid && startEdit(r)} className="hover:bg-gray-50 cursor-pointer print:hover:bg-transparent">
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-center">{format(date, "dd/MM/yyyy")}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] capitalize">{format(date, "eeee", { locale: fr })}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-center font-bold">{parseFloat(r.present || 0)}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-center text-red-600 font-bold">{r.retard > 0 ? formatDuration(r.retard) : "-"}</td>
                                                    {!isCoupureMode ? (
                                                        <>
                                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-center font-mono">{r.clock_in || "-"}</td>
                                                            <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-center font-mono">{r.clock_out || "-"}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] print:text-[6.5pt] text-center font-mono">{r.p1_in || "-"}</td>
                                                            <td className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] print:text-[6.5pt] text-center font-mono">{r.p1_out || "-"}</td>
                                                            <td className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] print:text-[6.5pt] text-center font-mono">{r.p2_in || "-"}</td>
                                                            <td className="border border-[#3d2c1e] p-1 print:p-0.5 text-[8px] print:text-[6.5pt] text-center font-mono">{r.p2_out || "-"}</td>
                                                        </>
                                                    )}
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-right">{r.acompte > 0 ? `${r.acompte}` : ""}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-right text-emerald-600">{r.extra > 0 ? `${r.extra}` : ""}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-right text-cyan-600 font-bold">{r.doublage > 0 ? `${r.doublage}` : ""}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-right text-blue-600">{r.prime > 0 ? `${r.prime}` : ""}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[7pt] text-right text-red-600 font-bold">{r.infraction > 0 ? `${r.infraction}` : ""}</td>
                                                    <td className="border border-[#3d2c1e] p-2 print:p-0.5 text-xs print:text-[6.5pt] italic">{r.remarque || (r.present === 0 ? "ABSENT" : "")}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-4 summary-section print:text-[8pt]">
                                <div className="space-y-2">
                                    <table className="w-full border-collapse border border-[#3d2c1e]">
                                        <thead><tr className="bg-[#f8f6f1]"><th colSpan={2} className="border border-[#3d2c1e] p-1 uppercase text-center font-black">Statistiques & Présence</th></tr></thead>
                                        <tbody>
                                            <tr><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-bold">Total Jours Travail</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black">{stats.totalDays}</td></tr>
                                            <tr><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-bold">Total Jours Absence</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black text-red-600">{stats.totalAbsents}</td></tr>
                                            <tr><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-bold">Total Retards</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black">{formatDuration(stats.totalRetardMins)}</td></tr>
                                            <tr className="bg-gray-50"><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-black uppercase text-[#8b5a2b]">Salaire (Présence)</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black text-[#8b5a2b]">{stats.calculatedSalary.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT</td></tr>
                                        </tbody>
                                    </table>

                                    <div className="p-2 border border-dashed border-[#8b5a2b]/30 rounded-lg space-y-0.5">
                                        <h4 className="text-[9px] font-black uppercase text-[#8b5a2b]">Gains Hors Salaire (Espèces)</h4>
                                        <div className="flex justify-between text-xs print:text-[8.5px] font-bold text-purple-700"><span>Total Primes</span><span>{stats.totalPrimes.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span></div>
                                        <div className="flex justify-between text-xs print:text-[8.5px] font-bold text-emerald-700"><span>Total Extras</span><span>{stats.totalExtras.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span></div>
                                        <div className="flex justify-between text-xs print:text-[8.5px] font-black text-blue-700"><span>Total Doublages (Espèces)</span><span>{stats.totalDoublages.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</span></div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <table className="w-full border-collapse border border-[#3d2c1e]">
                                        <thead><tr className="bg-[#f8f6f1]"><th colSpan={2} className="border border-[#3d2c1e] p-1 uppercase text-center text-red-700 font-black">Déductions & Avances</th></tr></thead>
                                        <tbody>
                                            <tr><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-bold">Avances (Acomptes)</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black text-red-600">-{stats.totalAdvances.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</td></tr>
                                            <tr><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 font-bold">Infractions</td><td className="border border-[#3d2c1e] p-1.5 print:p-0.5 text-right font-black text-red-600">-{stats.totalInfractions.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DT</td></tr>
                                            <tr className={cn(
                                                "text-white",
                                                stats.isPaid ? "bg-emerald-600" : "bg-[#8b5a2b]"
                                            )}>
                                                <td className="border border-[#3d2c1e] p-2 print:p-1 text-sm font-black uppercase flex items-center gap-2">
                                                    {stats.isPaid ? "Payé" : "Net à Payer"}
                                                    {!stats.isPaid && <Edit2 className="h-3 w-3 cursor-pointer hover:text-white/80 print:hidden" onClick={() => { setManualNetValue(stats.netSalary.toString()); setIsOverrideDialogOpen(true); }} />}
                                                </td>
                                                <td className="border border-[#3d2c1e] p-2 print:p-1 text-lg print:text-base text-right font-black">
                                                    {stats.netSalary.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} DT
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="mt-10 flex justify-between px-6 print:mt-6 print:px-2">
                                        <div className="text-center font-bold underline text-xs print:text-[9.5px]">Signature Employeur</div>
                                        <div className="text-center font-bold underline text-xs print:text-[9.5px]">Signature Employé</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="bg-white sm:max-w-[500px] w-[95vw] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#8b5a2b]/10 p-2.5 rounded-2xl shrink-0">
                                    <FileText className="h-6 w-6 text-[#8b5a2b]" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold text-[#8b5a2b] tracking-tight">Modifier la journée</DialogTitle>
                                    <DialogDescription className="text-sm text-[#8b5a2b]/60 font-medium">Ajustement manuel du relevé</DialogDescription>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <section>
                                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8b5a2b] mb-3 block ml-1">Statut de Présence</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => handleFieldChange('present', 1)}
                                            variant="outline"
                                            className={cn(
                                                "h-12 rounded-full border-2 transition-all gap-2 font-bold text-[13px]",
                                                editForm.present === 1
                                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200"
                                                    : "bg-[#fdfbf7] border-[#d7cbb5] text-[#8b5a2b] hover:bg-emerald-50"
                                            )}
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            PRÉSENT
                                        </Button>
                                        <Button
                                            onClick={() => handleFieldChange('present', 0)}
                                            variant="outline"
                                            className={cn(
                                                "h-12 rounded-full border-2 transition-all gap-2 font-bold text-[13px]",
                                                editForm.present === 0
                                                    ? "bg-[#ff0000] border-[#ff0000] text-white shadow-lg shadow-red-200"
                                                    : "bg-[#fdfbf7] border-[#d7cbb5] text-red-600 hover:bg-red-50"
                                            )}
                                        >
                                            <XCircle className="h-4 w-4" />
                                            ABSENT
                                        </Button>
                                    </div>
                                </section>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Retard (Min)</Label>
                                        <Input type="number" value={editForm.retard} onChange={e => handleFieldChange('retard', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-[#fdfbf7]/50 focus-visible:ring-[#8b5a2b] font-bold text-[#8b5a2b]" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Mise à pied (Jours)</Label>
                                        <Input type="number" value={editForm.mise_a_pied} onChange={e => handleFieldChange('mise_a_pied', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-[#fdfbf7]/50 focus-visible:ring-[#8b5a2b] text-red-600 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Prime (DT)</Label>
                                        <Input type="number" value={editForm.prime} onChange={e => handleFieldChange('prime', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-blue-50/20 focus-visible:ring-[#8b5a2b] text-blue-700 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Infraction (DT)</Label>
                                        <Input type="number" value={editForm.infraction} onChange={e => handleFieldChange('infraction', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-red-50/20 focus-visible:ring-[#8b5a2b] text-red-600 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Acompte (DT)</Label>
                                        <Input type="number" value={editForm.acompte} onChange={e => handleFieldChange('acompte', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-[#fdfbf7]/50 focus-visible:ring-[#8b5a2b] font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Extra (DT)</Label>
                                        <Input type="number" value={editForm.extra} onChange={e => handleFieldChange('extra', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-emerald-50/20 focus-visible:ring-[#8b5a2b] text-emerald-700 font-bold" />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Doublage (DT)</Label>
                                        <Input type="number" value={editForm.doublage} onChange={e => handleFieldChange('doublage', e.target.value)} className="h-11 rounded-2xl border-[#d7cbb5] bg-cyan-50/20 focus-visible:ring-[#8b5a2b] text-cyan-700 font-bold" />
                                    </div>

                                    {isCoupureMode && (
                                        <div className="col-span-2 grid grid-cols-4 gap-2 bg-[#fdfbf7] p-4 rounded-[1.5rem] border border-[#d7cbb5]/50">
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-[#8b5a2b]">P1 In</Label><Input type="time" value={editForm.p1_in} onChange={e => handleFieldChange('p1_in', e.target.value)} className="h-9 rounded-xl border-[#d7cbb5] text-xs p-1" /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-[#8b5a2b]">P1 Out</Label><Input type="time" value={editForm.p1_out} onChange={e => handleFieldChange('p1_out', e.target.value)} className="h-9 rounded-xl border-[#d7cbb5] text-xs p-1" /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-[#8b5a2b]">P2 In</Label><Input type="time" value={editForm.p2_in} onChange={e => handleFieldChange('p2_in', e.target.value)} className="h-9 rounded-xl border-[#d7cbb5] text-xs p-1" /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-[#8b5a2b]">P2 Out</Label><Input type="time" value={editForm.p2_out} onChange={e => handleFieldChange('p2_out', e.target.value)} className="h-9 rounded-xl border-[#d7cbb5] text-xs p-1" /></div>
                                        </div>
                                    )}

                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b5a2b] ml-1">Notes / Remarque</Label>
                                        <Input value={editForm.remarque} onChange={e => handleFieldChange('remarque', e.target.value)} placeholder="Détails de l'ajustement..." className="h-14 rounded-2xl border-[#d7cbb5] bg-[#fdfbf7]/50 focus-visible:ring-[#8b5a2b]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 bg-white flex items-center justify-between gap-4 border-t border-[#fdfbf7] shrink-0">
                            <Button variant="link" onClick={() => setIsEditDialogOpen(false)} className="px-4 h-10 font-black uppercase tracking-widest text-[#8b5a2b]/40 hover:text-[#8b5a2b] text-xs">ANNULER</Button>
                            <Button onClick={saveEdit} disabled={isSaving} className="px-6 h-12 rounded-full bg-[#8b5a2b] hover:bg-[#6b4420] text-white shadow-xl shadow-[#8b5a2b]/30 flex gap-3 font-black uppercase tracking-widest text-[10px] sm:text-xs group">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                                ENREGISTRER
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
                    <DialogContent className="bg-white sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#8b5a2b]/10 p-3 rounded-2xl">
                                    <Wallet className="h-7 w-7 text-[#8b5a2b]" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold text-[#8b5a2b] tracking-tight">Override Net à Payer</DialogTitle>
                                    <DialogDescription className="text-sm text-[#8b5a2b]/60 font-medium">Forcer le montant final du mois</DialogDescription>
                                </div>
                            </div>

                            <div className="space-y-4 text-center">
                                <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-[#8b5a2b] mb-2 block">Montant Net (DT)</Label>
                                <Input
                                    type="number"
                                    value={manualNetValue}
                                    onChange={e => setManualNetValue(e.target.value)}
                                    className="h-20 rounded-[2rem] border-[#d7cbb5] bg-[#fdfbf7]/50 focus-visible:ring-[#8b5a2b] text-4xl font-bold text-[#8b5a2b] text-center tracking-tight"
                                    placeholder="0.000"
                                />
                                <p className="text-[11px] text-[#8b5a2b]/50 leading-relaxed max-w-[280px] mx-auto">
                                    En forçant ce montant, les calculs automatiques bases sur les jours de présence seront ignorés.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-[#fdfbf7]/30 flex items-center justify-between gap-4 border-t border-[#d7cbb5]/10">
                            <Button
                                variant="ghost"
                                onClick={handleResetNet}
                                className="px-4 h-12 font-black uppercase tracking-[0.15em] text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] flex gap-2.5 rounded-full transition-all"
                            >
                                <RotateCcw className="h-4 w-4" />
                                CALCUL AUTO
                            </Button>
                            <Button
                                onClick={handleOverrideNet}
                                className="px-8 h-14 rounded-full bg-[#8b5a2b] hover:bg-[#6b4420] text-white shadow-xl shadow-[#8b5a2b]/20 flex gap-3 font-black uppercase tracking-[0.2em] text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Save className="h-5 w-5" />
                                MODIFIER
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
