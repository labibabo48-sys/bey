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
        const [y, m_val] = payrollMonthKey.split('_').map(Number)
        const daysInMonth = new Date(y, m_val, 0).getDate()
        const todayStr = format(new Date(), 'yyyy-MM-dd')

        users.forEach((user: any) => {
            const userRecords = records.filter((r: any) => String(r.user_id) === String(user.id))

            // Sum simple fields
            totalAvances += userRecords.reduce((sum: number, r: any) => sum + (r.acompte || 0), 0)
            totalPrimes += userRecords.reduce((sum: number, r: any) => sum + (r.prime || 0), 0)
            totalExtras += userRecords.reduce((sum: number, r: any) => sum + (r.extra || 0), 0)
            totalDoublage += userRecords.reduce((sum: number, r: any) => sum + (r.doublage || 0), 0)
            totalInfractions += userRecords.reduce((sum: number, r: any) => sum + (r.infraction || 0), 0)

            // Calc Absence Cost
            const dayValue = (user.base_salary || 0) / daysInMonth
            const absCount = userRecords.filter((r: any) => r.date <= todayStr && r.present === 0).length
            const passCount = userRecords.filter((r: any) => r.date <= todayStr).length
            const wrkCount = userRecords.filter((r: any) => r.date <= todayStr && r.present === 1).length
            const extraDaysCount = userRecords.filter((r: any) => (r.extra || 0) > 0).length

            // Rule: logic matches payroll page
            const paidDaysCount = absCount > 4 ? Math.max(0, wrkCount - extraDaysCount) : Math.max(0, passCount - extraDaysCount)
            totalAbsenceCost += (passCount - extraDaysCount - paidDaysCount) * dayValue
        })

        // Total Net Flow
        // Net = sum(paidDays * dayValue - avance - infraction)
        const totalNetToPay = users.reduce((acc: number, user: any) => {
            const userRecords = records.filter((r: any) => String(r.user_id) === String(user.id))
            const dayValue = (user.base_salary || 0) / daysInMonth
            const abs = userRecords.filter((r: any) => r.date <= todayStr && r.present === 0).length
            const pass = userRecords.filter((r: any) => r.date <= todayStr).length
            const wrk = userRecords.filter((r: any) => r.date <= todayStr && r.present === 1).length
            const extraDays = userRecords.filter((r: any) => (r.extra || 0) > 0).length

            const pd = abs > 4 ? Math.max(0, wrk - extraDays) : Math.max(0, pass - extraDays)
            const av = userRecords.reduce((s: number, r: any) => s + (r.acompte || 0), 0)
            const inf = userRecords.reduce((s: number, r: any) => s + (r.infraction || 0), 0)

            return acc + (pd * dayValue - av - inf)
        }, 0)

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

        const [y, m_val] = payrollMonthKey.split('_').map(Number)
        const daysInMonth = new Date(y, m_val, 0).getDate()

        users.forEach((user: any) => {
            const dept = user.departement || "Autre"
            if (!depts[dept]) depts[dept] = 0

            // Calculate Net for user
            const userRecords = records.filter((r: any) => String(r.user_id) === String(user.id))
            const dayValue = (user.base_salary || 0) / daysInMonth
            const today = new Date()
            const todayStr = format(today, 'yyyy-MM-dd')

            const abs = userRecords.filter((r: any) => r.date <= todayStr && r.present === 0).length
            const pass = userRecords.filter((r: any) => r.date <= todayStr).length
            const wrk = userRecords.filter((r: any) => r.date <= todayStr && r.present === 1).length
            const extraDays = userRecords.filter((r: any) => (r.extra || 0) > 0).length

            const pd = abs > 4 ? Math.max(0, wrk - extraDays) : Math.max(0, pass - extraDays)
            const av = userRecords.reduce((s: number, r: any) => s + (r.acompte || 0), 0)
            const inf = userRecords.reduce((s: number, r: any) => s + (r.infraction || 0), 0)

            depts[dept] += (pd * dayValue - av - inf)
        })

        return Object.entries(depts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }, [data, selectedMonth])


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
                        <Card className="p-6 bg-white border-[#c9b896] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <DollarSign className="h-12 w-12 text-[#8b5a2b]" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-[#6b5744] uppercase tracking-wider">Masse Salariale Base</p>
                                <h3 className="text-3xl font-bold text-[#3d2c1e] mt-2">
                                    {Math.round(metrics.totalBaseSalary).toLocaleString()} <span className="text-lg font-normal text-[#6b5744]">DT</span>
                                </h3>
                                <p className="text-xs text-[#6b5744] mt-2 flex items-center gap-1">
                                    <BarChart className="h-3 w-3" /> Total des salaires de base
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white border-[#c9b896] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-12 w-12 text-emerald-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-[#6b5744] uppercase tracking-wider">Primes & Extras</p>
                                <h3 className="text-3xl font-bold text-emerald-600 mt-2">
                                    +{Math.round(metrics.totalPrimes + metrics.totalExtras + metrics.totalDoublage).toLocaleString()} <span className="text-lg font-normal">DT</span>
                                </h3>
                                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                                    Dont {Math.round(metrics.totalPrimes)} DT Primes
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white border-[#c9b896] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <TrendingDown className="h-12 w-12 text-red-600" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-[#6b5744] uppercase tracking-wider">Retenues & Avances</p>
                                <h3 className="text-3xl font-bold text-red-600 mt-2">
                                    -{Math.round(metrics.totalAvances + metrics.totalInfractions + metrics.totalAbsenceCost).toLocaleString()} <span className="text-lg font-normal">DT</span>
                                </h3>
                                <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                                    Dont {Math.round(metrics.totalAbsenceCost)} DT Coût Absences
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Middle Section */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                        {/* Summary Checklist */}
                        <Card className="p-6 sm:p-8 bg-white border-[#c9b896] shadow-md border-t-4 border-t-[#8b5a2b]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[#f8f6f1] flex items-center justify-center text-[#8b5a2b]">
                                    <ClipboardList className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-[#3d2c1e]">Rapport de Paie</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f6f1]/50 border border-[#c9b896]/20">
                                    <span className="text-[#6b5744]">Total Avances</span>
                                    <span className="font-bold text-[#3d2c1e]">{Math.round(metrics.totalAvances)} DT</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f6f1]/50 border border-[#c9b896]/20">
                                    <span className="text-[#6b5744]">Total Primes</span>
                                    <span className="font-bold text-emerald-600">+{Math.round(metrics.totalPrimes)} DT</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f6f1]/50 border border-[#c9b896]/20">
                                    <span className="text-[#6b5744]">Total Extras</span>
                                    <span className="font-bold text-emerald-600">+{Math.round(metrics.totalExtras)} DT</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f6f1]/50 border border-[#c9b896]/20">
                                    <span className="text-[#6b5744]">Total Retenues Infractions</span>
                                    <span className="font-bold text-red-600">-{Math.round(metrics.totalInfractions)} DT</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f6f1]/50 border border-[#c9b896]/20">
                                    <span className="p-0 flex flex-col">
                                        <span className="text-[#6b5744]">Total Coût Absences</span>
                                        <span className="text-[10px] text-[#8b5a2b]">Règle: &gt;4 absents = déduction brute</span>
                                    </span>
                                    <span className="font-bold text-red-600">-{Math.round(metrics.totalAbsenceCost)} DT</span>
                                </div>

                                <div className="pt-4 mt-2 border-t border-[#c9b896]">
                                    <div className="flex items-center justify-between bg-[#3d2c1e] text-white p-4 rounded-xl shadow-lg">
                                        <div className="flex items-center gap-3">
                                            <Wallet className="h-6 w-6" />
                                            <span className="font-medium uppercase tracking-wider text-sm">Net à Payer (Total)</span>
                                        </div>
                                        <span className="text-2xl font-black">{Math.round(metrics.totalNetToPay).toLocaleString()} DT</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Department Distribution */}
                        <Card className="p-6 sm:p-8 bg-white border-[#c9b896] shadow-md border-t-4 border-t-[#8b5a2b]">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-[#f8f6f1] flex items-center justify-center text-[#8b5a2b]">
                                    <PieChart className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-[#3d2c1e]">Dépenses par Département</h3>
                            </div>
                            <div className="space-y-6">
                                {deptStats.map((dept: any) => (
                                    <div key={dept.name} className="relative">
                                        <div className="flex justify-between mb-2 items-end">
                                            <span className="font-semibold text-[#3d2c1e]">{dept.name}</span>
                                            <span className="text-[#8b5a2b] font-bold">{Math.round(dept.value).toLocaleString()} DT</span>
                                        </div>
                                        <div className="h-3 w-full bg-[#f8f6f1] rounded-full overflow-hidden border border-[#c9b896]/30">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#8b5a2b] to-[#c9b896] rounded-full transition-all duration-1000"
                                                style={{ width: `${(dept.value / metrics.totalNetToPay) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-[#6b5744] mt-1 text-right italic font-medium">
                                            {((dept.value / metrics.totalNetToPay) * 100).toFixed(1)}% de la masse salariale nette
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                </div>
            </main>
        </div>
    )
}
