"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RoleBadge } from "@/components/role-badge"
import { Search, UserPlus, Mail, Eye, Edit, X, Phone, CreditCard, Check, ChevronsUpDown, DollarSign, Camera, Upload, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotificationBell } from "@/components/notification-bell"
import { gql, useQuery, useMutation } from "@apollo/client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// Define query to fetch all users and their status
// Added base_salary to the query
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
        email
        phone
        cin
        base_salary
        photo
        cin_photo_front
        cin_photo_back
        is_blocked
        nbmonth
      }
      clockIn
      clockOut
      state
      shift
      is_blocked
      schedule {
        is_coupure
        p1_in
        p1_out
        p2_in
        p2_out
      }
    }
  }
`

const ADD_USER = gql`
  mutation AddUser($input: UserInput!) {
    addUser(input: $input) {
      id
      username
      departement
    }
  }
`

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UserInput!) {
    updateUser(id: $id, input: $input) {
      id
      username
      departement
    }
  }
`

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

const UPLOAD_CIN_CARD = gql`
  mutation UploadCinCard($userId: ID!, $cinPhotoFront: String, $cinPhotoBack: String) {
    uploadCinCard(userId: $userId, cinPhotoFront: $cinPhotoFront, cinPhotoBack: $cinPhotoBack) {
      id
      cin_photo_front
      cin_photo_back
    }
  }
`

const GET_CIN_CARD = gql`
  query GetCinCard($userId: ID!) {
    getCinCard(userId: $userId) {
      id
      cin_photo_front
      cin_photo_back
      uploaded_at
    }
  }
`

const TOGGLE_USER_BLOCK = gql`
  mutation ToggleUserBlock($userId: ID!, $isBlocked: Boolean!) {
    toggleUserBlock(userId: $userId, isBlocked: $isBlocked) {
      id
      is_blocked
    }
  }
`

const UPDATE_USER_SCHEDULE = gql`
  mutation UpdateUserSchedule($userId: ID!, $schedule: ScheduleInput!) {
    updateUserSchedule(userId: $userId, schedule: $schedule) {
      user_id
      is_coupure
      p1_in
      p1_out
      p2_in
      p2_out
    }
  }
`

import { getCurrentUser } from "@/lib/mock-data"

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#fcfaf8] font-black uppercase tracking-widest text-[#8b5a2b] animate-pulse">Chargement de l'annuaire...</div>}>
      <EmployeesContent />
    </Suspense>
  )
}

function EmployeesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [openCombobox, setOpenCombobox] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get("userId")

  const { data, loading, error, refetch } = useQuery(GET_ALL_EMPLOYEES, {
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: false,
  });

  const [addUser] = useMutation(ADD_USER);

  const currentUser = getCurrentUser();
  let permissions: any = {};
  if (currentUser?.permissions) {
    try { permissions = JSON.parse(currentUser.permissions) || {}; } catch (e) { }
  }

  const canAddEmployee = currentUser?.role === 'admin' || permissions?.employees?.add_employee !== false;

  const [updateUser] = useMutation(UPDATE_USER);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    zktecoId: "",
    department: "",
    role: "user",
    phone: "",
    cin: "",
    status: "IN" as "IN" | "OUT",
    baseSalary: "",
    photo: "",
    cinPhotoFront: "",
    cinPhotoBack: "",
    nbmonth: null as number | null,
    isCoupure: false,
    p1_in: "08:00",
    p1_out: "12:00",
    p2_in: "14:00",
    p2_out: "18:00",
  })

  const [showCinPhotoDialog, setShowCinPhotoDialog] = useState(false)
  const [cinPhotoToView, setCinPhotoToView] = useState("")

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [uploadCinCard] = useMutation(UPLOAD_CIN_CARD);
  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => {
      refetch();
      setShowDeleteConfirm(false);
      setShowEditDialog(false);
      setSelectedEmployee(null);
    }
  });

  const [toggleUserBlock] = useMutation(TOGGLE_USER_BLOCK, {
    onCompleted: () => refetch()
  });

  const [updateUserSchedule] = useMutation(UPDATE_USER_SCHEDULE);

  // Transform Data
  const employees = useMemo(() => {
    if (!data?.personnelStatus) return [];
    return data.personnelStatus.map((p: any) => ({
      id: p.user.id,
      name: p.user.username,
      email: p.user.email || `${p.user.username?.toLowerCase().replace(/ /g, '.')}@businessbey.com`,
      phone: p.user.phone || "",
      cin: p.user.cin || "",
      department: p.user.departement || "Non assigné",
      role: p.user.role || "user",
      zktecoId: p.user.zktime_id?.toString() || "",
      status: p.state === "Avec Pointage" ? "IN" : "OUT",
      baseSalary: p.user.base_salary || 0,
      photo: p.user.photo || "",
      cinPhotoFront: p.user.cin_photo_front || "",
      cinPhotoBack: p.user.cin_photo_back || "",
      is_blocked: !!p.user.is_blocked,
      nbmonth: p.user.nbmonth || null,
      managerId: null,
      isCoupure: p.schedule?.is_coupure || false,
      p1_in: p.schedule?.p1_in || "08:00",
      p1_out: p.schedule?.p1_out || "12:00",
      p2_in: p.schedule?.p2_in || "14:00",
      p2_out: p.schedule?.p2_out || "18:00",
    }));
  }, [data]);

  // Handle auto-scroll to user from notification
  useEffect(() => {
    if (!userIdParam || employees.length === 0) return;

    // 1. Open profile if found
    const targetUser = employees.find((e: any) => e.id === userIdParam);
    if (targetUser) {
      setSelectedEmployee(targetUser);
      setShowProfileDialog(true);
    }

    // 2. Clear filters
    if (searchQuery) setSearchQuery("");
    if (selectedDepartment !== "all") setSelectedDepartment("all");

    // 3. Poll for the card to scroll to
    let attempts = 0;
    const interval = setInterval(() => {
      const element = document.getElementById(`employee-card-${userIdParam}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-8', 'ring-[#8b5a2b]/40', 'ring-offset-4', 'transition-all', 'duration-500', 'z-20', 'relative');
        setTimeout(() => {
          element.classList.remove('ring-8', 'ring-[#8b5a2b]/40', 'ring-offset-4');
        }, 5000);
        clearInterval(interval);
      }
      if (attempts++ > 20) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [userIdParam, employees.length > 0]);

  const filteredEmployees = employees.filter((employee: any) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment

    return matchesSearch && matchesDepartment
  })

  const uniqueDepartments = useMemo(() => {
    const fromEmployees = employees.map((e: any) => e.department).filter(Boolean);
    const defaults = ["Cuisine", "Caisse"];
    return Array.from(new Set([...defaults, ...fromEmployees]));
  }, [employees]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      zktecoId: "",
      department: "",
      role: "user",
      phone: "",
      cin: "",
      status: "IN",
      baseSalary: "",
      photo: "",
      cinPhotoFront: "",
      cinPhotoBack: "",
      nbmonth: null,
      isCoupure: false,
      p1_in: "08:00",
      p1_out: "12:00",
      p2_in: "14:00",
      p2_out: "18:00",
    })
  }

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCinFrontFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("L'image est trop grande (max 10Mo)")
        return
      }
      try {
        const compressed = await compressImage(file, 1600, 0.8);
        setFormData({ ...formData, cinPhotoFront: compressed })
      } catch (e) {
        console.error("Compression error:", e);
        // Fallback to original if compression fails
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData({ ...formData, cinPhotoFront: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleCinBackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("L'image est trop grande (max 10Mo)")
        return
      }
      try {
        const compressed = await compressImage(file, 1600, 0.8);
        setFormData({ ...formData, cinPhotoBack: compressed })
      } catch (e) {
        console.error("Compression error:", e);
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData({ ...formData, cinPhotoBack: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("L'image est trop grande (max 10Mo)")
        return
      }
      try {
        const compressed = await compressImage(file, 800, 0.7); // Smaller for profile photo
        setFormData({ ...formData, photo: compressed })
      } catch (e) {
        console.error("Compression error:", e);
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData({ ...formData, photo: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleAddEmployee = async () => {
    setIsSaving(true);
    try {
      const res = await addUser({
        variables: {
          input: {
            username: formData.name,
            email: formData.email,
            phone: formData.phone,
            cin: formData.cin,
            departement: formData.department,
            role: formData.role,
            zktime_id: formData.zktecoId ? parseInt(formData.zktecoId) : null,
            status: formData.status,
            base_salary: formData.baseSalary ? parseFloat(formData.baseSalary) : 0,
            photo: formData.photo,
            nbmonth: formData.nbmonth
          }
        }
      });

      const newUserId = res.data?.addUser?.id;

      if (newUserId && (formData.cinPhotoFront || formData.cinPhotoBack)) {
        await uploadCinCard({
          variables: {
            userId: newUserId,
            cinPhotoFront: formData.cinPhotoFront || null,
            cinPhotoBack: formData.cinPhotoBack || null
          }
        });
      }

      // Save Coupure timing if needed
      if (newUserId) {
        await updateUserSchedule({
          variables: {
            userId: newUserId,
            schedule: {
              is_coupure: formData.isCoupure,
              p1_in: formData.p1_in,
              p1_out: formData.p1_out,
              p2_in: formData.p2_in,
              p2_out: formData.p2_out
            }
          }
        });
      }

      setShowAddDialog(false)
      resetForm()
      await refetch()
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la création")
    } finally {
      setIsSaving(false);
    }
  }

  const handleEditClick = (employee: any) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      zktecoId: employee.zktecoId,
      department: employee.department,
      role: employee.role,
      phone: employee.phone || "",
      cin: employee.cin || "",
      status: employee.status || "IN",
      baseSalary: employee.baseSalary?.toString() || "",
      photo: employee.photo || "",
      cinPhotoFront: employee.cinPhotoFront || "",
      cinPhotoBack: employee.cinPhotoBack || "",
      nbmonth: employee.nbmonth || null,
      isCoupure: employee.isCoupure || false,
      p1_in: employee.p1_in || "08:00",
      p1_out: employee.p1_out || "12:00",
      p2_in: employee.p2_in || "14:00",
      p2_out: employee.p2_out || "18:00",
    })
    setShowEditDialog(true)
  }

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      await updateUser({
        variables: {
          id: selectedEmployee.id,
          input: {
            username: formData.name,
            email: formData.email,
            phone: formData.phone,
            cin: formData.cin,
            departement: formData.department,
            role: formData.role,
            zktime_id: formData.zktecoId ? parseInt(formData.zktecoId) : null,
            status: formData.status,
            base_salary: formData.baseSalary ? parseFloat(formData.baseSalary) : 0,
            photo: formData.photo,
            nbmonth: formData.nbmonth
          }
        }
      })

      // Upload CIN photos if provided
      if (formData.cinPhotoFront || formData.cinPhotoBack) {
        await uploadCinCard({
          variables: {
            userId: selectedEmployee.id,
            cinPhotoFront: formData.cinPhotoFront || null,
            cinPhotoBack: formData.cinPhotoBack || null
          }
        });
      }

      // Update Schedule
      await updateUserSchedule({
        variables: {
          userId: selectedEmployee.id,
          schedule: {
            is_coupure: formData.isCoupure,
            p1_in: formData.p1_in,
            p1_out: formData.p1_out,
            p2_in: formData.p2_in,
            p2_out: formData.p2_out
          }
        }
      });

      setShowEditDialog(false)
      setSelectedEmployee(null)
      resetForm()
      await refetch()
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la modification")
    } finally {
      setIsSaving(false);
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedEmployee) return;
    try {
      await deleteUser({
        variables: { id: selectedEmployee.id }
      });
      // The onCompleted callback in useMutation handles the rest (refetch, closing dialogs)
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression de l'employé");
    }
  }

  const handleViewProfile = (employee: any) => {
    setSelectedEmployee(employee)
    setShowProfileDialog(true)
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#f8f6f1]">Chargement des employés...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#f8f6f1]">Erreur de chargement</div>;

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        {/* Header Section */}
        <div className="border-b border-[#c9b896]/30 bg-white/95 backdrop-blur-md sticky top-0 z-10">
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#3d2c1e]">
                  Employés
                </h1>
                <p className="mt-1 sm:mt-2 text-base sm:text-lg md:text-xl text-[#8b5a2b]">
                  Gérez votre équipe avec efficacité
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <NotificationBell />
                {canAddEmployee && (
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-[#8b5a2b] hover:bg-[#6b4521] text-white shadow-lg shadow-[#8b5a2b]/20 transition-all hover:scale-[1.02] h-14 sm:h-16 text-base sm:text-lg md:text-xl px-6 sm:px-8 flex-1 lg:flex-initial"
                  >
                    <UserPlus className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                    Ajouter un Employé
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
          <div className="mb-6 sm:mb-8 lg:mb-10 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 sm:left-5 top-1/2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 -translate-y-1/2 text-[#8b5a2b]/60" />
              <Input
                placeholder="Rechercher par nom, email ou département..."
                className="bg-white border-0 shadow-md pl-12 sm:pl-14 md:pl-16 h-14 sm:h-16 md:h-18 text-base sm:text-lg md:text-xl ring-1 ring-[#c9b896]/30 focus-visible:ring-[#8b5a2b] rounded-xl sm:rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-[250px] bg-white border-0 shadow-md h-14 sm:h-16 md:h-18 text-base sm:text-lg ring-1 ring-[#c9b896]/30 focus:ring-[#8b5a2b] rounded-xl sm:rounded-2xl">
                <SelectValue placeholder="Filtrer par département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base sm:text-lg py-3">Tous les départements</SelectItem>
                {uniqueDepartments.map((dept: string) => (
                  <SelectItem key={dept} value={dept} className="text-base sm:text-lg py-3">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
            {filteredEmployees.map((employee: any) => (
              <Card
                key={employee.id}
                id={`employee-card-${employee.id}`}
                className="group relative border-0 bg-white shadow-md hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-[#c9b896]/20"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#8b5a2b] to-[#c9b896] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="p-5 sm:p-6 md:p-8 flex flex-col h-full">
                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 flex-shrink-0 rounded-full bg-[#f8f6f1] border-2 border-[#c9b896]/30 flex items-center justify-center text-[#8b5a2b] font-bold text-xl sm:text-2xl md:text-3xl shadow-inner overflow-hidden">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                        ) : (
                          employee.name?.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={cn(
                            "font-bold text-[#3d2c1e] text-lg sm:text-xl md:text-2xl line-clamp-1",
                            employee.is_blocked && "line-through opacity-50"
                          )}
                          title={employee.name}
                        >
                          {employee.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base md:text-lg text-[#8b5a2b] font-medium mt-0.5">
                            {employee.department}
                          </p>
                          {employee.is_blocked && (
                            <span className="text-[10px] uppercase font-bold bg-black text-white px-1.5 py-0.5 rounded leading-none">
                              Bloqué
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <RoleBadge role={employee.role} />
                      <div className="flex items-center gap-2 bg-[#f8f6f1] p-1.5 rounded-full border border-[#c9b896]/20 shadow-sm">
                        <span className="text-[10px] font-bold text-[#8b5a2b] pl-1 uppercase tracking-tight">Accès</span>
                        <Switch
                          checked={!employee.is_blocked}
                          onCheckedChange={(checked) => {
                            if (confirm(`Voulez-vous ${checked ? 'débloquer' : 'bloquer'} l'employé ${employee.name} ?`)) {
                              toggleUserBlock({
                                variables: {
                                  userId: employee.id,
                                  isBlocked: !checked
                                }
                              });
                            }
                          }}
                          className="data-[state=checked]:bg-[#34c759] data-[state=unchecked]:bg-[#8e8e93]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div className="space-y-3 sm:space-y-4 flex-grow">
                    <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base md:text-lg text-[#6b5744] bg-[#f8f6f1]/70 p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b5a2b] flex-shrink-0" />
                      <span className="truncate flex-1" title={employee.email}>
                        {employee.email}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-[#6b5744] bg-[#f8f6f1]/70 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b5a2b] flex-shrink-0" />
                        {employee.phone ? (
                          <a href={`tel:${employee.phone}`} className="hover:text-[#8b5a2b] truncate transition-colors">
                            {employee.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-[#6b5744] bg-[#f8f6f1]/70 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b5a2b] flex-shrink-0" />
                        <span className="truncate">{employee.cin || "--"}</span>
                      </div>
                    </div>

                    {/* Base Salary Infos */}
                    <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-[#6b5744] bg-[#f8f6f1]/70 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[#8b5a2b] flex-shrink-0" />
                      <span className="truncate font-medium">
                        Salaire: {(currentUser?.role === 'admin' || permissions.employees?.view_salary)
                          ? (employee.baseSalary > 0
                            ? `${employee.baseSalary.toLocaleString('fr-FR')} TND`
                            : "Non défini")
                          : "******"
                        }
                      </span>
                    </div>


                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-2 sm:pt-4">
                      <div
                        className={`px-4 sm:px-5 py-2 sm:py-3 rounded-full text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2 sm:gap-3 ${employee.status === "IN"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-rose-100 text-rose-700 border border-rose-200"
                          }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${employee.status === "IN" ? "bg-emerald-500" : "bg-rose-500"}`}
                        />
                        {employee.status === "IN" ? "Présent" : "Absent"}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 sm:mt-6 flex gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-[#c9b896]/20">
                    <Button
                      variant="ghost"
                      onClick={() => handleViewProfile(employee)}
                      className="flex-1 text-[#6b5744] hover:text-[#8b5a2b] hover:bg-[#f8f6f1] h-12 sm:h-14 text-sm sm:text-base md:text-lg"
                      disabled={employee.is_blocked}
                    >
                      <Eye className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Profil
                    </Button>
                    <div className="w-px bg-[#c9b896]/30" />
                    <Button
                      variant="ghost"
                      onClick={() => handleEditClick(employee)}
                      className="flex-1 text-[#6b5744] hover:text-[#8b5a2b] hover:bg-[#f8f6f1] h-12 sm:h-14 text-sm sm:text-base md:text-lg"
                    >
                      <Edit className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Modifier
                    </Button>
                  </div>
                </div>
                {employee.is_blocked && (
                  <div className="absolute inset-0 bg-black/5 pointer-events-none backdrop-grayscale-[0.5]" />
                )}
                {employee.is_blocked && (
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/40 -rotate-12 pointer-events-none" />
                )}
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredEmployees.length === 0 && (
            <div className="text-center py-16 sm:py-20 md:py-28 bg-white rounded-2xl border border-dashed border-[#c9b896]/50">
              <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 bg-[#f8f6f1] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Search className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-[#8b5a2b]/40" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-medium text-[#3d2c1e] mb-2">Aucun employé trouvé</h3>
              <p className="text-base sm:text-lg md:text-xl text-[#6b5744]">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setShowEditDialog(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="bg-white border-0 shadow-2xl w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] p-0 overflow-hidden gap-0 rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-5 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8 bg-[#f8f6f1] border-b border-[#c9b896]/20">
            <DialogTitle className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl md:text-3xl font-bold text-[#3d2c1e] flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-lg sm:rounded-xl bg-[#8b5a2b] flex items-center justify-center text-white">
                {showAddDialog ? (
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                ) : (
                  <Edit className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                )}
              </div>
              {showAddDialog ? "Ajouter un Employé" : "Modifier l'Employé"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="sm:col-span-2 flex flex-col items-center justify-center mb-6">
                <div className="relative group">
                  <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-[#f8f6f1] border-2 border-[#c9b896]/30 flex items-center justify-center text-[#8b5a2b] font-bold text-3xl shadow-inner overflow-hidden">
                    {formData.photo ? (
                      <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-10 w-10 opacity-20" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 h-10 w-10 bg-[#8b5a2b] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#6b4521] transition-colors border-2 border-white">
                    <Upload className="h-5 w-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="mt-2 text-xs font-medium text-[#8b5a2b] uppercase tracking-wider">Photo de profil</p>
              </div>

              {/* CIN Photos Upload - Front and Back */}
              <div className="sm:col-span-2">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#8b5a2b] mb-4 text-center">
                  Photos de la CIN (Recto & Verso)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front */}
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="h-40 w-64 rounded-lg bg-[#f8f6f1] border-2 border-[#c9b896]/30 flex items-center justify-center text-[#8b5a2b] font-bold shadow-inner overflow-hidden">
                        {formData.cinPhotoFront ? (
                          <img
                            src={formData.cinPhotoFront}
                            alt="CIN Recto"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setCinPhotoToView(formData.cinPhotoFront)
                              setShowCinPhotoDialog(true)
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <CreditCard className="h-12 w-12 mx-auto opacity-20 mb-2" />
                            <p className="text-xs opacity-50">Recto</p>
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-2 right-2 h-10 w-10 bg-[#8b5a2b] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#6b4521] transition-colors border-2 border-white">
                        <Upload className="h-5 w-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleCinFrontFileChange} />
                      </label>
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#8b5a2b] uppercase tracking-wider">Recto (Face)</p>
                  </div>

                  {/* Back */}
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <div className="h-40 w-64 rounded-lg bg-[#f8f6f1] border-2 border-[#c9b896]/30 flex items-center justify-center text-[#8b5a2b] font-bold shadow-inner overflow-hidden">
                        {formData.cinPhotoBack ? (
                          <img
                            src={formData.cinPhotoBack}
                            alt="CIN Verso"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setCinPhotoToView(formData.cinPhotoBack)
                              setShowCinPhotoDialog(true)
                            }}
                          />
                        ) : (
                          <div className="text-center">
                            <CreditCard className="h-12 w-12 mx-auto opacity-20 mb-2" />
                            <p className="text-xs opacity-50">Verso</p>
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-2 right-2 h-10 w-10 bg-[#8b5a2b] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-[#6b4521] transition-colors border-2 border-white">
                        <Upload className="h-5 w-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleCinBackFileChange} />
                      </label>
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#8b5a2b] uppercase tracking-wider">Verso (Dos)</p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#8b5a2b]">
                  Information Personnelle
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Nom complet</label>
                <Input
                  placeholder="Ex: Jean Dupont"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Email professionnel</label>
                <Input
                  type="email"
                  placeholder="jean@businessbey.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Téléphone</label>
                <Input
                  placeholder="Ex: 20 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">CIN</label>
                <Input
                  placeholder="Numéro de carte d'identité"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                />
              </div>

              <div className="sm:col-span-2 mt-2">
                <label className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#8b5a2b]">
                  Information Professionnelle
                </label>
              </div>

              <div className="space-y-2 flex flex-col">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Département</label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="justify-between w-full h-12 sm:h-14 text-base sm:text-lg border-[#c9b896]/30 bg-white font-normal hover:bg-white"
                    >
                      {formData.department
                        ? formData.department
                        : "Sélectionner un département..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher ou créer..." onValueChange={setSearchValue} />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2">
                            <p className="text-sm text-gray-500 mb-2">Aucun département trouvé.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-left text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => {
                                setFormData({ ...formData, department: searchValue })
                                setOpenCombobox(false)
                              }}
                            >
                              Créer "{searchValue}"
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {uniqueDepartments.map((dept) => (
                            <CommandItem
                              key={dept}
                              value={dept}
                              onSelect={(currentValue) => {
                                setFormData({ ...formData, department: dept }) // Use dept not currentValue (lowercased)
                                setOpenCombobox(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.department === dept ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {dept}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Rôle</label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-white border-[#c9b896]/30 h-12 sm:h-14 text-base sm:text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user" className="text-base sm:text-lg py-3">
                      Employé
                    </SelectItem>
                    <SelectItem value="manager" className="text-base sm:text-lg py-3">
                      Manager
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">ID ZKTeco</label>
                <Input
                  placeholder="Identifiant pointeuse"
                  value={formData.zktecoId}
                  onChange={(e) => setFormData({ ...formData, zktecoId: e.target.value })}
                  className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base sm:text-lg font-medium text-[#3d2c1e]">Salaire de base (TND)</label>
                {(currentUser?.role === 'admin' || permissions.employees?.view_salary) ? (
                  <Input
                    type="number"
                    placeholder="Ex: 1200.00"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    className="bg-white border-[#c9b896]/30 focus:border-[#8b5a2b] h-12 sm:h-14 text-base sm:text-lg"
                  />
                ) : (
                  <Input
                    type="text"
                    value="******"
                    disabled
                    className="bg-gray-100 border-[#c9b896]/30 h-12 sm:h-14 text-base sm:text-lg cursor-not-allowed"
                  />
                )}
              </div>

            </div>

            <div className="sm:col-span-2 pt-6 mt-4 border-t border-[#c9b896]/20">
              <label className="text-base sm:text-lg font-bold text-[#3d2c1e] mb-4 block">Mode de Pointage</label>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, isCoupure: false })}
                  className={cn(
                    "h-14 rounded-xl text-base font-bold transition-all border-2",
                    !formData.isCoupure
                      ? "bg-[#8b5a2b] text-white border-[#8b5a2b] shadow-lg scale-[1.02]"
                      : "bg-white text-[#8b5a2b] border-[#c9b896]/30 hover:bg-[#8b5a2b]/5"
                  )}
                >
                  Mode Normal
                </Button>
                <Button
                  type="button"
                  onClick={() => setFormData({ ...formData, isCoupure: true })}
                  className={cn(
                    "h-14 rounded-xl text-base font-bold transition-all border-2",
                    formData.isCoupure
                      ? "bg-[#8b5a2b] text-white border-[#8b5a2b] shadow-lg scale-[1.02]"
                      : "bg-white text-[#8b5a2b] border-[#c9b896]/30 hover:bg-[#8b5a2b]/5"
                  )}
                >
                  Mode Coupure
                </Button>
              </div>

              {formData.isCoupure && (
                <div className="bg-[#8b5a2b]/5 p-6 rounded-2xl border border-[#8b5a2b]/10 animate-in fade-in slide-in-from-top-4 duration-500">
                  <p className="text-sm font-bold text-[#8b5a2b] mb-4 uppercase tracking-wider">Configuration des 4 pointages</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3d2c1e]">Début P1</label>
                      <Input
                        type="time"
                        value={formData.p1_in}
                        onChange={(e) => setFormData({ ...formData, p1_in: e.target.value })}
                        className="bg-white border-[#c9b896]/30 h-11 text-base font-medium focus:ring-[#8b5a2b]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3d2c1e]">Pause</label>
                      <Input
                        type="time"
                        value={formData.p1_out}
                        onChange={(e) => setFormData({ ...formData, p1_out: e.target.value })}
                        className="bg-white border-[#c9b896]/30 h-11 text-base font-medium focus:ring-[#8b5a2b]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3d2c1e]">Retour</label>
                      <Input
                        type="time"
                        value={formData.p2_in}
                        onChange={(e) => setFormData({ ...formData, p2_in: e.target.value })}
                        className="bg-white border-[#c9b896]/30 h-11 text-base font-medium focus:ring-[#8b5a2b]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-[#3d2c1e]">Fin P2</label>
                      <Input
                        type="time"
                        value={formData.p2_out}
                        onChange={(e) => setFormData({ ...formData, p2_out: e.target.value })}
                        className="bg-white border-[#c9b896]/30 h-11 text-base font-medium focus:ring-[#8b5a2b]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-5 sm:p-6 md:p-8 bg-[#f8f6f1] border-t border-[#c9b896]/20">
            <div className="flex flex-col-reverse sm:flex-row w-full items-center justify-between gap-4">
              {/* Delete Button (Only in Edit Mode) */}
              {!showAddDialog && (
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 sm:h-12 px-4 w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Supprimer l'employé
                </Button>
              )}

              <div className="flex flex-col sm:flex-row flex-1 justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false)
                    setShowEditDialog(false)
                    resetForm()
                  }}
                  className="border-[#c9b896]/50 text-[#6b5744] hover:bg-white h-10 sm:h-12 text-base w-full sm:w-auto"
                >
                  Annuler
                </Button>
                <Button
                  onClick={showAddDialog ? handleAddEmployee : handleUpdateEmployee}
                  className="bg-[#8b5a2b] hover:bg-[#6b4521] text-white shadow-md h-10 sm:h-12 text-base w-full sm:w-auto sm:min-w-[160px] flex items-center justify-center"
                  disabled={!formData.name || !formData.email || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    showAddDialog ? "Créer le profil" : "Enregistrer"
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="bg-white border-0 shadow-2xl w-[95vw] max-w-[95vw] sm:max-w-[500px] md:max-w-[600px] p-0 overflow-hidden rounded-xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-br from-[#8b5a2b] to-[#6b4521] p-6 sm:p-8 md:p-10 pb-16 sm:pb-18 md:pb-20 text-white relative">
            <button
              onClick={() => setShowProfileDialog(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 bg-white/20 p-2 sm:p-2.5 rounded-full hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] opacity-90">
              Profil Employé
            </DialogTitle>
            <p className="text-[#c9b896] text-base sm:text-lg md:text-xl mt-1 sm:mt-2">Détails et informations</p>
          </div>

          <div className="px-5 sm:px-6 md:px-8 pb-6 sm:pb-8 relative">
            {selectedEmployee && (
              <>
                <div className="absolute -top-10 sm:-top-12 md:-top-14 left-5 sm:left-6 md:left-8 h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-xl sm:rounded-2xl bg-white p-1 shadow-lg transform rotate-3 overflow-hidden">
                  <div className="w-full h-full bg-[#f8f6f1] rounded-lg sm:rounded-xl flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold text-[#8b5a2b] overflow-hidden relative">
                    {selectedEmployee.photo ? (
                      <img src={selectedEmployee.photo} alt={selectedEmployee.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedEmployee.name.charAt(0)
                    )}
                    {selectedEmployee.is_blocked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-[10px] sm:text-xs font-bold uppercase rotate-[-30deg]">Bloqué</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-14 sm:mt-16 md:mt-20 space-y-6 sm:space-y-8">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div>
                      <h3 className={cn(
                        "text-xl sm:text-2xl md:text-3xl font-bold text-[#3d2c1e]",
                        selectedEmployee.is_blocked && "line-through opacity-50"
                      )}>
                        {selectedEmployee.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                        <span className="text-sm sm:text-base font-medium text-[#8b5a2b] bg-[#8b5a2b]/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded">
                          {selectedEmployee.department}
                        </span>
                        <RoleBadge role={selectedEmployee.role} />
                        <div
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-bold border ${selectedEmployee.status === "IN"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {selectedEmployee.status === "IN" ? "PRÉSENT" : "ABSENT"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-[#f8f6f1]/70 p-4 sm:p-5 rounded-xl border border-[#c9b896]/20">
                      <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider mb-1 sm:mb-2">Email</p>
                      <p
                        className="text-sm sm:text-base md:text-lg font-medium text-[#3d2c1e] truncate"
                        title={selectedEmployee.email}
                      >
                        {selectedEmployee.email}
                      </p>
                    </div>
                    <div className="bg-[#f8f6f1]/70 p-4 sm:p-5 rounded-xl border border-[#c9b896]/20">
                      <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider mb-1 sm:mb-2">
                        Téléphone
                      </p>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-[#3d2c1e]">
                        {selectedEmployee.phone || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#f8f6f1]/70 p-4 sm:p-5 rounded-xl border border-[#c9b896]/20">
                      <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider mb-1 sm:mb-2">CIN</p>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-[#3d2c1e]">
                        {selectedEmployee.cin || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#f8f6f1]/70 p-4 sm:p-5 rounded-xl border border-[#c9b896]/20">
                      <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider mb-1 sm:mb-2">
                        ZKTeco ID
                      </p>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-[#3d2c1e]">
                        {selectedEmployee.zktecoId || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#f8f6f1]/70 p-4 sm:p-5 rounded-xl border border-[#c9b896]/20 sm:col-span-2">
                      <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider mb-1 sm:mb-2">
                        Salaire de base
                      </p>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-[#3d2c1e]">
                        {selectedEmployee.baseSalary > 0
                          ? `${selectedEmployee.baseSalary.toLocaleString('fr-FR')} TND`
                          : "Non défini"
                        }
                      </p>
                    </div>

                    {(selectedEmployee.cinPhotoFront || selectedEmployee.cinPhotoBack) && (
                      <div className="sm:col-span-2 space-y-3 sm:space-y-4 pt-2">
                        <p className="text-xs sm:text-sm text-[#6b5744] uppercase tracking-wider">Documents CIN</p>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          {selectedEmployee.cinPhotoFront && (
                            <div className="flex flex-col gap-2">
                              <div className="h-28 sm:h-32 md:h-36 rounded-lg bg-white border border-[#c9b896]/30 overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => {
                                  setCinPhotoToView(selectedEmployee.cinPhotoFront)
                                  setShowCinPhotoDialog(true)
                                }}
                              >
                                <img src={selectedEmployee.cinPhotoFront} className="w-full h-full object-cover" alt="CIN Front" />
                              </div>
                              <span className="text-[10px] sm:text-xs text-center font-bold text-[#8b5a2b]/60 uppercase tracking-tight">Recto (Face)</span>
                            </div>
                          )}
                          {selectedEmployee.cinPhotoBack && (
                            <div className="flex flex-col gap-2">
                              <div className="h-28 sm:h-32 md:h-36 rounded-lg bg-white border border-[#c9b896]/30 overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => {
                                  setCinPhotoToView(selectedEmployee.cinPhotoBack)
                                  setShowCinPhotoDialog(true)
                                }}
                              >
                                <img src={selectedEmployee.cinPhotoBack} className="w-full h-full object-cover" alt="CIN Back" />
                              </div>
                              <span className="text-[10px] sm:text-xs text-center font-bold text-[#8b5a2b]/60 uppercase tracking-tight">Verso (Dos)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedEmployee.managerId && (
                    <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-[#8b5a2b]/5 border border-[#8b5a2b]/10">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#8b5a2b]/10 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-[#8b5a2b]" />
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-medium text-[#8b5a2b]">Manager Responsable</p>
                        <p className="text-base sm:text-lg font-bold text-[#3d2c1e]">
                          {/* Manager lookup needs to be adapted for GQL data */}
                          Non assigné
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {selectedEmployee.is_blocked && (
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/60 z-20 -rotate-12 pointer-events-none" />
                )}
              </>
            )}

            <DialogFooter className="mt-6 sm:mt-8">
              <Button
                onClick={() => setShowProfileDialog(false)}
                className="w-full bg-[#3d2c1e] text-white hover:bg-black h-12 sm:h-14 text-base sm:text-lg"
                size="lg"
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white border-red-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Confirmation de suppression
            </DialogTitle>
            <DialogDescription className="text-base text-[#6b5744] pt-2">
              Attention : Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-[#3d2c1e]">
            <p>Êtes-vous sûr de vouloir supprimer définitivement l'employé <strong>{selectedEmployee?.username}</strong> ?</p>
            <p className="mt-2 text-sm text-red-500 font-medium">
              Cette action supprimera également :
            </p>
            <ul className="list-disc pl-5 mt-1 text-sm text-[#6b5744] space-y-1">
              <li>Les données personnelles et photos</li>
              <li>L'historique des fiches de paie et avances</li>
              <li>Les données de présence, retards et absences</li>
              <li>Les plannings et horaires</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-[#c9b896] text-[#3d2c1e]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CIN View Dialog */}
      <Dialog open={showCinPhotoDialog} onOpenChange={setShowCinPhotoDialog}>
        <DialogContent className="bg-transparent border-0 shadow-none max-w-4xl w-full p-0 flex items-center justify-center">
          <div className="relative bg-white p-2 rounded-lg shadow-2xl">
            <button
              onClick={() => setShowCinPhotoDialog(false)}
              className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-100 shadow-lg z-50 border border-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
            {cinPhotoToView && (
              <img
                src={cinPhotoToView}
                alt="CIN Full View"
                className="max-h-[85vh] max-w-full rounded object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}