"use client"

import type React from "react"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DollarSign, TrendingUp, AlertCircle, Plus, CheckCircle, XCircle, Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { useState, Suspense, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { gql, useQuery, useMutation } from "@apollo/client"

// GraphQL Queries & Mutations
const GET_DATA = gql`
  query GetData {
    personnelStatus {
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
    }
    getAdvances {
      id
      montant
      username
      user_id
      date
      motif
      statut
    }
  }
`

const ADD_ADVANCE = gql`
  mutation AddAdvance($montant: Float!, $user_id: ID!, $motif: String!, $date: String) {
    addAdvance(montant: $montant, user_id: $user_id, motif: $motif, date: $date) {
      id
    }
  }
`

const UPDATE_ADVANCE = gql`
  mutation UpdateAdvance($id: ID!, $date: String, $montant: Float, $motif: String) {
    updateAdvance(id: $id, date: $date, montant: $montant, motif: $motif) {
      id
      date
      montant
      motif
    }
  }
`

const UPDATE_STATUS = gql`
  mutation UpdateStatus($id: ID!, $statut: String!) {
    updateAdvanceStatus(id: $id, statut: $statut) {
      id
      statut
    }
  }
`

const DELETE_ADVANCE = gql`
  mutation DeleteAdvance($id: ID!) {
    deleteAdvance(id: $id)
  }
`

function AdvancesContent() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showMaxUsersDialog, setShowMaxUsersDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [selectedUserId, setSelectedUserId] = useState("")
  const [dialogDept, setDialogDept] = useState("all")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [date, setDate] = useState("") // YYYY-MM-DD
  const [editingId, setEditingId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")

  const { data, loading, error } = useQuery(GET_DATA, { fetchPolicy: "cache-and-network" });
  const userIdParam = searchParams.get("userId");

  // Handle auto-scroll to user from notification
  useEffect(() => {
    if (!userIdParam || !data?.getAdvances || data.getAdvances.length === 0) return;

    // 1. Clear filters
    if (searchTerm) setSearchTerm("");
    if (selectedDate) setSelectedDate(undefined);

    // 2. Poll for the row to scroll to
    let attempts = 0;
    const interval = setInterval(() => {
      const element = document.getElementById(`advance-row-${userIdParam}`);
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
  }, [userIdParam, data?.getAdvances]);

  const [addAdvance, { loading: isAdding }] = useMutation(ADD_ADVANCE, {
    optimisticResponse: (vars) => ({
      addAdvance: {
        id: "temp-id-" + Date.now(),
        __typename: "Advance"
      }
    }),
    update(cache, { data: { addAdvance } }) {
      const existingData: any = cache.readQuery({ query: GET_DATA });
      if (existingData && existingData.getAdvances) {
        // Create a new advance object that matches the structure
        const newAdvance = {
          id: addAdvance.id,
          montant: parseFloat(amount),
          username: users.find((u: any) => u.id === selectedUserId)?.username,
          user_id: selectedUserId,
          date: date,
          motif: reason,
          statut: "Validé",
          __typename: "Advance"
        };
        cache.writeQuery({
          query: GET_DATA,
          data: {
            ...existingData,
            getAdvances: [...existingData.getAdvances, newAdvance]
          }
        });
      }
    }
  });

  const [updateAdvance] = useMutation(UPDATE_ADVANCE, {
    update(cache, { data: { updateAdvance } }) {
      const existingData: any = cache.readQuery({ query: GET_DATA });
      if (existingData && existingData.getAdvances) {
        const updatedList = existingData.getAdvances.map((adv: any) =>
          adv.id === editingId ? { ...adv, montant: updateAdvance.montant, date: updateAdvance.date, motif: updateAdvance.motif } : adv
        );
        cache.writeQuery({
          query: GET_DATA,
          data: { ...existingData, getAdvances: updatedList }
        });
      }
    }
  });

  const [updateStatus] = useMutation(UPDATE_STATUS, {
    // Optimistic response for instant status change
    optimisticResponse: (vars) => ({
      updateAdvanceStatus: {
        id: vars.id,
        statut: vars.statut,
        __typename: "Advance"
      }
    }),
    update(cache, { data: { updateAdvanceStatus } }) {
      const existingData: any = cache.readQuery({ query: GET_DATA });
      if (existingData && existingData.getAdvances) {
        const updatedList = existingData.getAdvances.map((adv: any) =>
          adv.id === updateAdvanceStatus.id ? { ...adv, statut: updateAdvanceStatus.statut } : adv
        );
        cache.writeQuery({
          query: GET_DATA,
          data: { ...existingData, getAdvances: updatedList }
        });
      }
    }
  });

  const [deleteAdvance] = useMutation(DELETE_ADVANCE, {
    update(cache, { data: { deleteAdvance } }) {
      // deleteAdvance returns boolean usually
      // We need to know which ID was deleted. The ID isn't in returned data if it returns boolean.
      // But we can filter out from current cache if we assume success.
      // However, without ID in response, we rely on args.
      // Ideally, the mutation should return the ID. 
      // Assuming valid delete.
    }
  });

  // New UI states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null)

  const advances = data?.getAdvances || [];
  const users = useMemo(() => {
    return data?.personnelStatus?.map((p: any) => p.user).filter((u: any) => !u.is_blocked) || [];
  }, [data]);

  const departments = useMemo(() => {
    const depts = new Set(users.map((u: any) => u.departement).filter(Boolean));
    return Array.from(depts) as string[];
  }, [users]);

  const filteredUsersForDialog = useMemo(() => {
    if (dialogDept === "all") return users;
    return users.filter((u: any) => u.departement === dialogDept);
  }, [users, dialogDept]);

  // Get salary from user data
  const getSalary = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    return user?.base_salary || 1200; // Default to 1200 if not set
  };

  const filteredAdvances = useMemo(() => {
    let filtered = advances;
    if (filterParam) {
      filtered = filtered.filter((a: any) => a.statut === filterParam);
    }
    if (searchTerm) {
      filtered = filtered.filter((a: any) =>
        a.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter((a: any) => a.date === dateStr);
    }
    return filtered;
  }, [advances, filterParam, searchTerm, selectedDate]);

  const totalAvances = advances
    .filter((a: any) => a.statut === "Validé")
    .reduce((sum: number, a: any) => sum + (a.montant || 0), 0);

  // Mock total salaries calculation
  const totalSalaries = users.length * 1200;
  const totalRemaining = totalSalaries - totalAvances;

  const usersAtMax = useMemo(() => {
    return users.filter((user: any) => {
      const salary = getSalary(user.id);
      if (salary === 0) return false; // Skip users without salary
      const userAvance = advances
        .filter((a: any) => a.user_id === user.id && a.statut === "Validé")
        .reduce((sum: number, a: any) => sum + (a.montant || 0), 0);
      const percentage = (userAvance / salary) * 100;
      return percentage >= 80; // 80% or more
    }).map((user: any) => {
      const salary = getSalary(user.id);
      const userAvance = advances
        .filter((a: any) => a.user_id === user.id && a.statut === "Validé")
        .reduce((sum: number, a: any) => sum + (a.montant || 0), 0);
      const remaining = salary - userAvance;
      const percentage = (userAvance / salary) * 100;
      return {
        ...user,
        salary,
        totalAdvance: userAvance,
        remaining,
        percentage
      };
    }).sort((a: any, b: any) => b.percentage - a.percentage); // Sort by percentage descending
  }, [users, advances]);

  const selectedDayTotal = useMemo(() => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return advances
      .filter((a: any) => a.date === dateStr && a.statut === "Validé")
      .reduce((sum: number, a: any) => sum + (a.montant || 0), 0);
  }, [advances, selectedDate]);

  const handleOpenAdd = () => {
    setSelectedUserId("");
    setDialogDept("all");
    setAmount("");
    setReason("");
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(true);
  }

  const handleOpenEdit = (advance: any) => {
    setEditingId(advance.id);
    setAmount(advance.montant);
    setReason(advance.motif);
    setDate(advance.date || new Date().toISOString().split('T')[0]);
    setShowEditForm(true);
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addAdvance({
        variables: {
          montant: parseFloat(amount),
          user_id: selectedUserId,
          motif: reason,
          date: date
        }
      });
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await updateAdvance({
        variables: {
          id: editingId,
          montant: parseFloat(amount),
          motif: reason,
          date: date
        }
      });
      setShowEditForm(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la modification");
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateStatus({ variables: { id, statut: newStatus } });
    } catch (e) { console.error(e); }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette avance ?")) {
      await deleteAdvance({
        variables: { id },
        update(cache) {
          const existingData: any = cache.readQuery({ query: GET_DATA });
          if (existingData && existingData.getAdvances) {
            const updatedList = existingData.getAdvances.filter((a: any) => a.id !== id);
            cache.writeQuery({
              query: GET_DATA,
              data: { ...existingData, getAdvances: updatedList }
            });
          }
        }
      });
    }
  }

  if (loading) return <div className="p-8 text-center text-[#6b5744]">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Erreur de chargement: {error.message}</div>;

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        <div className="border-b border-[#c9b896] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-bold text-[#8b5a2b]">
                Liste des Avances
              </h1>
              <p className="mt-2 text-base sm:text-lg text-[#6b5744]">
                Gérer les avances des employés ({advances.length} total)
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:opacity-90 shadow-md w-full sm:w-auto text-base sm:text-lg px-6 py-6"
            >
              <Plus className="mr-2 h-5 w-5" />
              Ajouter Avance
            </Button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#c9b896] bg-white p-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4 text-emerald-600 border border-emerald-200">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm sm:text-base text-[#6b5744]">Total Avances (Validé)</p>
                  <p className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#3d2c1e]">
                    {totalAvances.toLocaleString()} TND
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-[#c9b896] bg-white p-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-4 text-blue-600 border border-blue-200">
                  <DollarSign className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm sm:text-base text-[#6b5744]">Total Reste (Est.)</p>
                  <p className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#3d2c1e]">
                    {totalRemaining.toLocaleString()} TND
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border-[#c9b896] bg-white p-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-4 text-amber-600 border border-amber-200">
                  <DollarSign className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm sm:text-base text-[#6b5744]">Avances Validées</p>
                  <p className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#3d2c1e]">
                    {advances.filter((a: any) => a.statut === "Validé").length}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="border-[#c9b896] bg-white p-6 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setShowMaxUsersDialog(true)}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/5 p-4 text-red-600 border border-red-200">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm sm:text-base text-[#6b5744]">Avances Max</p>
                  <p className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl font-bold text-[#3d2c1e]">
                    {usersAtMax.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-[#c9b896] bg-white shadow-md">
            <div className="border-b border-[#c9b896] p-6">
              <h3 className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl font-semibold text-[#3d2c1e]">
                Historique des Avances
              </h3>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Rechercher par employé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-11 text-base pl-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5a2b]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-11 text-base",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Filtrer par date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                    {selectedDate && (
                      <div className="p-2 border-t border-[#c9b896]/30 bg-[#f8f6f1]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-[#8b5a2b] hover:text-[#a0522d]"
                          onClick={() => setSelectedDate(undefined)}
                        >
                          Effacer le filtre
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {selectedDate && (
                <div className="mt-4 flex items-center justify-end">
                  <div className="bg-[#f8f6f1] border border-[#c9b896]/30 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                    <span className="text-sm font-medium text-[#6b5744]">Total pour le {format(selectedDate, "dd/MM/yyyy")} :</span>
                    <span className="text-lg font-bold text-[#8b5a2b] font-[family-name:var(--font-heading)]">{selectedDayTotal.toLocaleString()} TND</span>
                  </div>
                </div>
              )}
            </div>
            {/* Desktop View Table */}
            <div className="hidden min-[1100px]:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#c9b896]">
                    <th className="p-4 sm:p-5 text-left text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Employé</th>
                    <th className="p-4 sm:p-5 text-left text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Montant</th>
                    <th className="p-4 sm:p-5 text-left text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Motif</th>
                    <th className="p-4 sm:p-5 text-left text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Date</th>
                    <th className="p-4 sm:p-5 text-left text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Statut</th>
                    <th className="p-4 sm:p-5 text-right text-sm font-black text-[#8b5a2b] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c9b896]/30">
                  {filteredAdvances.length > 0 ? (
                    filteredAdvances.map((advance: any) => {
                      const employee = users.find((u: any) => u.id === advance.user_id) || { username: advance.username || 'Inconnu', departement: '' };

                      return (
                        <tr key={advance.id} id={`advance-row-${advance.user_id}`} className="hover:bg-[#f8f6f1]/50 transition-colors">
                          <td className="p-4 sm:p-5">
                            <div
                              className="flex items-center gap-3 cursor-pointer group"
                              onClick={() => {
                                setSelectedUserForDetails(employee);
                                setShowUserDetails(true);
                              }}
                            >
                              <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] flex items-center justify-center text-white font-black overflow-hidden border border-[#c9b896]/30 group-hover:scale-105 transition-transform shadow-md">
                                {employee.photo ? (
                                  <img src={employee.photo} alt={employee.username} className="w-full h-full object-cover" />
                                ) : (
                                  employee.username?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-black text-[#3d2c1e] group-hover:text-[#8b5a2b] transition-colors truncate uppercase leading-tight">
                                  {employee.username}
                                </p>
                                <p className="text-[10px] font-bold text-[#8b5a2b] opacity-60 uppercase tracking-widest truncate">{employee.departement}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 sm:p-5">
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-[#8b5a2b] tabular-nums leading-none">
                                {advance.montant?.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-[#6b5744] opacity-50 uppercase tracking-tighter">TND</span>
                            </div>
                          </td>
                          <td className="p-4 sm:p-5 text-sm font-bold text-[#3d2c1e] uppercase tracking-tight">{advance.motif}</td>
                          <td className="p-4 sm:p-5 text-sm font-bold text-[#6b5744] tabular-nums">
                            {advance.date ? format(new Date(advance.date), "dd/MM/yyyy") : "-"}
                          </td>
                          <td className="p-4 sm:p-5">
                            <span
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                advance.statut === "Validé" || advance.statut === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : advance.statut === "Refusé" || advance.statut === "rejected"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              )}
                            >
                              {advance.statut === "approved" ? "Validé" : advance.statut === "rejected" ? "Refusé" : advance.statut}
                            </span>
                          </td>
                          <td className="p-4 sm:p-5">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-9 p-0 rounded-lg border-[#c9b896] text-[#8b5a2b] hover:bg-[#8b5a2b] hover:text-white transition-all shadow-sm"
                                onClick={() => handleOpenEdit(advance)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-rose-600 h-9 w-9 p-0 rounded-lg"
                                onClick={() => handleDelete(advance.id)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan={6} className="p-20 text-center text-[#6b5744] font-bold opacity-30">AUCUNE AVANCE TROUVÉE</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="min-[1100px]:hidden flex flex-col divide-y divide-[#c9b896]/20">
              {filteredAdvances.length > 0 ? (
                filteredAdvances.map((advance: any) => {
                  const employee = users.find((u: any) => u.id === advance.user_id) || { username: advance.username || 'Inconnu', departement: '' };

                  return (
                    <div
                      key={advance.id}
                      id={`advance-row-mobile-${advance.id}`}
                      className="p-4 bg-white flex flex-col gap-4 active:bg-[#f8f6f1] transition-colors"
                      onClick={() => handleOpenEdit(advance)}
                    >
                      {/* Top: User + Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#c9b896] p-[1px] shadow-md border border-[#c9b896]/30 overflow-hidden shrink-0">
                            {employee.photo ? (
                              <img src={employee.photo} alt={employee.username} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-black text-sm uppercase">
                                {employee.username?.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-black text-[#3d2c1e] text-base truncate uppercase leading-tight">{employee.username}</h4>
                            <span className="text-[10px] font-bold text-[#8b5a2b]/70 uppercase tracking-widest truncate">{employee.departement || "Personnel"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-black text-[#8b5a2b]/50 tabular-nums uppercase">
                            {advance.date ? format(new Date(advance.date), "dd/MM/yyyy") : "-"}
                          </span>
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                              advance.statut === "Validé" || advance.statut === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : advance.statut === "Refusé" || advance.statut === "rejected"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {advance.statut === "approved" ? "Validé" : advance.statut === "rejected" ? "Refusé" : advance.statut}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Amount & Reason */}
                      <div className="grid grid-cols-2 gap-2 bg-[#f8f6f1]/50 p-3 rounded-xl border border-[#c9b896]/10">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-black text-[#8b5a2b]/50 uppercase tracking-widest">Montant</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="font-black text-[#8b5a2b] text-base tabular-nums">{advance.montant?.toLocaleString()}</span>
                            <span className="text-[8px] font-bold text-[#8b5a2b] opacity-40 uppercase">TND</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center border-l border-[#c9b896]/20">
                          <span className="text-[8px] font-black text-[#8b5a2b]/50 uppercase tracking-widest">Motif</span>
                          <span className="font-black text-[#3d2c1e] text-xs truncate w-full text-center uppercase tracking-tight">{advance.motif}</span>
                        </div>
                      </div>

                      {/* Bottom: Actions */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-[#8b5a2b]/40 uppercase tracking-widest">ID: {employee.zktime_id || advance.user_id}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-500 h-8 font-black uppercase tracking-tighter text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(advance.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-10 text-center text-[#6b5744] font-bold opacity-30 uppercase tracking-widest">AUCUNE AVANCE TROUVÉE</div>
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* ADD ADVANCE DIALOG */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="bg-white border-[#c9b896] max-w-md w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Ajouter une Avance</DialogTitle>
              <DialogDescription className="text-white/80 font-bold text-xs uppercase tracking-widest">
                DÉTAILS DU NOUVEAU PAIEMENT
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleAddSubmit} className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-base font-medium text-[#3d2c1e]">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date), "dd/MM/yyyy") : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date) : undefined}
                    onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-4 rounded-xl border border-[#c9b896]/20 bg-[#f8f6f1]/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-dept" className="text-[10px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] ml-1">
                  Département
                </Label>
                <Select value={dialogDept} onValueChange={(val) => { setDialogDept(val); setSelectedUserId(""); }}>
                  <SelectTrigger className="bg-white border-[#c9b896]/30 text-[#3d2c1e] h-11 text-sm font-bold rounded-lg shadow-sm">
                    <SelectValue placeholder="Tous les départements" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#c9b896]">
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee" className="text-[10px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] ml-1">
                  Sélectionner l'Employé
                </Label>
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-[#c9b896]/30 shadow-sm min-h-[56px]">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] flex items-center justify-center text-white font-black overflow-hidden shadow-inner">
                    {(() => {
                      const user = users.find((u: any) => u.id === selectedUserId);
                      return user?.photo ? <img src={user.photo} className="h-full w-full object-cover" /> : <Plus className="h-5 w-5 opacity-40" />;
                    })()}
                  </div>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                    <SelectTrigger className="border-none shadow-none focus:ring-0 text-[#3d2c1e] h-auto p-0 text-sm font-black flex-1 min-w-0">
                      <SelectValue placeholder="Choisir un employé..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#c9b896] max-h-[300px]">
                      {filteredUsersForDialog.length > 0 ? (
                        filteredUsersForDialog.map((user: any) => (
                          <SelectItem key={user.id} value={user.id} className="text-sm">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                {user.photo ? (
                                  <img src={user.photo} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-black text-[#8b5a2b]">{user.username.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <span className="font-bold">{user.username}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs font-bold text-[#8b5a2b] opacity-40">AUCUN EMPLOYÉ</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-medium text-[#3d2c1e]">
                Montant (TND)
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Entrer le montant"
                className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-base font-medium text-[#3d2c1e]">
                Motif
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif de l'avance"
                className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || isAdding}
                className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:opacity-90 h-12 text-base flex-1"
              >
                {isSubmitting || isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="border-[#c9b896] text-[#3d2c1e] h-12 text-base flex-1"
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ADVANCE DIALOG */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="bg-white border-[#c9b896] max-w-md w-[95vw] sm:w-full rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] p-6 text-white text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Modifier l'Avance</DialogTitle>
              <DialogDescription className="text-white/80 font-bold text-xs uppercase tracking-widest text-center">
                MISE À JOUR DES DÉTAILS
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleEditSubmit} className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-date" className="text-base font-medium text-[#3d2c1e]">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date), "dd/MM/yyyy") : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date) : undefined}
                    onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="text-base font-medium text-[#3d2c1e]">
                Montant (TND)
              </Label>
              <Input
                id="edit-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Entrer le montant"
                className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reason" className="text-base font-medium text-[#3d2c1e]">
                Motif
              </Label>
              <Input
                id="edit-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif de l'avance"
                className="bg-[#f8f6f1] border-[#c9b896] text-[#3d2c1e] h-12 text-base"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:opacity-90 h-12 text-base flex-1"
              >
                Sauvegarder
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditForm(false)}
                className="border-[#c9b896] text-[#3d2c1e] h-12 text-base flex-1"
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* MAX USERS DIALOG */}
      <Dialog open={showMaxUsersDialog} onOpenChange={setShowMaxUsersDialog}>
        <DialogContent className="bg-white border-[#c9b896] max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-2xl">
          <div className="bg-rose-600 p-6 text-white sticky top-0 z-10 shadow-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <AlertCircle className="h-7 w-7 animate-pulse" />
                Seuils Maximaux
              </DialogTitle>
              <DialogDescription className="text-rose-100 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                EMPLOYÉS AYANT ATTEINT 80% OU PLUS DE LEUR SALAIRE
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {usersAtMax.length === 0 ? (
              <div className="text-center py-8 text-[#6b5744]">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-lg">Aucun employé n'a atteint le seuil maximum</p>
              </div>
            ) : (
              usersAtMax.map((user: any) => (
                <Card key={user.id} className="border-[#c9b896] bg-[#f8f6f1] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] flex items-center justify-center text-white font-bold text-lg">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#3d2c1e] text-lg">{user.username}</h4>
                        <p className="text-sm text-[#6b5744]">{user.departement || "Non assigné"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${user.percentage >= 95 ? "bg-red-100 text-red-700 border border-red-200" :
                        user.percentage >= 90 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                          "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                        {user.percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border border-[#c9b896]/30">
                      <p className="text-xs text-[#6b5744]">Salaire</p>
                      <p className="font-bold text-[#3d2c1e]">{user.salary.toLocaleString()} DT</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#c9b896]/30">
                      <p className="text-xs text-[#6b5744]">Avances</p>
                      <p className="font-bold text-red-600">{user.totalAdvance.toLocaleString()} DT</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#c9b896]/30">
                      <p className="text-xs text-[#6b5744]">Reste</p>
                      <p className="font-bold text-emerald-600">{user.remaining.toLocaleString()} DT</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => setShowMaxUsersDialog(false)}
              className="bg-[#8b5a2b] hover:bg-[#6b4521] text-white h-12 text-base px-6"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* USER DETAILS DIALOG */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="bg-white border-[#c9b896] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl rounded-2xl">
          {selectedUserForDetails && (
            <>
              <div className="p-6 bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] text-white">
                <div className="flex items-center gap-5">
                  <div className="h-20 w-20 rounded-full border-4 border-white/30 shadow-xl overflow-hidden bg-white/10 flex items-center justify-center font-bold text-3xl">
                    {selectedUserForDetails.photo ? (
                      <img src={selectedUserForDetails.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedUserForDetails.username?.charAt(0)
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-bold font-[family-name:var(--font-heading)] text-white">{selectedUserForDetails.username}</DialogTitle>
                    <p className="text-white/80 font-medium">{selectedUserForDetails.departement || "Aucun département"}</p>
                    <DialogDescription className="mt-2 text-xs uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full inline-block text-white">
                      Détails des avances du mois
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-4 bg-[#fdfaf5] border-b border-[#c9b896]/30 shadow-inner">
                <div className="bg-white p-4 rounded-xl border border-[#c9b896]/40 shadow-sm">
                  <p className="text-xs sm:text-sm text-[#6b5744] font-medium mb-1">Salaire</p>
                  <p className="text-xl font-bold text-[#3d2c1e] font-[family-name:var(--font-heading)]">{(selectedUserForDetails.base_salary || 0).toLocaleString()} <span className="text-xs">TND</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#c9b896]/40 shadow-sm">
                  <p className="text-xs sm:text-sm text-[#6b5744] font-medium mb-1">Total Avances</p>
                  <p className="text-xl font-bold text-rose-600 font-[family-name:var(--font-heading)]">
                    {advances
                      .filter((a: any) => a.user_id === selectedUserForDetails.id && (a.statut === "Validé" || a.statut === "En attente"))
                      .reduce((sum: number, a: any) => sum + (a.montant || 0), 0)
                      .toLocaleString()} <span className="text-xs">TND</span>
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#c9b896]/40 shadow-sm">
                  <p className="text-xs sm:text-sm text-[#6b5744] font-medium mb-1">Reste</p>
                  <p className="text-xl font-bold text-emerald-600 font-[family-name:var(--font-heading)]">
                    {((selectedUserForDetails.base_salary || 0) - advances
                      .filter((a: any) => a.user_id === selectedUserForDetails.id && (a.statut === "Validé" || a.statut === "En attente"))
                      .reduce((sum: number, a: any) => sum + (a.montant || 0), 0)).toLocaleString()} <span className="text-xs">TND</span>
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {advances.filter((a: any) => a.user_id === selectedUserForDetails.id).length > 0 ? (
                  advances
                    .filter((a: any) => a.user_id === selectedUserForDetails.id)
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((adv: any) => (
                      <div key={adv.id} className="group relative bg-[#f8f6f1]/50 border border-[#c9b896]/20 p-5 rounded-2xl hover:bg-white hover:border-[#8b5a2b]/30 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <p className="text-xl font-bold text-[#3d2c1e] font-[family-name:var(--font-heading)]">
                                {adv.montant?.toLocaleString()} TND
                              </p>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${adv.statut === 'Validé' ? 'bg-emerald-100 text-emerald-700' :
                                adv.statut === 'Refusé' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                {adv.statut}
                              </span>
                            </div>
                            <p className="text-sm text-[#6b5744] font-medium italic">"{adv.motif}"</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end text-[#8b5a2b] gap-1.5 mb-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              <p className="text-xs font-bold uppercase">{adv.date ? format(new Date(adv.date), "dd MMMM yyyy", { locale: fr }) : "-"}</p>
                            </div>
                            <p className="text-[10px] text-[#6b5744] opacity-70">Enregistré le {adv.createdAt || adv.date}</p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 flex flex-col items-center gap-4 text-[#c9b896]">
                    <div className="h-20 w-20 rounded-full bg-[#f8f6f1] flex items-center justify-center">
                      <DollarSign className="h-10 w-10 opacity-20" />
                    </div>
                    <p className="font-medium text-lg">Aucune avance enregistrée</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#c9b896]/20 bg-[#fdfaf5] flex justify-end">
                <Button
                  onClick={() => setShowUserDetails(false)}
                  className="bg-[#3d2c1e] hover:bg-[#2a1d14] text-white px-8 h-12 rounded-xl"
                >
                  Fermer
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdvancesPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center bg-[#f8f6f1]">Chargement...</div>}
    >
      <AdvancesContent />
    </Suspense>
  )
}