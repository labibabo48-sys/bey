"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    DollarSign,
    TrendingDown,
    TrendingUp,
    Wallet,
    ChevronLeft,
    ChevronRight,
    PieChart,
    BarChart,
    ClipboardList
} from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { NotificationBell } from "@/components/notification-bell"
import { gql, useQuery } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

// Reuse the payload query from payroll to get all necessary data
const GET_FINANCE_DATA = gql`
  query GetFinanceData($month: String!) {
    personnelStatus {
        user {
            id
            username
            departement
            base_salary
        }
    }
    getPayroll(month: $month) {
      id
      user_id
        date
        present
        acompte
        extra
        prime
        infraction
        retard
        doublage
    }
  }
`

export default function FinancePage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const payrollMonthKey = format(selectedMonth, "yyyy_MM")

    const { data, loading, refetch } = useQuery(GET_FINANCE_DATA, {
        variables: { month: payrollMonthKey },
        fetchPolicy: "network-only"
    })

    // Poll for updates
    useEffect(() => {
        const interval = setInterval(() => {
            refetch()
        }, 5000)
        return () => clearInterval(interval)
    }, [refetch])

    const navigateMonth = (direction: "prev" | "next") => {
        setSelectedMonth((prev) => {
            const newDate = new Date(prev)
            if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1)
            else newDate.setMonth(newDate.getMonth() + 1)
            return newDate
        })
    }

    // Calculate Metrics
    const metrics = useMemo(() => {
        const users = data?.personnelStatus?.map((p: any) => p.user) || []
        const records = data?.getPayroll || []

        // 1. Total Base Salary
        const totalBaseSalary = users.reduce((sum: number, u: any) => sum + (u.base_salary || 0), 0)

        // 2. Aggregates from Records
        let totalAvances = 0
        let totalPrimes = 0
        let totalExtras = 0
        let totalDoublage = 0
        let totalInfractions = 0 // "Retenues Retard/Infraction"
        let totalAbsenceCost = 0

        // Let's iterate users to be precise
        users.forEach((user: any) => {
            const userRecords = records.filter((r: any) => String(r.user_id) === String(user.id))

            // Sum simple fields
            totalAvances += userRecords.reduce((sum: number, r: any) => sum + (r.acompte || 0), 0)
            totalPrimes += userRecords.reduce((sum: number, r: any) => sum + (r.prime || 0), 0)
            totalExtras += userRecords.reduce((sum: number, r: any) => sum + (r.extra || 0), 0)
            totalDoublage += userRecords.reduce((sum: number, r: any) => sum + (r.doublage || 0), 0)
            totalInfractions += userRecords.reduce((sum: number, r: any) => sum + (r.infraction || 0), 0)

            // Calc Absence Cost
            // Rule: Absence = present=0 AND date <= yesterday (to avoid future deductions)
            const dayValue = (user.base_salary || 0) / 30
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

            const absentCount = userRecords.filter((r: any) => {
                // formatted date in record is 'YYYY-MM-DD'
                return r.date <= yesterdayStr && r.present === 0
            }).length

            totalAbsenceCost += (absentCount * dayValue)
        })

        // Total Net Flow
        // Net = Base + Prime + Extra + Doublage - Avance - Infraction - AbsenceCost
        const totalNetToPay = totalBaseSalary + totalPrimes + totalExtras + totalDoublage - totalAvances - totalInfractions - totalAbsenceCost

        return {
            totalBaseSalary,
            totalAvances,
            totalPrimes,
            totalExtras,
            totalDoublage,
            totalInfractions,
            totalAbsenceCost,
            totalNetToPay
        }
    }, [data, selectedMonth])

    // Department Breakdown
    const deptStats = useMemo(() => {
        const users = data?.personnelStatus?.map((p: any) => p.user) || []
        const records = data?.getPayroll || []
        const depts: Record<string, number> = {}

        users.forEach((user: any) => {
            const dept = user.departement || "Autre"
            if (!depts[dept]) depts[dept] = 0

            // Calculate Net for user
            const userRecords = records.filter((r: any) => String(r.user_id) === String(user.id))
            const dayValue = (user.base_salary || 0) / 30
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

            const absentCount = userRecords.filter((r: any) => {
                return r.date <= yesterdayStr && r.present === 0
            }).length

            const primes = userRecords.reduce((s: number, r: any) => s + (r.prime || 0), 0)
            const extras = userRecords.reduce((s: number, r: any) => s + (r.extra || 0), 0)
            const doublages = userRecords.reduce((s: number, r: any) => s + (r.doublage || 0), 0)
            const avances = userRecords.reduce((s: number, r: any) => s + (r.acompte || 0), 0)
            const infractions = userRecords.reduce((s: number, r: any) => s + (r.infraction || 0), 0)

            const net = (user.base_salary || 0) + primes + extras + doublages - avances - infractions - (absentCount * dayValue)

            depts[dept] += net
        })

        return Object.entries(depts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }, [data])


    return (
        <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
                <div className="border-b border-[#c9b896] bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5a2b]">
                                Chiffres & Finances
                            </h1>
                            <div className="flex items-center gap-2 mt-1 sm:mt-2">
                                <p className="text-sm sm:text-base lg:text-lg text-[#6b5744]">
                                    Vue d'ensemble financière —
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
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8 space-y-6">

                    {/* Top Cards Row */}
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="border-[#c9b896] bg-white p-6 shadow-md">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-[#6b5744] uppercase tracking-wider mb-1">Masse Salariale Base</p>
                                    <p className="text-3xl font-black text-[#3d2c1e]">{Math.round(metrics.totalBaseSalary)} <span className="text-lg text-[#6b5744]">DT</span></p>
                                </div>
                                <div className="p-3 bg-[#8b5a2b]/10 rounded-full">
                                    <DollarSign className="h-6 w-6 text-[#8b5a2b]" />
                                </div>
                            </div>
                            <p className="text-[10px] text-[#6b5744]/70 mt-2 font-medium">Cumul des salaires de base (sans primes/déductions)</p>
                        </Card>

                        <Card className="border-[#c9b896] bg-gradient-to-br from-[#8b5a2b] to-[#6b4423] text-white p-6 shadow-md relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Net à Payer Global</p>
                                <p className="text-4xl font-black">{Math.round(metrics.totalNetToPay)} <span className="text-xl opacity-80">DT</span></p>
                            </div>
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 rotate-12">
                                <Wallet className="h-32 w-32" />
                            </div>
                            <p className="relative z-10 text-[10px] text-white/60 mt-2 font-medium">Estimation finale après calculs</p>
                        </Card>

                        <Card className="border-[#c9b896] bg-white p-6 shadow-md">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-[#6b5744] uppercase tracking-wider mb-1">Total Avances</p>
                                    <p className="text-3xl font-black text-amber-600">{Math.round(metrics.totalAvances)} <span className="text-lg text-amber-600/70">DT</span></p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                            <p className="text-[10px] text-[#6b5744]/70 mt-2 font-medium">Somme déjà versée aux employés</p>
                        </Card>
                    </div>

                    {/* Detailed Stats Cards */}
                    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                        <Card className="border-[#c9b896] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-[10px] font-bold text-[#6b5744] uppercase tracking-wider mb-2">Total Doublages</p>
                            <p className="text-2xl font-bold text-cyan-600">+{Math.round(metrics.totalDoublage)} DT</p>
                        </Card>
                        <Card className="border-[#c9b896] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-[10px] font-bold text-[#6b5744] uppercase tracking-wider mb-2">Total Extras</p>
                            <p className="text-2xl font-bold text-emerald-600">+{Math.round(metrics.totalExtras)} DT</p>
                        </Card>
                        <Card className="border-[#c9b896] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-[10px] font-bold text-[#6b5744] uppercase tracking-wider mb-2">Total Primes</p>
                            <p className="text-2xl font-bold text-emerald-600">+{Math.round(metrics.totalPrimes)} DT</p>
                        </Card>
                        <Card className="border-[#c9b896] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-[10px] font-bold text-[#6b5744] uppercase tracking-wider mb-2">Total Retenues</p>
                            <p className="text-2xl font-bold text-red-600">-{Math.round(metrics.totalInfractions + metrics.totalAbsenceCost)} DT</p>
                        </Card>
                    </div>

                    {/* Analysis Row */}
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                        <Card className="border-[#c9b896] bg-white p-6 shadow-md">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg"><PieChart className="h-6 w-6 text-blue-600" /></div>
                                <h3 className="text-xl font-bold text-[#3d2c1e]">Coût Net par Département</h3>
                            </div>

                            <div className="space-y-3">
                                {deptStats.map((dept, idx) => (
                                    <div key={idx} className="bg-[#f8f6f1] p-3 rounded-lg border border-[#c9b896]/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-[#8b5a2b] text-white flex items-center justify-center text-xs font-bold mr-3">{idx + 1}</span>
                                            <span className="font-medium text-[#3d2c1e]">{dept.name}</span>
                                        </div>
                                        <span className="font-bold text-[#3d2c1e]">{Math.round(dept.value)} DT</span>
                                    </div>
                                ))}
                                {deptStats.length === 0 && <p className="text-center text-[#6b5744] py-4">Aucune donnée disponible.</p>}
                            </div>
                        </Card>

                        <Card className="border-[#c9b896] bg-white p-6 shadow-md">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="h-6 w-6 text-red-600" /></div>
                                <h3 className="text-xl font-bold text-[#3d2c1e]">Détail des Retenues</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                    <span className="text-red-800 font-medium text-sm">Coût des Absences</span>
                                    <span className="text-red-700 font-bold text-lg">-{Math.round(metrics.totalAbsenceCost)} DT</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <div className="flex flex-col">
                                        <span className="text-amber-800 font-medium text-sm">Retenues & Pénalités</span>
                                        <span className="text-xs text-amber-600">Infractions, Retards, etc.</span>
                                    </div>
                                    <span className="text-amber-700 font-bold text-lg">-{Math.round(metrics.totalInfractions)} DT</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-[#c9b896]/30">
                                <p className="text-center text-xs text-[#6b5744]">
                                    L'optimisation des absences pourrait économiser <span className="font-bold text-[#8b5a2b]">{Math.round(metrics.totalAbsenceCost)} DT</span> ce mois-ci.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
