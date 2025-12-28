"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gql, useLazyQuery } from "@apollo/client"
import { Loader2 } from "lucide-react"

const GET_USER_HISTORY = gql`
  query GetUserHistory($userId: ID!, $startDate: String!, $endDate: String!) {
    userAttendanceHistory(userId: $userId, startDate: $startDate, endDate: $endDate) {
      date
      clockIn
      clockOut
      raw_punches
      shift
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
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    // Default to current month/week or recent range
    useEffect(() => {
        if (isOpen) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7); // Last 7 days by default
            setEndDate(end.toISOString().split("T")[0]);
            setStartDate(start.toISOString().split("T")[0]);
        }
    }, [isOpen]);

    const [getHistory, { data, loading, error }] = useLazyQuery(GET_USER_HISTORY, {
        fetchPolicy: "network-only"
    });

    useEffect(() => {
        if (userId && startDate && endDate && isOpen) {
            getHistory({ variables: { userId, startDate, endDate } });
        }
    }, [userId, startDate, endDate, isOpen, getHistory]);

    const formatDuration = (clockIn: string, clockOut: string, recordDate: string) => {
        if (!clockIn || clockIn === "-" || clockIn === "--:--") return "-";

        try {
            const [h1, m1] = clockIn.split(':').map(Number);
            let endMins;

            if (clockOut && clockOut !== "-" && clockOut !== "--:--") {
                const [h2, m2] = clockOut.split(':').map(Number);
                endMins = h2 * 60 + m2;
            } else {
                // Check if it's today
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                if (recordDate === todayStr) {
                    endMins = today.getHours() * 60 + today.getMinutes();
                } else {
                    return "-";
                }
            }

            if (isNaN(h1) || isNaN(m1) || endMins === undefined) return "-";

            let startMins = h1 * 60 + m1;
            if (endMins < startMins) endMins += 24 * 60; // Overnight
            const totalMins = endMins - startMins;
            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return `${h}h ${m}m`;
        } catch (e) {
            return "-";
        }
    };

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="start" className="text-[#6b5744] font-medium text-sm">Du</Label>
                        <Input
                            type="date"
                            id="start"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-[#faf8f5] border-[#c9b896] text-[#3d2c1e] focus-visible:ring-[#8b5a2b] h-10"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="end" className="text-[#6b5744] font-medium text-sm">Au</Label>
                        <Input
                            type="date"
                            id="end"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-[#faf8f5] border-[#c9b896] text-[#3d2c1e] focus-visible:ring-[#8b5a2b] h-10"
                        />
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
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider text-center">Heures</th>
                                        <th className="p-3 text-left font-bold text-[#6b5744] text-[11px] uppercase tracking-wider">Détails (Raw)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e8e0d5]">
                                    {data.userAttendanceHistory.map((record: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-[#fcfbf9] transition-colors">
                                            <td className="p-3 text-[#3d2c1e] font-mono whitespace-nowrap">{record.date}</td>
                                            <td className="p-3 font-bold text-emerald-700">{record.clockIn || "-"}</td>
                                            <td className="p-3 font-bold text-blue-700">{record.clockOut || "-"}</td>
                                            <td className="p-3 text-[#3d2c1e] font-semibold">{record.shift || "-"}</td>
                                            <td className="p-3 text-center text-emerald-700 font-bold whitespace-nowrap">
                                                {formatDuration(record.clockIn, record.clockOut, record.date)}
                                            </td>
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
                                        <span className="font-mono font-bold text-[#3d2c1e]">{record.date}</span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Entrée</span>
                                            <span className="text-emerald-700 font-black text-xs">{record.clockIn || "--:--"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Sortie</span>
                                            <span className="text-blue-700 font-black text-xs">{record.clockOut || "--:--"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Heures</span>
                                            <span className="text-emerald-700 font-black text-xs">{formatDuration(record.clockIn, record.clockOut, record.date)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-[#6b5744] uppercase font-bold">Shift</span>
                                            <span className="text-[#3d2c1e] font-bold text-xs">{record.shift || "-"}</span>
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
