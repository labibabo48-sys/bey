"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { gql, useLazyQuery } from "@apollo/client"
import { getCurrentUser } from "@/lib/mock-data"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"

const GET_USER_HISTORY = gql`
  query GetUserHistory($userId: ID!, $startDate: String!, $endDate: String!) {
    userAttendanceHistory(userId: $userId, startDate: $startDate, endDate: $endDate) {
      date
      clockIn
      clockOut
      raw_punches
      shift
      hours
    }
  }
`

interface AttendanceHistoryModalProps {
    userId: string | null
    userName: string
    isOpen: boolean
    onClose: () => void
}

export function AttendanceHistoryModal({ userId, userName, isOpen, onClose }: AttendanceHistoryModalProps) {
    const currentUser = getCurrentUser()
    const isAdmin = currentUser?.role === 'admin'
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)

    // Default to current month/week or recent range
    useEffect(() => {
        if (isOpen) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7); // Last 7 days by default
            setEndDate(end);
            setStartDate(start);
        }
    }, [isOpen]);

    const [getHistory, { data, loading, error }] = useLazyQuery(GET_USER_HISTORY, {
        fetchPolicy: "network-only"
    });

    useEffect(() => {
        if (userId && startDate && endDate && isOpen) {
            getHistory({
                variables: {
                    userId,
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd')
                }
            });
        }
    }, [userId, startDate, endDate, isOpen, getHistory]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-[850px] max-h-[90vh] bg-white border-[#c9b896] p-3 sm:p-6 overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-[#8b5a2b] font-[family-name:var(--font-heading)] text-xl sm:text-2xl text-center sm:text-left">
                        Historique de {userName}
                    </DialogTitle>
                    <DialogDescription className="text-center sm:text-left">
                        Consultez les pointages sur une période donnée (Journée logique 05h-05h).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 my-6">
                    <div className="space-y-2">
                        <Label className="text-[#6b5744] font-bold text-xs uppercase tracking-widest pl-1">Du</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-mono font-bold border-[#c9b896] text-[#3d2c1e] bg-[#faf8f5] hover:bg-[#f5f0e8] h-12 rounded-xl px-4",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-5 w-5 text-[#8b5a2b]" />
                                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Choisir une date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                    locale={fr}
                                    className="p-3"
                                    classNames={{
                                        day_selected: "bg-[#8b5a2b] text-white hover:bg-[#8b5a2b] hover:text-white focus:bg-[#8b5a2b] focus:text-white rounded-lg",
                                        day_today: "bg-[#f5f0e8] text-[#3d2c1e] rounded-lg",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#6b5744] font-bold text-xs uppercase tracking-widest pl-1">Au</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-mono font-bold border-[#c9b896] text-[#3d2c1e] bg-[#faf8f5] hover:bg-[#f5f0e8] h-12 rounded-xl px-4",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-5 w-5 text-[#8b5a2b]" />
                                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Choisir une date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-[#c9b896] bg-white shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                    locale={fr}
                                    className="p-3"
                                    classNames={{
                                        day_selected: "bg-[#8b5a2b] text-white hover:bg-[#8b5a2b] hover:text-white focus:bg-[#8b5a2b] focus:text-white rounded-lg",
                                        day_today: "bg-[#f5f0e8] text-[#3d2c1e] rounded-lg",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#8b5a2b]" />
                    </div>
                )}

                {error && (
                    <div className="p-4 text-red-600 bg-red-50 rounded">
                        Erreur: {error.message}
                    </div>
                )}

                {!loading && data && (
                    <div className="flex-1 overflow-y-auto px-1">
                        {/* Desktop Table View */}
                        <div className="hidden sm:block border border-[#c9b896] rounded-lg overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-[#f8f6f1] border-b border-[#c9b896]">
                                    <tr>
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Date</th>
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Entrée</th>
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Sortie</th>
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Shift</th>
                                        {isAdmin && <th className="p-3 text-center font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Heures</th>}
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Détails (Raw)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e8e0d5]">
                                    {data.userAttendanceHistory.map((record: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[#fcfbf9] transition-colors">
                                            <td className="p-3 text-[#3d2c1e] font-mono whitespace-nowrap">{record.date?.split('-').reverse().join('/')}</td>
                                            <td className="p-3 font-bold text-emerald-700">{record.clockIn || "-"}</td>
                                            <td className="p-3 font-bold text-blue-700">{record.clockOut || "-"}</td>
                                            <td className="p-3 text-[#3d2c1e] font-semibold">{record.shift || "-"}</td>
                                            {isAdmin && (
                                                <td className="p-3 text-center">
                                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{record.hours || 0}h</span>
                                                </td>
                                            )}
                                            <td className="p-3 text-[11px] text-[#6b5744] font-mono break-all max-w-[200px]">
                                                {record.raw_punches?.join(', ') || "Aucun"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="sm:hidden space-y-3">
                            {data.userAttendanceHistory.map((record: any, idx: number) => (
                                <div key={idx} className="bg-white border border-[#c9b896] rounded-xl p-4 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center border-b border-[#f0e8dc] pb-2">
                                        <span className="text-[10px] font-black text-[#8b5a2b] uppercase tracking-widest">Date</span>
                                        <span className="font-mono font-bold text-[#3d2c1e]">{record.date?.split('-').reverse().join('/')}</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Entrée</span>
                                            <span className="text-emerald-700 font-black text-base">{record.clockIn || "--:--"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Sortie</span>
                                            <span className="text-blue-700 font-black text-base">{record.clockOut || "--:--"}</span>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#6b5744] uppercase font-bold">Heures</span>
                                                <span className="text-emerald-700 font-black text-base">{record.hours || 0}h</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Shift</span>
                                            <span className="text-[#3d2c1e] font-bold">{record.shift || "-"}</span>
                                        </div>
                                    </div>

                                    <div className="bg-[#faf8f5] p-2.5 rounded-lg border border-[#f0e8dc]">
                                        <span className="text-[10px] text-[#8b5a2b] uppercase font-black block mb-1">Détails des Pointages (Raw)</span>
                                        <p className="text-xs font-mono text-[#6b5744] break-words leading-relaxed">
                                            {record.raw_punches?.length > 0 ? record.raw_punches.join(' • ') : "Aucun pointage enregistré"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {data.userAttendanceHistory.length === 0 && (
                            <div className="text-center py-12 bg-[#faf8f5] rounded-xl border border-dashed border-[#c9b896]">
                                <p className="text-[#6b5744] font-medium italic">Aucune donnée trouvée pour cette période</p>
                            </div>
                        )}
                    </div>
                )}

            </DialogContent>
        </Dialog>
    )
}
