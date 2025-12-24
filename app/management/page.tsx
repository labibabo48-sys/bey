"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, Shield, Save, Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react"

import { useState, useEffect } from "react"
import { gql, useQuery, useMutation } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const GET_MANAGERS = gql`
  query GetLogins {
    getLogins {
      id
      username
      role
      photo
      permissions
    }
  }
`

const UPDATE_ACCOUNT = gql`
  mutation UpdateLoginAccount($id: ID!, $username: String, $password: String, $role: String, $permissions: String) {
    updateLoginAccount(id: $id, username: $username, password: $password, role: $role, permissions: $permissions) {
      id
      username
      role
      permissions
    }
  }
`

const CREATE_ACCOUNT = gql`
  mutation CreateLoginAccount($username: String!, $password: String!, $role: String!, $permissions: String) {
    createLoginAccount(username: $username, password: $password, role: $role, permissions: $permissions) {
      id
      username
      role
      permissions
    }
  }
`

const DELETE_ACCOUNT = gql`
  mutation DeleteLoginAccount($id: ID!) {
    deleteLoginAccount(id: $id)
  }
`

const initialPermissions = {
    sidebar: {
        dashboard: true,
        attendance: true,
        employees: true,
        schedule: true,
        calendar: true,
        payroll: true,
        fiche_payroll: true,
        notebook: true,
        finance: true,
        advances: true,
        retards: true,
        absents: true
    },
    dashboard: {
        total_personnel: true,
        presence_actuelle: true,
        en_retard: true,
        absences: true,
        les_avances: true,
        reste_a_payer: true
    },
    attendance: {
        top_performers: true
    },
    employees: {
        add_employee: true
    },
    payroll: {
        // Stats
        stats_total_base: true,
        stats_avances: true,
        stats_net_global: true,
        stats_extras: true,
        stats_doublages: true,

        // Actions
        action_extra: true,
        action_doublage: true,
        action_rapport: true,

        // Table Columns
        col_employee: true,
        col_base: true,
        col_abs_days: true,
        col_primes: true,
        col_extra: true,
        col_doublage: true,
        col_retenues: true,
        col_avance: true,
        col_net: true,
        col_action: true, // "Payer" button / Details
        user_details_modal: true,
    }
}

