"use client"

import { useMemo, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { NotificationBell } from "@/components/notification-bell"
import { getCurrentUser } from "@/lib/mock-data"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Clock, DollarSign, Calendar, Settings, CheckCheck, Trash2 } from "lucide-react"
import { gql, useQuery, useMutation } from "@apollo/client"

const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: ID, $limit: Int, $excludeMachine: Boolean) {
    getNotifications(userId: $userId, limit: $limit, excludeMachine: $excludeMachine) {
      id
      type
      title
      message
      timestamp
      read
      userDone
    }
  }
`;

const MARK_READ = gql`
  mutation MarkRead($userId: ID!) {
    markNotificationsAsRead(userId: $userId)
  }
`;

const DELETE_OLD = gql`
  mutation DeleteOld {
    deleteOldNotifications
  }
`;

export default function NotificationsPage() {
  const currentUser = getCurrentUser()
  const isAdminOrManager = ['admin', 'manager'].includes(currentUser?.role || '');

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      userId: isAdminOrManager ? null : currentUser?.id,
      limit: 100,
      excludeMachine: true
    },
    pollInterval: 60000,
    fetchPolicy: "cache-and-network"
  });

  // Pause polling if tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling(60000);
      } else {
        stopPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startPolling, stopPolling]);

  const [markRead] = useMutation(MARK_READ);
  const [deleteOld] = useMutation(DELETE_OLD);

  const allNotifications = useMemo(() => data?.getNotifications || [], [data]);

  // Group notifications by month
  const notificationsByMonth = useMemo(() => {
    const grouped: Record<string, any[]> = {}

    allNotifications.forEach((notification: any) => {
      const date = new Date(notification.timestamp)
      const monthKey = date.toLocaleDateString("fr-FR", { year: "numeric", month: "long" })

      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(notification)
    })

    return grouped
  }, [allNotifications])

  const handleMarkAllRead = async () => {
    if (currentUser?.id) {
      await markRead({ variables: { userId: currentUser.id } });
      refetch();
    }
  }

  const handleCleanLogs = async () => {
    if (confirm("Supprimer les notifications de plus de 30 jours ?")) {
      await deleteOld();
      refetch();
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pointage":
        return <Clock className="h-6 w-6 lg:h-7 lg:w-7 text-blue-600" />
      case "avance":
        return <DollarSign className="h-6 w-6 lg:h-7 lg:w-7 text-amber-600" />
      case "payment":
        return <DollarSign className="h-6 w-6 lg:h-7 lg:w-7 text-green-600" />
      case "schedule":
        return <Calendar className="h-6 w-6 lg:h-7 lg:w-7 text-purple-600" />
      case "system":
        return <Settings className="h-6 w-6 lg:h-7 lg:w-7 text-gray-600" />
      default:
        return <Bell className="h-6 w-6 lg:h-7 lg:w-7 text-[#8b5a2b]" />
    }
  }

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "pointage":
        return "bg-blue-50 border-blue-200"
      case "avance":
        return "bg-amber-50 border-amber-200"
      case "payment":
        return "bg-green-50 border-green-200"
      case "schedule":
        return "bg-purple-50 border-purple-200"
      case "system":
        return "bg-gray-50 border-gray-200"
      default:
        return "bg-[#f8f6f1] border-[#c9b896]"
    }
  }

  const formatFullTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) { return timestamp; }
  }

  const unreadCount = allNotifications.filter((n: any) => !n.read).length

  if (loading && !data) return <div className="flex h-screen items-center justify-center bg-[#f8f6f1]">Chargement...</div>;

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-[#f8f6f1] lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0 h-full">
        {/* Header Section */}
        <div className="border-b border-[#c9b896]/30 bg-white/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="px-6 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10">
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#3d2c1e]">
                  Notifications
                </h1>
                <p className="mt-2 text-base sm:text-lg lg:text-xl text-[#6b5744]">
                  Activités et mises à jour du système
                  {unreadCount > 0 && (
                    <Badge className="ml-3 bg-red-500 text-white text-sm lg:text-base px-3 py-1">
                      {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={handleMarkAllRead}
                  className="border-[#c9b896] text-[#8b5a2b] hover:bg-[#8b5a2b]/10 h-12 px-4 font-semibold"
                >
                  <CheckCheck className="mr-2 h-5 w-5" />
                  Tout marquer comme lu
                </Button>
                {isAdminOrManager && (
                  <Button
                    variant="outline"
                    onClick={handleCleanLogs}
                    className="border-red-200 text-red-600 hover:bg-red-50 h-12 px-4 font-semibold"
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Nettoyer l'historique
                  </Button>
                )}
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto">
          {allNotifications.length === 0 ? (
            <Card className="border-[#c9b896] bg-white p-12 lg:p-16 text-center shadow-md border-2">
              <Bell className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-4 text-[#c9b896] opacity-30" />
              <h2 className="text-xl lg:text-2xl font-semibold text-[#3d2c1e] mb-2">Aucune notification</h2>
              <p className="text-base lg:text-lg text-[#6b5744]">
                Tout est à jour ! Vous recevrez des alertes en cas de nouvelles activités.
              </p>
            </Card>
          ) : (
            <div className="space-y-12 lg:space-y-16">
              {Object.entries(notificationsByMonth).map(([month, notifications]) => (
                <div key={month}>
                  <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#8b5a2b] mb-6 lg:mb-8 flex items-center gap-4">
                    <Calendar className="h-8 w-8 text-[#8b5a2b]/40" />
                    {month.charAt(0).toUpperCase() + month.slice(1)}
                  </h2>
                  <div className="grid gap-4 lg:gap-6">
                    {notifications.map((notification: any) => (
                      <Card
                        key={notification.id}
                        className={`border-2 p-5 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-all ${getNotificationBgColor(notification.type)} ${!notification.read ? "ring-2 ring-blue-400 ring-offset-2" : ""
                          }`}
                      >
                        <div className="flex gap-4 lg:gap-8">
                          <div className="flex-shrink-0 rounded-2xl bg-white p-4 lg:p-5 shadow-sm border-2">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-bold text-xl sm:text-2xl lg:text-3xl text-[#3d2c1e] tracking-tight">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <Badge className="bg-blue-600 text-white text-xs lg:text-sm font-bold animate-pulse">NOUVEAU</Badge>
                              )}
                            </div>
                            <p className="text-lg sm:text-xl lg:text-2xl text-[#3d2c1e]/80 mb-4 leading-relaxed font-medium">
                              {notification.message}
                            </p>
                            <div className="flex flex-wrap items-center gap-6 text-base sm:text-lg lg:text-xl text-[#6b5744]/70">
                              <span className="flex items-center gap-2 font-semibold">
                                <Clock className="h-5 w-5 lg:h-6 lg:w-6 opacity-50" />
                                {formatFullTimestamp(notification.timestamp)}
                              </span>
                              {notification.userDone && (
                                <span className="flex items-center gap-2 font-bold px-3 py-1 rounded-full bg-black/5 text-[#3d2c1e]">
                                  <Settings className="h-5 w-5 lg:h-6 lg:w-6 opacity-50" />
                                  Responsable: {notification.userDone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

