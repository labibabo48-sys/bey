"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, Save, Clock, Search, Edit3, Book } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { gql, useQuery, useMutation } from "@apollo/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

// Queries & Mutations
const GET_ALL_EMPLOYEES = gql`
  query GetAllEmployees {
    personnelStatus {
      user {
        id
        username
        role
        status
        zktime_id
        departement
        photo
      }
    }
  }
`

const GET_USER_SCHEDULE = gql`
  query GetUserSchedule($userId: ID!) {
    getUserSchedule(userId: $userId) {
      user_id
      username
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

const UPDATE_USER_SCHEDULE = gql`
  mutation UpdateUserSchedule($userId: ID!, $schedule: ScheduleInput!) {
    updateUserSchedule(userId: $userId, schedule: $schedule) {
      user_id
      username
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

const DAYS = [
  { key: "dim", label: "Dimanche" },
  { key: "lun", label: "Lundi" },
  { key: "mar", label: "Mardi" },
  { key: "mer", label: "Mercredi" },
  { key: "jeu", label: "Jeudi" },
  { key: "ven", label: "Vendredi" },
  { key: "sam", label: "Samedi" },
]

const SHIFT_OPTIONS = [
  { value: "Matin", label: "Matin", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "Soir", label: "Soir", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "Repos", label: "Repos", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "Doublage", label: "Doublage", color: "bg-purple-100 text-purple-800 border-purple-200" },
]

export default function SchedulePage() {
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")

  // Schedule Form State
  const [scheduleData, setScheduleData] = useState<any>({
    dim: "Repos",
    lun: "Matin",
    mar: "Matin",
    mer: "Matin",
    jeu: "Matin",
    ven: "Matin",
    sam: "Repos",
  })

  // Fetch Employees
  const { data: employeesData, loading: employeesLoading } = useQuery(GET_ALL_EMPLOYEES)
  const employees = employeesData?.personnelStatus?.map((p: any) => p.user) || []

  // Get unique departments
  const departments = useMemo(() => {
    const deps = new Set(employees.map((e: any) => e.departement).filter(Boolean))
    return Array.from(deps)
  }, [employees])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      const matchesSearch = emp.username?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDept = selectedDepartment === "all" || emp.departement === selectedDepartment
      return matchesSearch && matchesDept
    })
  }, [employees, searchTerm, selectedDepartment])

  // Fetch Schedule for selected employee
  const { data: scheduleRes, refetch: refetchSchedule } = useQuery(GET_USER_SCHEDULE, {
    variables: { userId: selectedEmployee?.id },
    skip: !selectedEmployee,
    fetchPolicy: "cache-and-network",
  })

  // Mutation
  const [updateSchedule, { loading: updating }] = useMutation(UPDATE_USER_SCHEDULE)

  // Populate form when schedule data arrives
  useEffect(() => {
    if (scheduleRes?.getUserSchedule) {
      const { dim, lun, mar, mer, jeu, ven, sam } = scheduleRes.getUserSchedule;
      setScheduleData({
        dim: dim || "Repos",
        lun: lun || "Matin",
        mar: mar || "Matin",
        mer: mer || "Matin",
        jeu: jeu || "Matin",
        ven: ven || "Matin",
        sam: sam || "Repos"
      });
    } else {
      // Default / Reset if no data
      setScheduleData({
        dim: "Repos",
        lun: "Matin",
        mar: "Matin",
        mer: "Matin",
        jeu: "Matin",
        ven: "Matin",
        sam: "Repos"
      });
    }
  }, [scheduleRes])

  const handleEmployeeClick = (employee: any) => {
    setSelectedEmployee(employee)
    setShowDialog(true)
    // Refetch will happen automatically due to variable change, or we can trigger it
  }

  const handleShiftChange = (dayKey: string, value: string) => {
    setScheduleData((prev: any) => ({ ...prev, [dayKey]: value }))
  }

  const handleSave = async () => {
    if (!selectedEmployee) return;
    try {
      setShowDialog(false); // Immediate Close

      await updateSchedule({
        variables: {
          userId: selectedEmployee.id,
          schedule: scheduleData
        },
        update(cache, { data: { updateUserSchedule } }) {
          cache.writeQuery({
            query: GET_USER_SCHEDULE,
            variables: { userId: selectedEmployee.id },
            data: { getUserSchedule: updateUserSchedule }
          });
        }
      });
      // Optional: Show toast success
    } catch (e) {
      console.error("Failed to save schedule", e);
    }
  }

  const getShiftColor = (shift: string) => {
    const opt = SHIFT_OPTIONS.find(o => o.value === shift || o.value === shift.replace('e', '')); // Handle typo Soir vs Soire if needed
    return opt ? opt.color : "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-20 lg:pt-0 h-full">
        <div className="border-b border-[#c9b896] bg-white px-3 py-3 lg:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 lg:gap-4">
            <div className="hidden lg:flex items-center gap-3">
              <div className="h-10 w-10 lg:h-16 lg:w-16 rounded-xl lg:rounded-3xl bg-[#8b5a2b] items-center justify-center shadow-lg flex">
                <CalendarIcon className="h-5 w-5 lg:h-9 lg:w-9 text-white" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-xl sm:text-3xl font-bold text-[#8b5a2b]">
                  Planning <span className="text-[#3d2c1e]">Bey</span>
                </h1>
                <p className="text-[10px] sm:text-base text-[#6b5744] font-medium lg:font-normal">
                  Gestion des Horaires Professionnels
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-between lg:justify-end gap-2">
              <div className="lg:hidden flex flex-col">
                <h1 className="text-lg font-black text-[#8b5a2b] leading-tight">Bey</h1>
                <p className="text-[9px] uppercase font-bold text-[#8b5a2b]/40 tracking-tighter">Planning</p>
              </div>
              <div className="flex p-0.5 bg-[#f1e9db] rounded-lg lg:rounded-2xl border border-[#c9b896]/20">
                <Link
                  href="/calendar/all"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all text-[#8b5a2b]/50 hover:text-[#8b5a2b]"
                  )}
                >
                  <Users className="h-3 w-3 lg:h-5 lg:w-5" />
                  <span>Touts</span>
                </Link>
                <Link
                  href="/schedule"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 lg:px-6 lg:py-3 rounded-md lg:rounded-xl text-[10px] lg:text-base font-black transition-all bg-white text-[#8b5a2b] shadow-sm lg:shadow-xl"
                  )}
                >
                  <Edit3 className="h-3 w-3 lg:h-5 lg:w-5" />
                  <span>Créer</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <Card className="border-[#c9b896] bg-white p-6 shadow-md">
            <div className="mb-6">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#3d2c1e] flex items-center gap-2">
                <Users className="h-5 w-5" />
                Liste des Employés
              </h2>
              <p className="text-sm text-[#6b5744] mt-1">
                Cliquez sur un employé pour définir sa semaine type
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6b5744]" />
                <Input
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-[#c9b896] bg-[#f8f6f1] text-[#3d2c1e]"
                />
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

            {employeesLoading ? (
              <div className="text-center py-10 text-[#8b5a2b]">Chargement...</div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredEmployees.map((employee: any) => (
                  <Card
                    key={employee.id}
                    onClick={() => handleEmployeeClick(employee)}
                    className="border-[#c9b896] bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#8b5a2b] hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] flex items-center justify-center text-white font-bold overflow-hidden border border-[#c9b896]/30">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.username} className="w-full h-full object-cover" />
                        ) : (
                          employee.username ? employee.username.charAt(0).toUpperCase() : "?"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#3d2c1e] truncate">
                          {employee.username}
                        </h3>
                        <p className="text-sm text-[#6b5744] truncate">
                          {employee.departement || "Non assigné"}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Schedule Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border-[#c9b896] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#8b5a2b] flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Semaine Type - {selectedEmployee?.username}
            </DialogTitle>
            <p className="text-sm text-[#6b5744]">
              Définissez l'emploi du temps standard pour cet employé.
            </p>
          </DialogHeader>

          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS.map((day) => (
                <Card key={day.key} className="p-4 border-[#c9b896] bg-[#f8f6f1]">
                  <Label className="font-bold text-[#3d2c1e] mb-2 block text-lg">{day.label}</Label>
                  <Select
                    value={scheduleData[day.key]}
                    onValueChange={(val) => handleShiftChange(day.key, val)}
                  >
                    <SelectTrigger className={`w-full border-[#c9b896] font-medium ${getShiftColor(scheduleData[day.key])}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${opt.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#c9b896]/20">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-[#c9b896] text-[#6b5744]">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={updating} className="bg-[#8b5a2b] hover:bg-[#6b4521] text-white">
              <Save className="mr-2 h-4 w-4" />
              {updating ? "Enregistrement..." : "Enregistrer la Semaine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
