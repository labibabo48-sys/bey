"use client"

import { Home, Users, Clock, DollarSign, Calendar, Settings, LogOut, BarChart3, Menu, X, BookOpen, FileText, XCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getCurrentUser, mockUsers, setCurrentUser } from "@/lib/mock-data"
import { useEffect, useState } from "react"
import { ChevronsLeft, ChevronsRight } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(getCurrentUser() || {})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true"
    }
    return false
  })
  const [isHovered, setIsHovered] = useState(false)

  // Effective reduced state (only reduced if manually collapsed AND not currently hovered)
  const isReduced = isCollapsed && !isHovered

  // Sync state if localStorage changes (optional but good for multi-tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed") {
        setIsCollapsed(e.newValue === "true")
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", String(newState))
  }

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
    { name: "Calendrier", href: "/calendar/all", icon: Calendar, roles: ["admin", "manager", "user"], permKey: "calendar" },
    { name: "Paie", href: "/payroll", icon: DollarSign, roles: ["admin", "manager"], permKey: "payroll" },
    { name: "Fiche de Paie", href: "/payroll/fiche", icon: FileText, roles: ["admin", "manager"], permKey: "fiche_payroll" },
    { name: "Reclamations", href: "/notebook", icon: BookOpen, roles: ["admin", "manager"], permKey: "notebook" },
    { name: "Chiffres de Paie", href: "/finance", icon: BarChart3, roles: ["admin", "manager"], permKey: "finance" },
    { name: "Avances", href: "/advances", icon: BarChart3, roles: ["admin", "manager", "user"], permKey: "advances" },

    // Admin only - no dynamic permission needed (or hardcoded true)
    { name: "Gestion Accès", href: "/management", icon: Users, roles: ["admin"] },
    { name: "Paramètres", href: "/settings", icon: Settings, roles: ["admin", "user"] },
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed left-0 top-0 z-[60] flex h-screen flex-col bg-white border-r border-[#e8e0d5]/50 shadow-sm transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 print:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          isReduced ? "lg:w-28 w-72 sm:w-80" : "w-72 sm:w-80 lg:w-96"
        )}
      >
        {/* Close Button - Mobile Only - Absolute Position */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-5 right-5 z-50 p-2 text-[#8b5a2b] hover:bg-[#f8f6f1] rounded-full transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Toggle Button for Desktop */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-4 top-10 z-[60] h-8 w-8 items-center justify-center rounded-full border border-[#c9b896] bg-white text-[#8b5a2b] shadow-md hover:bg-[#f8f6f1] transition-colors"
        >
          {isCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </button>

        {/* Logo Header - Hidden for Managers */}
        {user.role !== "manager" && (
          <div className={cn(
            "border-b border-[#e8e0d5]/50 transition-all duration-300",
            isReduced ? "lg:p-4" : "p-5 lg:p-10"
          )}>
            <div className="flex items-center">
              <Link href="/" className={cn(
                "flex items-center gap-4 hover:opacity-80 transition-opacity",
                isReduced && "justify-center"
              )}>
                <div className={cn(
                  "relative rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] p-0.5 shadow-lg transition-all duration-300",
                  isReduced ? "h-12 w-12" : "h-12 w-12 lg:h-16 lg:w-16"
                )}>
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
                <div className={cn(
                  "flex flex-col transition-all duration-300",
                  isReduced ? "lg:hidden" : "flex"
                )}>
                  <span className="font-[family-name:var(--font-heading)] text-lg lg:text-3xl font-bold text-[#8b5a2b]">
                    Business Bey
                  </span>
                  <span className="text-xs lg:text-sm text-[#a0522d] font-medium">l'aouina</span>
                </div>
              </Link>

            </div>
          </div>
        )}

        {/* User Profile Card */}
        <div className={cn(
          "border-b border-[#e8e0d5]/50 transition-all duration-300",
          isReduced ? "lg:p-4" : "p-4 lg:p-8"
        )}>
          <div className={cn(
            "flex items-center gap-4",
            isReduced && "justify-center"
          )}>
            <div className={cn(
              "flex-shrink-0 rounded-full bg-gradient-to-br from-[#8b5a2b] to-[#a0522d] shadow-md flex items-center justify-center overflow-hidden border-2 border-white transition-all duration-300",
              isReduced ? "h-12 w-12" : "h-12 w-12 lg:h-16 lg:w-16"
            )}>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className={cn(
                  "font-bold text-white uppercase transition-all duration-300",
                  isReduced ? "text-lg" : "text-lg lg:text-xl"
                )}>
                  {user.name ? user.name.charAt(0) : "U"}
                </span>
              )}
            </div>
            <div className={cn(
              "min-w-0 flex-1 transition-all duration-300",
              isReduced ? "lg:hidden" : "block"
            )}>
              <p className="truncate text-sm lg:text-lg font-semibold text-[#3d2c1e]">{user.name}</p>
              <p className="text-xs lg:text-base text-[#8b5a2b] font-medium">
                {user.role === "admin" ? "Administrateur" : user.role === "manager" ? "Gérant" : "Employé"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto space-y-2 transition-all duration-300",
          isReduced ? "p-3" : "p-3 lg:p-6"
        )}>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href === "/calendar" && pathname.startsWith("/schedule"))
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                title={isReduced ? item.name : ""}
                className={cn(
                  "group flex items-center transition-all duration-200 rounded-xl",
                  isReduced ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3 lg:py-4 text-sm lg:text-base font-medium",
                  isActive
                    ? "bg-gradient-to-r from-[#8b5a2b] to-[#a0522d] text-white shadow-lg scale-[1.02]"
                    : "text-[#3d2c1e] hover:bg-[#f8f6f1] hover:text-[#8b5a2b]",
                )}
              >
                <item.icon
                  className={cn(
                    "transition-transform group-hover:scale-110 shrink-0",
                    "h-5 w-5 lg:h-6 lg:w-6",
                    isActive ? "text-white" : "text-[#8b5a2b]",
                  )}
                />
                <span className={cn(
                  "truncate transition-all duration-300",
                  isReduced ? "lg:hidden" : "block",
                  isActive && "font-semibold"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className={cn(
          "border-t border-[#e8e0d5]/50 transition-all duration-300",
          isReduced ? "p-3" : "p-4 lg:p-6"
        )}>
          <button
            onClick={handleLogout}
            title={isReduced ? "Déconnexion" : ""}
            className={cn(
              "flex items-center justify-center transition-all border border-[#c9b896] rounded-xl font-medium",
              isReduced ? "h-12 w-full px-0" : "w-full gap-3 px-4 py-3 lg:py-4 text-sm lg:text-base text-[#8b5a2b] hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 hover:border-red-300 hover:shadow-md",
            )}
          >
            <LogOut className={cn(
              "shrink-0 h-5 w-5 lg:h-6 lg:w-6",
              !isReduced && "text-[#8b5a2b]"
            )} />
            <span className={cn(
              "transition-all duration-300",
              isReduced ? "lg:hidden" : "block"
            )}>
              Déconnexion
            </span>
          </button>
        </div>

      </div>
    </>
  )
}