export default function ManagementPage() {
    const { data, loading, refetch } = useQuery(GET_MANAGERS, {
        fetchPolicy: "network-only"
    })

    const managers = data?.getLogins || []

    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [permissions, setPermissions] = useState<any>(initialPermissions)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editPassword, setEditPassword] = useState("")
    const [editRole, setEditRole] = useState("manager")
    const [editUsername, setEditUsername] = useState("")
    const [isAddMode, setIsAddMode] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [updateAccount, { loading: isUpdating }] = useMutation(UPDATE_ACCOUNT, {
        onCompleted: (data) => {
            setIsDialogOpen(false)
            refetch()
            alert("Compte mis à jour avec succès")

            // Sync current user session if editing self
            const updatedUser = data?.updateLoginAccount;
            const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('business_bey_user') || 'null') : null;
            if (currentUser && updatedUser && currentUser.username === updatedUser.username) {
                // Update local session
                const newSessionUser = {
                    ...currentUser,
                    name: updatedUser.username,
                    username: updatedUser.username,
                    role: updatedUser.role,
                    permissions: updatedUser.permissions
                };
                localStorage.setItem('business_bey_user', JSON.stringify(newSessionUser));
                window.dispatchEvent(new CustomEvent("userChanged"));
            }
        },
        onError: (error) => {
            alert("Erreur lors de la mise à jour: " + error.message)
        }
    })

    const [createAccount, { loading: isCreating }] = useMutation(CREATE_ACCOUNT, {
        onCompleted: (data) => {
            setIsDialogOpen(false)
            refetch()
            alert("Compte créé avec succès")

            // Sync if matched
            const newUser = data?.createLoginAccount;
            const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('business_bey_user') || 'null') : null;
            if (currentUser && newUser && currentUser.username === newUser.username) {
                const newSessionUser = {
                    ...currentUser,
                    name: newUser.username,
                    username: newUser.username,
                    role: newUser.role,
                    permissions: newUser.permissions
                };
                localStorage.setItem('business_bey_user', JSON.stringify(newSessionUser));
                window.dispatchEvent(new CustomEvent("userChanged"));
            }
        },
        onError: (error) => {
            alert("Erreur lors de la création: " + error.message)
        }
    })

    const isSubmitting = isUpdating || isCreating;

    const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
        onCompleted: () => {
            refetch()
            alert("Compte supprimé avec succès")
        }
    })

    const handleOpenPermissions = (user: any) => {
        setIsAddMode(false)
        setSelectedUser(user)
        setEditUsername(user.username)
        setEditRole(user.role)
        setEditPassword("")
        if (user.permissions) {
            try {
                const parsed = JSON.parse(user.permissions);
                setPermissions({
                    ...initialPermissions,
                    ...parsed,
                    sidebar: { ...initialPermissions.sidebar, ...(parsed.sidebar || {}) },
                    dashboard: { ...initialPermissions.dashboard, ...(parsed.dashboard || {}) },
                    attendance: { ...initialPermissions.attendance, ...(parsed.attendance || {}) },
                    employees: { ...initialPermissions.employees, ...(parsed.employees || {}) },
                    payroll: { ...initialPermissions.payroll, ...(parsed.payroll || {}) },
                })
            } catch (e) {
                setPermissions(initialPermissions)
            }
        } else {
            setPermissions(initialPermissions)
        }
        setIsDialogOpen(true)
    }

    const handleOpenAdd = () => {
        setIsAddMode(true)
        setSelectedUser(null)
        setEditUsername("")
        setEditRole("manager")
        setEditPassword("")
        setPermissions(initialPermissions)
        setIsDialogOpen(true)
    }

    const handleSave = () => {
        const variables = {
            id: selectedUser?.id,
            username: editUsername,
            password: editPassword || undefined,
            role: editRole,
            permissions: JSON.stringify(permissions)
        }

        if (isAddMode) {
            if (!editUsername || !editPassword) return alert("Nom d'utilisateur et mot de passe requis")
            createAccount({
                variables: {
                    username: editUsername,
                    password: editPassword,
                    role: editRole,
                    permissions: JSON.stringify(permissions)
                }
            })
        } else {
            updateAccount({
                variables: {
                    id: selectedUser.id,
                    username: editUsername,
                    password: editPassword || undefined,
                    role: editRole,
                    permissions: JSON.stringify(permissions)
                }
            })
        }
    }

    const handleDelete = (id: string, e: any) => {
        e.stopPropagation()
        if (confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
            deleteAccount({ variables: { id } })
        }
    }

    const togglePermission = (category: string, key: string) => {
        setPermissions((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: !prev[category][key]
            }
        }))
    }

    if (loading) return <div className="p-10">Chargement...</div>

    return (
        <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pt-24 pb-24 lg:pt-0 lg:pb-0 h-full p-6 lg:p-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-[#c9b896]/20">
                    <div>
                        <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-black text-[#8b5a2b] uppercase tracking-tighter">
                            Gestion Accès
                        </h1>
                        <p className="text-[#6b5744] font-bold text-xs sm:text-sm uppercase tracking-widest mt-1 opacity-70">
                            Contrôle des permissions gérants
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenAdd}
                        className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:opacity-90 shadow-lg h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs w-full sm:w-auto"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Ajouter un Compte
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {managers.map((manager: any) => (
                        <Card
                            key={manager.id}
                            onClick={() => handleOpenPermissions(manager)}
                            className="bg-white p-5 shadow-md hover:shadow-2xl transition-all cursor-pointer border border-[#c9b896]/30 group relative overflow-hidden rounded-2xl active:scale-[0.98]"
                        >
                            <div className="absolute top-0 right-0 p-3 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 sm:border-none bg-rose-50/50 sm:bg-transparent"
                                    onClick={(e) => handleDelete(manager.id, e)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center gap-4 sm:text-center">
                                <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-[#f8f6f1] to-[#e8e0d5] border-2 border-[#8b5a2b]/10 overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#8b5a2b]/30 transition-colors">
                                    {manager.photo ? (
                                        <img src={manager.photo} alt={manager.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl sm:text-3xl font-black text-[#8b5a2b] uppercase">{manager.username.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 sm:w-full">
                                    <h3 className="font-black text-[#3d2c1e] text-lg sm:text-xl truncate uppercase leading-tight group-hover:text-[#8b5a2b] transition-colors">
                                        {manager.username}
                                    </h3>
                                    <span className={cn(
                                        "inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border",
                                        manager.role === "admin"
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                            : "bg-amber-50 text-amber-700 border-amber-100"
                                    )}>
                                        {manager.role}
                                    </span>
                                </div>
                                <div className="hidden sm:flex items-center justify-center w-full pt-4 mt-2 border-t border-[#f8f6f1]">
                                    <span className="text-[10px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <Edit className="h-3 w-3" /> Gérer l'Accès
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Permissions Modal */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-white border-[#c9b896] p-0 rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] p-6 text-white sticky top-0 z-20 shadow-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Shield className="h-7 w-7" />
                                    {isAddMode ? "Nouvel Accès" : `Permissions - ${selectedUser?.username}`}
                                </DialogTitle>
                                <DialogDescription className="text-white/80 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                                    CONFIGURATION DES DROITS D'UTILISATION
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-5 sm:p-8 space-y-8">
                            {/* Account Identity Section */}
                            <section className="bg-[#f8f6f1] p-5 rounded-2xl border border-[#c9b896]/20 shadow-inner">
                                <h3 className="text-[10px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="w-4 h-[2px] bg-[#8b5a2b]"></span> IDENTITÉ DU COMPTE
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-[#6b5744] font-black text-[10px] uppercase tracking-widest ml-1">Utilisateur</Label>
                                        <Input
                                            value={editUsername}
                                            onChange={(e) => setEditUsername(e.target.value)}
                                            placeholder="Ex: admin_bey"
                                            className="bg-white border-[#c9b896]/30 h-11 font-bold text-[#3d2c1e] focus:ring-2 focus:ring-[#8b5a2b]/20"
                                            disabled={!isAddMode}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[#6b5744] font-black text-[10px] uppercase tracking-widest ml-1">Rôle Système</Label>
                                        <Select value={editRole} onValueChange={setEditRole}>
                                            <SelectTrigger className="bg-white border-[#c9b896]/30 h-11 font-bold text-[#3d2c1e] shadow-sm">
                                                <SelectValue placeholder="Choisir un rôle" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-[#c9b896]">
                                                <SelectItem value="manager">MANAGER</SelectItem>
                                                <SelectItem value="admin">ADMINISTRATEUR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label className="text-[#6b5744] font-black text-[10px] uppercase tracking-widest ml-1">
                                            {isAddMode ? "Mot de passe" : "Changer le mot de passe (optionnel)"}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={editPassword}
                                                onChange={(e) => setEditPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="bg-white border-[#c9b896]/30 h-11 font-black tracking-widest focus:ring-2 focus:ring-[#8b5a2b]/20 pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b5a2b] hover:text-[#6b4521] focus:outline-none"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Sidebar Section */}
                                <section>
                                    <h3 className="text-[11px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-[#c9b896]/20 pb-2">
                                        <Edit className="h-4 w-4" /> ACCÈS MENU LATÉRAL
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries({
                                            dashboard: "Tableau de bord",
                                            attendance: "Présences",
                                            employees: "Gestion Employés",
                                            schedule: "Emplois du Temps",
                                            calendar: "Calendrier",
                                            payroll: "Paie (Main)",
                                            fiche_payroll: "Fiches Individuelles",
                                            notebook: "Réclamations",
                                            finance: "Chiffres de Paie",
                                            advances: "Avances",
                                            retards: "Retards",
                                            absents: "Absents"
                                        }).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#c9b896]/10 hover:border-[#8b5a2b]/30 transition-colors shadow-sm">
                                                <span className="font-bold text-[#3d2c1e] text-sm uppercase tracking-tight">{label}</span>
                                                <Switch
                                                    checked={permissions.sidebar[key]}
                                                    onCheckedChange={() => togglePermission("sidebar", key)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="space-y-8">
                                    {/* Dashboard Section */}
                                    <section>
                                        <h3 className="text-[11px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-[#c9b896]/20 pb-2">
                                            <Edit className="h-4 w-4" /> WIDGETS TABLEAU DE BORD
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Object.entries({
                                                total_personnel: "Total Personnel",
                                                presence_actuelle: "Présence",
                                                en_retard: "En Retard",
                                                absences: "Absences",
                                                les_avances: "Les Avances",
                                                reste_a_payer: "Reste à Payer"
                                            }).map(([key, label]) => (
                                                <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#c9b896]/10 hover:border-[#8b5a2b]/30 transition-colors shadow-sm">
                                                    <span className="font-bold text-[#3d2c1e] text-xs uppercase">{label}</span>
                                                    <Switch
                                                        checked={permissions.dashboard[key]}
                                                        onCheckedChange={() => togglePermission("dashboard", key)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Payroll Stats */}
                                    <section>
                                        <h3 className="text-[11px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border-b border-[#c9b896]/20 pb-2">
                                            <Edit className="h-4 w-4" /> STATISTIQUES PAIE
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Object.entries({
                                                stats_total_base: "Salaires Base",
                                                stats_avances: "Total Avances",
                                                stats_net_global: "Net Global",
                                                stats_extras: "Total Extras",
                                                stats_doublages: "Doublages"
                                            }).map(([key, label]) => (
                                                <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#c9b896]/10 hover:border-[#8b5a2b]/30 transition-colors shadow-sm">
                                                    <span className="font-bold text-[#3d2c1e] text-xs uppercase">{label}</span>
                                                    <Switch
                                                        checked={permissions.payroll[key]}
                                                        onCheckedChange={() => togglePermission("payroll", key)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Actions & Columns Full Width Section */}
                            <section className="bg-[#f8f6f1]/50 p-6 rounded-2xl border border-[#c9b896]/20">
                                <h3 className="text-[11px] font-black text-[#8b5a2b] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 border-b border-[#c9b896]/20 pb-2">
                                    <Edit className="h-4 w-4" /> ACTIONS CRITIQUES & COLONNES TABLEAU
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <h4 className="lg:col-span-4 text-[9px] font-black text-[#8b5a2b] opacity-40 uppercase tracking-widest mt-2 mb-1">BOUTONS D'ACTION</h4>
                                    {Object.entries({
                                        action_extra: "Bouton Extra",
                                        action_doublage: "Bouton Doublage",
                                        action_rapport: "Bouton Rapport",
                                        add_employee: "Ajout Employé"
                                    }).map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#c9b896]/10 shadow-sm">
                                            <span className="font-bold text-[#3d2c1e] text-[11px] uppercase">{label}</span>
                                            <Switch
                                                checked={key === 'add_employee' ? permissions.employees.add_employee : permissions.payroll[key]}
                                                onCheckedChange={() => key === 'add_employee' ? togglePermission("employees", "add_employee") : togglePermission("payroll", key)}
                                            />
                                        </div>
                                    ))}

                                    <h4 className="lg:col-span-4 text-[9px] font-black text-[#8b5a2b] opacity-40 uppercase tracking-widest mt-4 mb-1">COLONNES DE PAIE</h4>
                                    {Object.entries({
                                        col_employee: "Employé",
                                        col_base: "Base",
                                        col_abs_days: "Abs",
                                        col_primes: "Primes",
                                        col_extra: "Extra",
                                        col_doublage: "Doubl",
                                        col_retenues: "Reten",
                                        col_avance: "Avance",
                                        col_net: "Net",
                                        col_action: "Payer",
                                        user_details_modal: "Détails"
                                    }).map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#c9b896]/10 shadow-sm">
                                            <span className="font-bold text-[#3d2c1e] text-[11px] uppercase">{label}</span>
                                            <Switch
                                                checked={permissions.payroll[key]}
                                                onCheckedChange={() => togglePermission("payroll", key)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 sticky bottom-0 bg-white border-t border-[#c9b896]/20 flex items-center justify-end shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white hover:opacity-90 shadow-lg px-8 py-6 h-auto font-black uppercase tracking-widest text-xs rounded-xl"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        TRAITEMENT...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        {isAddMode ? "CRÉER LE COMPTE" : "VALIDER LES DROITS"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
