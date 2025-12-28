"use client"

import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  color: "bronze" | "copper" | "gold" | "red"
  href?: string
  className?: string
}

export function StatCard({ title, value, change, icon: Icon, trend, color, href, className }: StatCardProps) {
  const router = useRouter()
  const colorClasses = {
    bronze: "from-[#8b5a2b]/20 to-[#8b5a2b]/5 text-[#8b5a2b] border-[#8b5a2b]/30",
    copper: "from-[#a0522d]/20 to-[#a0522d]/5 text-[#a0522d] border-[#a0522d]/30",
    gold: "from-[#c9a227]/20 to-[#c9a227]/5 text-[#c9a227] border-[#c9a227]/30",
    red: "from-red-200 to-red-50 text-red-600 border-red-300",
  }

  const trendClasses = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-[#6b5744]/60",
  }

  const handleClick = () => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <Card
      className={`bg-white border-[#c9b896] p-4 sm:p-4 lg:p-5 shadow-md hover:shadow-lg transition-all h-full ${href ? "cursor-pointer hover:scale-[1.02] hover:border-[#8b5a2b]" : ""
        } ${className || ""}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3 lg:gap-4 h-full">
        <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
          <div>
            <p className="text-[10px] sm:text-xs lg:text-xs font-bold text-[#6b5744]/70 uppercase tracking-widest leading-tight">{title}</p>
            <p className="mt-1 sm:mt-1.5 font-[family-name:var(--font-heading)] text-xl sm:text-2xl lg:text-3xl font-black text-[#3d2c1e] tracking-tight whitespace-nowrap">
              {value}
            </p>
          </div>
          {change && (
            <p
              className={`mt-2 text-[10px] sm:text-xs lg:text-sm font-bold ${trendClasses[trend || "neutral"]}`}
            >
              {change}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br p-2 sm:p-2.5 lg:p-3 border ${colorClasses[color]} shadow-sm`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </div>
      </div>
    </Card>
  )
}
