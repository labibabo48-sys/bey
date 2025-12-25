"use client"

import { Sidebar } from "@/components/sidebar"
import { StatCard } from "@/components/stat-card"
import { RealTimeTracking } from "@/components/real-time-tracking"
import { NotificationBell } from "@/components/notification-bell"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { Users, Clock, DollarSign, AlertCircle, Calendar, CheckCircle } from "lucide-react"
import { mockUsers, mockAttendance, mockAdvances, currentUser } from "@/lib/mock-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { gql, useQuery, useMutation } from "@apollo/client"
import { Suspense, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($date: String, $month: String, $payrollMonth: String!) {
    getAdvances(month: $month) {
      id
      user_id
      statut
      montant
    }
    getPayroll(month: $payrollMonth) {
      user_id
      date
      present
      infraction
      retard
      prime
      extra
      doublage
      acompte
    }
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
      delay
      infraction
      remarque
    }
    getRetards(date: $date) {
      id
      user_id
    }
    getAbsents(date: $date) {
      id
      user_id
      type
    }
    getExtras(month: $payrollMonth) {
      id
      user_id
      montant
    }
  }
`

const SYNC_ATTENDANCE = gql`
    mutation SyncAttendance($date: String) {
      syncAttendance(date: $date)
    }
  `

function DashboardContent() {
  const [syncAttendance] = useMutation(SYNC_ATTENDANCE);

  // Use month format that matches server `month` column (e.g. "décembre 2025")
  // Logical Today (respected 07:00 AM cutoff)
  const getLogicalNow = () => {
    const d = new Date();
    if (d.getHours() < 4) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  const logicalNow = getLogicalNow();
  const currentMonth = logicalNow.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  const payrollMonth = format(logicalNow, 'yyyy_MM');
  const today = format(logicalNow, 'yyyy-MM-dd');

  // Trigger sync on mount (non-blocking, in background)
  useEffect(() => {
    // Use setTimeout to ensure this doesn't block initial render
    const timer = setTimeout(() => {
      syncAttendance({ variables: { date: today } }).catch(e => console.error("Sync Error:", e));
    }, 100);
    return () => clearTimeout(timer);
  }, [today, syncAttendance]);

  const { data, loading, error } = useQuery(GET_DASHBOARD_DATA, {
    variables: {
      date: today,
      month: currentMonth,
      payrollMonth: payrollMonth
    },
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: false,
  });

  const stats = useMemo(() => {
    if (!data) return null;

    const advances = data.getAdvances || [];
    const advancesTotal = advances.reduce((sum: number, a: any) => sum + (a.montant || 0), 0);
    const advancesCount = advances.length;
    const personnel = data.personnelStatus || [];
    const payrollRecords = data.getPayroll || [];

    const validPersonnel = personnel.filter((p: any) => p.user.role !== "admin" && !p.user.is_blocked);
    const theoreticalTotalSalaries = validPersonnel.reduce((sum: number, p: any) => sum + (p.user.base_salary || 0), 0);

    const totalInfractions = payrollRecords.reduce((sum: number, r: any) => sum + (r.infraction || 0), 0);
    const totalPrimes = payrollRecords.reduce((sum: number, r: any) => sum + (r.prime || 0), 0);
    const totalExtras = payrollRecords.reduce((sum: number, r: any) => sum + (r.extra || 0), 0);
    const totalDoublages = payrollRecords.reduce((sum: number, r: any) => sum + (r.doublage || 0), 0);

    const yesterday = getLogicalNow();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    const totalAbsenceCosts = validPersonnel.reduce((sum: number, p: any) => {
      const userRecords = payrollRecords.filter((r: any) => String(r.user_id) === String(p.user.id));
      const dayValue = (p.user.base_salary || 0) / 30;

      const absenceCount = userRecords.filter((r: any) => {
        return r.date && r.date <= yesterdayStr && r.present === 0;
      }).length;

      return sum + (absenceCount * dayValue);
    }, 0);

    const totalPenaltiesAndAbsences = totalInfractions + totalAbsenceCosts;
    // Net Salary Logic: (Base + Primes + Extras + Doublages) - Advances - Deductions
    const resteAPayer = (theoreticalTotalSalaries + totalPrimes + totalExtras + totalDoublages) - advancesTotal - totalPenaltiesAndAbsences;

    const totalEmployees = validPersonnel.length;
    const expectedToday = validPersonnel.filter((p: any) => p.state !== "Repos");
    const presentCount = expectedToday.filter((p: any) => p.state === "Présent" || p.state === "Retard").length;
    const retardsCount = expectedToday.filter((p: any) => p.state === "Retard").length;

    const absentsCount = validPersonnel.filter((p: any) => p.state === "Absent" || p.state === "Missing_Exit").length;

    const attendanceRate = expectedToday.length > 0 ? Math.round((presentCount / expectedToday.length) * 100) : 0;

    const totalDelayMins = expectedToday.reduce((sum: number, p: any) => {
      if (p.state === "Retard" && p.delay) {
        let mins = 0;
        const hMatch = p.delay.match(/(\d+)h/);
        const mMatch = p.delay.match(/(\d+)m($|\s)/); // Match 'm' at end or followed by space
        const minMatch = p.delay.match(/(\d+) min/);

        if (hMatch) mins += parseInt(hMatch[1]) * 60;
        if (mMatch) mins += parseInt(mMatch[1]);
        if (minMatch) mins += parseInt(minMatch[1]);

        if (!hMatch && !mMatch && !minMatch) {
          const simpleMatch = p.delay.match(/^(\d+)$/);
          if (simpleMatch) mins += parseInt(simpleMatch[1]);
        }
        return sum + mins;
      }
      return sum;
    }, 0);

    return {
      advances,
      advancesTotal,
      advancesCount,
      theoreticalTotalSalaries,
      totalInfractions,
      totalPenaltiesAndAbsences,
      resteAPayer,
      presentCount,
      retardsCount,
      absentsCount,
      totalDelayMins,
      totalEmployees,
      attendanceRate,
      personnel
    };
  }, [data]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8f6f1]">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-xl border border-red-100">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-[#3d2c1e]">Erreur de Connexion</h2>
          <p className="text-[#6b5744] max-w-md">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#8b5a2b] text-white">Réessayer</Button>
        </div>
      </div>
    );
  }

  const {
    advances = [],
    advancesTotal = 0,
    advancesCount = 0,
    resteAPayer = 0,
    totalPenaltiesAndAbsences = 0,
    presentCount = 0,
    retardsCount = 0,
    absentsCount = 0,
    totalDelayMins = 0,
    totalEmployees = 0,
    attendanceRate = 0,
    personnel = []
  } = stats || {};

  // Determine permissions
  let permissions: any = {};
  if (currentUser.permissions) {
    try {
      permissions = JSON.parse(currentUser.permissions) || {};
    } catch (e) {
      permissions = {};
    }
  }

  const canSee = (cat: string, key: string) => {
    if (currentUser.role === 'admin') return true;
    if (!permissions[cat]) return true; // Default to true if not set? Request says "on/off", imply control.
    return permissions[cat][key] !== false;
  }

  // Admin and Manager Dashboard
  if (currentUser.role === "admin" || currentUser.role === "manager") {

    return (
      <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
          <div className="bg-white border-b border-[#e8dfcf] px-6 py-8 lg:px-10 lg:py-12 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-heading)] text-3xl lg:text-5xl font-black text-[#3d2c1e] tracking-tight">
                  Tableau de <span className="text-[#8b5a2b]">Bord</span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-[#8b5a2b] animate-pulse" />
                  <p className="text-sm lg:text-base font-bold text-[#8b5a2b]/60 uppercase tracking-[0.2em]">
                    Expertise Bey — {currentUser.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="hidden lg:block h-10 w-[1px] bg-[#e8dfcf] mx-2" />
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-black text-[#3d2c1e] uppercase">{format(logicalNow, 'EEEE d MMMM', { locale: fr })}</span>
                  <span className="text-[10px] font-bold text-[#8b5a2b] uppercase tracking-widest">{currentUser.role === "admin" ? "Contrôle Total" : "Gestion Magasin"}</span>
                </div>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-[#8b5a2b]/5 to-transparent pointer-events-none" />
          </div>

          <div className="p-6 lg:p-10 space-y-10">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 animate-in fade-in slide-in-from-top-10 duration-700">
              {canSee('dashboard', 'total_personnel') && (
                <StatCard
                  title="Total Personnel"
                  value={totalEmployees}
                  icon={Users}
                  color="bronze"
                  change={`${totalEmployees} collaborateurs`}
                  trend="up"
                  href="/employees"
                />
              )}
              {canSee('dashboard', 'presence_actuelle') && (
                <StatCard
                  title="Présence Actuelle"
                  value={presentCount}
                  icon={CheckCircle}
                  color="copper"
                  change={`${attendanceRate}% du Bey au travail`}
                  trend="up"
                  href="/attendance"
                />
              )}

              {canSee('dashboard', 'en_retard') && (
                <StatCard
                  title="En Retard"
                  value={retardsCount}
                  icon={Clock}
                  color="red"
                  change={`- ${totalDelayMins >= 60 ? `${Math.floor(totalDelayMins / 60)}h ${totalDelayMins % 60}m` : `${totalDelayMins} min`} total`}
                  trend={retardsCount > 0 ? "down" : "up"}
                  href="/attendance"
                />
              )}
              {canSee('dashboard', 'absences') && (
                <StatCard
                  title="Absences"
                  value={absentsCount}
                  icon={AlertCircle}
                  color="red"
                  change={`- ${absentsCount} aujourd'hui`}
                  trend={absentsCount > 0 ? "down" : "up"}
                  href="/attendance"
                />
              )}
              {canSee('dashboard', 'les_avances') && (
                <StatCard
                  title="Les Avances"
                  value={`${advancesTotal} DT`}
                  icon={DollarSign}
                  color="gold"
                  change={`${advancesCount} avances`}
                  trend={advancesTotal > 0 ? "up" : "down"}
                  href="/advances"
                />
              )}
              {canSee('dashboard', 'reste_a_payer') && (
                <StatCard
                  title="Reste à Payer"
                  value={`${Math.round(resteAPayer)} DT`}
                  icon={DollarSign}
                  color="gold"
                  change={`Pénalités: -${Math.round(totalPenaltiesAndAbsences)} DT`}
                  trend="down"
                  href="/payroll"
                />
              )}
            </div>

            <div className="mt-8 lg:mt-10">
              <RealTimeTracking initialData={personnel} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Employee Dashboard (Keep using mock/mixed for personal view until fully migrated)
  const userAttendance = mockAttendance.filter((a) => a.userId === currentUser.id)
  const todayRecord = userAttendance.find((a) => a.date === today)
  const thisWeekHours = userAttendance.filter((a) => a.hours).reduce((sum, a) => sum + (a.hours || 0), 0)
  const thisMonthDays = userAttendance.filter((a) => a.date.startsWith(today.substring(0, 7))).length

  // Calculate personal advances total and count
  const myAdvances = advances.filter((a: any) => ((a.user_id || a.userId || "") + "") === currentUser.id);
  const myAdvancesTotal = myAdvances.reduce((sum: number, a: any) => sum + (a.montant || 0), 0);
  const myAdvancesCount = myAdvances.length;

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        <div className="border-b border-[#c9b896] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#8b5a2b]">
                Mon Tableau de bord
              </h1>
              <p className="mt-2 text-base sm:text-lg lg:text-xl text-[#6b5744]">Bienvenue {currentUser.name}</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          {/* Personal Statistics */}
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Heures Cette Semaine"
              value={`${thisWeekHours}h`}
              icon={Clock}
              color="bronze"
              change={thisWeekHours >= 40 ? "Objectif atteint" : `${40 - thisWeekHours}h restantes`}
              trend={thisWeekHours >= 40 ? "up" : "down"}
              href="/attendance"
            />
            <StatCard
              title="Statut Aujourd'hui"
              value={
                todayRecord
                  ? todayRecord.status === "present"
                    ? "Présent"
                    : todayRecord.status === "late"
                      ? "En retard"
                      : "Absent"
                  : "Non pointé"
              }
              icon={CheckCircle}
              color="copper"
              change={todayRecord ? `${todayRecord.hours || 0}h travaillées` : "Pointer maintenant"}
              trend={todayRecord && todayRecord.status === "present" ? "up" : "down"}
              href="/attendance"
            />
            <StatCard
              title="Jours ce Mois"
              value={thisMonthDays}
              icon={Calendar}
              color="gold"
              change="Jours travaillés"
              trend="up"
              href="/attendance"
            />
            <StatCard
              title="Mes Avances"
              value={`${myAdvancesTotal} DT`}
              icon={DollarSign}
              color="bronze"
              change={myAdvancesCount > 0 ? `${myAdvancesCount} demandes` : "Aucune demande"}
              trend={myAdvancesCount > 0 ? "up" : "down"}
              href="/advances"
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-8 lg:mt-10">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5a2b] mb-6">
              Actions Rapides
            </h2>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-[#c9b896] bg-white p-6 lg:p-8 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-[#8b5a2b]">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="rounded-full bg-gradient-to-br from-[#8b5a2b]/20 to-[#8b5a2b]/5 p-4 lg:p-5 border border-[#8b5a2b]/30">
                    <Clock className="h-7 w-7 lg:h-8 lg:w-8 text-[#8b5a2b]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg lg:text-xl text-[#3d2c1e]">Pointer</h3>
                    <p className="text-base lg:text-lg text-[#6b5744]">Entrée/Sortie</p>
                  </div>
                </div>
              </Card>

              <Card className="border-[#c9b896] bg-white p-6 lg:p-8 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-[#a0522d]">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="rounded-full bg-gradient-to-br from-[#a0522d]/20 to-[#a0522d]/5 p-4 lg:p-5 border border-[#a0522d]/30">
                    <DollarSign className="h-7 w-7 lg:h-8 lg:w-8 text-[#a0522d]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg lg:text-xl text-[#3d2c1e]">Demander Avance</h3>
                    <p className="text-base lg:text-lg text-[#6b5744]">Nouvelle demande</p>
                  </div>
                </div>
              </Card>

              <Card className="border-[#c9b896] bg-white p-6 lg:p-8 shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:border-[#c9a227]">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="rounded-full bg-gradient-to-br from-[#c9a227]/20 to-[#c9a227]/5 p-4 lg:p-5 border border-[#c9a227]/30">
                    <Calendar className="h-7 w-7 lg:h-8 lg:w-8 text-[#c9a227]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg lg:text-xl text-[#3d2c1e]">Mon Planning</h3>
                    <p className="text-base lg:text-lg text-[#6b5744]">Voir calendrier</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 lg:mt-10">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5a2b] mb-6">
              Activité Récente
            </h2>
            <Card className="border-[#c9b896] bg-white shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#c9b896]">
                      <th className="p-4 sm:p-5 lg:p-6 text-left text-sm sm:text-base lg:text-lg font-medium text-[#6b5744]">
                        Date
                      </th>
                      <th className="p-4 sm:p-5 lg:p-6 text-left text-sm sm:text-base lg:text-lg font-medium text-[#6b5744]">
                        Entrée
                      </th>
                      <th className="p-4 sm:p-5 lg:p-6 text-left text-sm sm:text-base lg:text-lg font-medium text-[#6b5744]">
                        Sortie
                      </th>
                      <th className="p-4 sm:p-5 lg:p-6 text-left text-sm sm:text-base lg:text-lg font-medium text-[#6b5744]">
                        Heures
                      </th>
                      <th className="p-4 sm:p-5 lg:p-6 text-left text-sm sm:text-base lg:text-lg font-medium text-[#6b5744]">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAttendance.slice(0, 5).map((record) => (
                      <tr key={record.id} className="border-b border-[#c9b896]/50">
                        <td className="p-4 sm:p-5 lg:p-6 text-sm sm:text-base lg:text-lg text-[#3d2c1e]">
                          {format(new Date(record.date), "dd/MM/yyyy")}
                        </td>
                        <td className="p-4 sm:p-5 lg:p-6 text-sm sm:text-base lg:text-lg text-[#3d2c1e]">
                          {record.clockIn}
                        </td>
                        <td className="p-4 sm:p-5 lg:p-6 text-sm sm:text-base lg:text-lg text-[#3d2c1e]">
                          {record.clockOut || "-"}
                        </td>
                        <td className="p-4 sm:p-5 lg:p-6 font-[family-name:var(--font-heading)] text-sm sm:text-base lg:text-lg font-bold text-[#3d2c1e]">
                          {record.hours || 0}h
                        </td>
                        <td className="p-4 sm:p-5 lg:p-6">
                          <span
                            className={`rounded-full px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-sm sm:text-base font-medium ${record.status === "present"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : record.status === "late"
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : record.status === "absent"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}
                          >
                            {record.status === "present"
                              ? "Présent"
                              : record.status === "late"
                                ? "Retard"
                                : record.status === "absent"
                                  ? "Absent"
                                  : "Demi-journée"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userAttendance.length === 0 && (
                <div className="p-12 text-center text-[#6b5744]">
                  <p className="text-base lg:text-lg">Aucune activité récente</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
