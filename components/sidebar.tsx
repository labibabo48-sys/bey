"use client"

import { Home, Users, Clock, DollarSign, Calendar, Settings, LogOut, BarChart3, Menu, X, BookOpen, FileText, XCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getCurrentUser, mockUsers, setCurrentUser } from "@/lib/mock-data"
import { useEffect, useState } from "react"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(getCurrentUser() || {})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    const handleUserChange = () => {
      const u = getCurrentUser();
      setUser(u || {});

      if (u?.permissions) {
        try {
          setPermissions(JSON.parse(u.permissions) || {});
        } catch (e) { setPermissions({}) }
      } else {
        setPermissions({})
      }
    }
    window.addEventListener("userChanged", handleUserChange)

    // Initial load
    handleUserChange()

    return () => window.removeEventListener("userChanged", handleUserChange)
  }, [])

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: Home, roles: ["admin", "manager", "user"], permKey: "dashboard" },
    { name: "Présences", href: "/attendance", icon: Clock, roles: ["admin", "manager", "user"], permKey: "attendance" },
    { name: "Employés", href: "/employees", icon: Users, roles: ["admin", "manager"], permKey: "employees" },
    { name: "Calendrier", href: "/calendar", icon: Calendar, roles: ["admin", "manager", "user"], permKey: "calendar" },
    { name: "Paie", href: "/payroll", icon: DollarSign, roles: ["admin", "manager"], permKey: "payroll" },
    { name: "Fiche de Paie", href: "/payroll/fiche", icon: FileText, roles: ["admin", "manager"], permKey: "fiche_payroll" },
    { name: "Reclamations", href: "/notebook", icon: BookOpen, roles: ["admin", "manager"], permKey: "notebook" },
    { name: "Chiffres de Paie", href: "/finance", icon: BarChart3, roles: ["admin", "manager"], permKey: "finance" },
    { name: "Avances", href: "/advances", icon: BarChart3, roles: ["admin", "manager", "user"], permKey: "advances" },

    // Admin only - no dynamic permission needed (or hardcoded true)
    { name: "Gestion Accès", href: "/management", icon: Users, roles: ["admin"] },
    { name: "Paramètres", href: "/settings", icon: Settings, roles: ["admin", "manager", "user"] },
  ]

  const filteredNav = navigation.filter((item) => {
    // 1. Role Check
    const hasRole = item.roles.includes(user?.role || "user");
    if (!hasRole) return false;

    // 2. Permission Check (if applicable)
    // For managers/users/admins, check dynamic permissions if permKey exists
    if (item.permKey) {
      // Default to true if no permission object exists yet? 
      // Request implies we need to control visibility.
      // Let's assume safely: if permissions exist, check them. If not, default to true (backward compat) OR false?
      // Given the request "make sidebar can see it or not", likely default to TRUE until configured.

      if (!permissions || !permissions.sidebar) return true; // No config found, show all
      return permissions.sidebar[item.permKey] !== false; // Show unless explicitly set to false
    }

    return true;
  })

  const handleLogout = () => {
    setCurrentUser(null)
    router.push("/login")
  }

  const handleNavClick = () => {
    setIsMobileMenuOpen(false)
  }

  const currentPage = navigation.find((item) => {
    if (item.href === "/") return pathname === "/"
    if (item.href === "/calendar" && pathname.startsWith("/schedule")) return true
    return pathname.startsWith(item.href)
  }) || (pathname === "/retards" ? { name: "Retards" } : pathname === "/absents" ? { name: "Absents" } : null)

  const currentPageName = currentPage?.name || ""

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex h-20 items-center justify-between border-b border-[#c9b896] bg-white px-6 lg:hidden print:hidden">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/images/logo.jpeg" alt="Business Bey Logo" width={48} height={48} className="rounded-full" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-heading)] text-base font-bold text-[#3d2c1e]">
                {currentPageName}
              </span>
            </div>
            <span className="text-xs text-[#8b5a2b] font-medium uppercase tracking-wider">Business Bey <span className="text-[10px] opacity-50">l'aouina</span></span>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="rounded-lg p-3 text-[#8b5a2b] hover:bg-[#f8f6f1]"
        >
          {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 sm:w-80 flex-col bg-white border-r border-[#e8e0d5]/50 shadow-sm transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-96 print:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo Header */}
        <div className="border-b border-[#e8e0d5]/50 p-8 lg:p-10">
          <Link href="/" className="flex items-center gap-5 hover:opacity-80 transition-opacity">
            <div className="relative h-16 w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] p-0.5 shadow-lg">
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/logo.jpeg"
                  alt="Business Bey Logo"
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-heading)] text-xl lg:text-3xl font-bold text-[#8b5a2b]">
                Business Bey
              </span>
              <span className="text-sm lg:text-base text-[#a0522d] font-medium">l'aouina</span>
            </div>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="border-b border-[#e8e0d5]/50 p-8 lg:p-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 lg:h-20 lg:w-20 flex-shrink-0 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] shadow-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base lg:text-lg font-semibold text-[#3d2c1e]">{user.name}</p>
              <p className="text-sm lg:text-base text-[#8b5a2b] font-medium">
                {user.role === "admin" ? "Administrateur" : user.role === "manager" ? "Gérant" : "Employé"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-3">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href === "/calendar" && pathname.startsWith("/schedule"))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "group flex items-center gap-5 rounded-xl px-5 py-4 lg:py-5 text-base lg:text-lg font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white shadow-lg scale-[1.02]"
                    : "text-[#3d2c1e] hover:bg-[#f8f6f1] hover:text-[#8b5a2b]",
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 lg:h-7 lg:w-7 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-[#8b5a2b]",
                  )}
                />
                <span className={cn(isActive && "font-semibold")}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-[#e8e0d5]/50 p-6 lg:p-8">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-4 rounded-xl px-5 py-4 lg:py-5 text-base lg:text-lg font-medium text-[#8b5a2b] hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 transition-all border border-[#c9b896] hover:border-red-300 hover:shadow-md"
          >
            <LogOut className="h-6 w-6 lg:h-7 lg:w-7" />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}
