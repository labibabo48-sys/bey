"use client"

import { useState, useMemo, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/mock-data"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { gql, useQuery, useMutation } from "@apollo/client"
import { cn } from "@/lib/utils"

const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: ID, $limit: Int, $excludeMachine: Boolean, $onlyMachine: Boolean) {
    getNotifications(userId: $userId, limit: $limit, excludeMachine: $excludeMachine, onlyMachine: $onlyMachine) {
      id
      type
      title
      message
      url
      timestamp
      read
      userDone
      user_id
    }
  }
`;

const MARK_ALL_READ = gql`
  mutation MarkAllRead($userId: ID!) {
    markNotificationsAsRead(userId: $userId)
  }
`;

const MARK_ONE_READ = gql`
  mutation MarkOneRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`;

const NotificationDropdown = ({
  icon,
  badgeColor,
  notifications,
  onMarkAllRead,
  onItemClick,
  optimisticAllRead,
  title,
  iconColor
}: any) => {
  const unreadCount = useMemo(() => {
    if (optimisticAllRead) return 0;
    return notifications.filter((n: any) => !n.read).length;
  }, [notifications, optimisticAllRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "pointage": return "🕐"
      case "avance": return "💰"
      case "payment": return "💵"
      case "schedule": return "📅"
      case "system": return "⚙️"
      default: return "🔔"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const now = new Date()
      const notifTime = new Date(timestamp)
      const diffMs = now.getTime() - notifTime.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "À l'instant"
      if (diffMins < 60) return `Il y a ${diffMins} min`
      if (diffHours < 24) return `Il y a ${diffHours}h`
      if (diffDays === 1) return "Hier"
      if (diffDays < 7) return `Il y a ${diffDays} jours`
      return notifTime.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    } catch (e) { return timestamp; }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-12 w-12 lg:h-14 lg:w-14 rounded-full hover:bg-[#8b5a2b]/10 transition-colors"
        >
          {icon}
          {unreadCount > 0 && (
            <Badge className={cn(
              "absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full text-white text-xs font-bold border-2 border-white p-0",
              badgeColor
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] sm:w-[420px] max-h-[600px] overflow-hidden flex flex-col p-0">
        <DropdownMenuLabel className="flex items-center justify-between py-4 px-5 bg-white border-b border-[#c9b896]/30">
          <div className="flex flex-col">
            <span className={cn("text-lg lg:text-xl font-black uppercase tracking-tight", iconColor)}>{title}</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{unreadCount} nouveau{unreadCount > 1 ? "x" : ""}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[11px] font-black uppercase text-[#8b5a2b] hover:bg-[#8b5a2b]/5 gap-2"
            onClick={onMarkAllRead}
          >
            <Check className="h-3 w-3" /> Tout marquer comme lu
          </Button>
        </DropdownMenuLabel>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-20 text-center text-[#6b5744] opacity-40">
              <Bell className="h-16 w-16 mx-auto mb-4 text-[#c9b896]" />
              <p className="text-xs font-black uppercase tracking-widest">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-[#c9b896]/10">
              {notifications.map((notification: any) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => onItemClick(notification)}
                  className={cn(
                    "p-5 cursor-pointer transition-all duration-200 focus:bg-[#f8f6f1]",
                    !(optimisticAllRead || notification.read) ? "bg-[#f8f6f1]/50 border-l-4 border-l-[#8b5a2b]" : "bg-white grayscale-[0.5] opacity-80"
                  )}
                >
                  <div className="flex gap-4 w-full">
                    <div className="text-2xl mt-0.5 filter drop-shadow-sm">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "font-bold text-base leading-tight uppercase tracking-tight",
                          !(optimisticAllRead || notification.read) ? "text-[#3d2c1e]" : "text-[#6b5744]"
                        )}>
                          {notification.title}
                        </p>
                        {!(optimisticAllRead || notification.read) && (
                          <div className="h-2 w-2 rounded-full bg-[#8b5a2b] flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(139,90,43,0.5)]" />
                        )}
                      </div>
                      <p className="text-sm text-[#8b5a2b] mt-1 line-clamp-2 font-medium">{notification.message}</p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {notification.userDone && (
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              Par: {notification.userDone}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-[#a08968] uppercase tracking-widest">{formatTimestamp(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>

        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="w-full text-center py-4 text-xs font-black uppercase tracking-widest text-[#8b5a2b] bg-[#f8f6f1]/50 hover:bg-[#f8f6f1] border-t border-[#c9b896]/30"
          >
            Toutes les notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationBell() {
  const router = useRouter()
  const currentUser = getCurrentUser()

  let permissions: any = {};
  if (currentUser?.permissions) {
    try { permissions = JSON.parse(currentUser.permissions); } catch (e) { }
  }
  const canViewNotifications = currentUser?.role === 'admin' || permissions?.notifications?.view !== false;

  const isAdminOrManager = ['admin', 'manager'].includes(currentUser?.role || '');

  // Separate queries for manager and machine notifications
  const { data: managerData, loading: managerLoading, refetch: refetchManager } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      userId: isAdminOrManager ? null : currentUser?.id,
      limit: 100,
      excludeMachine: true
    },
    pollInterval: 60000,
    fetchPolicy: "cache-and-network",
    skip: !canViewNotifications
  });

  const { data: machineData, loading: machineLoading, refetch: refetchMachine } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      userId: isAdminOrManager ? null : currentUser?.id,
      limit: 100,
      onlyMachine: true
    },
    pollInterval: 60000,
    fetchPolicy: "cache-and-network",
    skip: !canViewNotifications
  });

  // Refetch both
  const refetch = async () => {
    await Promise.all([refetchManager(), refetchMachine()]);
  };

  // Split optimistic state
  const [optimisticMachineRead, setOptimisticMachineRead] = useState(false);
  const [optimisticManagerRead, setOptimisticManagerRead] = useState(false);

  const [markAllRead] = useMutation(MARK_ALL_READ, {
    onCompleted: () => refetch()
  });
  const [markOneRead] = useMutation(MARK_ONE_READ);

  if (!canViewNotifications) return null;

  const managerNotifications = useMemo(() => managerData?.getNotifications || [], [managerData]);
  const machineNotifications = useMemo(() => machineData?.getNotifications || [], [machineData]);

  // Reset optimistic state when data actually updates from server
  useEffect(() => {
    if (managerData || machineData) {
      setOptimisticMachineRead(false);
      setOptimisticManagerRead(false);
    }
  }, [managerData, machineData]);

  // New Bulk Mutation
  const [markListRead] = useMutation(gql`
    mutation MarkNotificationsListAsRead($ids: [ID]!) {
      markNotificationsListAsRead(ids: $ids)
    }
  `);

  // Helper to mark a specific list as read (client-side loop for granular control)
  const handleMarkListAsRead = async (e: React.MouseEvent, list: any[], setOptimistic: (v: boolean) => void) => {
    e.stopPropagation();
    setOptimistic(true); // Force immediate UI feedback

    // Filter effectively unread items
    const unreadIds = list.filter((n: any) => !n.read).map((n: any) => n.id);

    if (unreadIds.length === 0) return;

    // Use efficient bulk mutation
    try {
      // Ensure IDs are strings
      const payloadIds = unreadIds.map((id: any) => String(id));
      await markListRead({ variables: { ids: payloadIds } });
      await refetch();
    } catch (e) {
      console.error("Failed to mark list as read", e);
      setOptimistic(false); // Revert optimistic state on error
    }
  }

  const handleMarkMachineRead = (e: React.MouseEvent) => handleMarkListAsRead(e, machineNotifications, setOptimisticMachineRead);
  const handleMarkManagerRead = (e: React.MouseEvent) => handleMarkListAsRead(e, managerNotifications, setOptimisticManagerRead);

  const handleNotificationClick = (notification: any) => {
    // Immediate background mark-as-read
    if (!notification.read) {
      markOneRead({ variables: { id: notification.id } }).catch(() => { });
    }

    let target = notification.url;

    // 1. Extract UID from message fallback if user_id is missing (Facebook-style robustness)
    let uid = notification.user_id;
    if (!uid && notification.message) {
      const match = notification.message.match(/\[REF:.*?(\d+)_/);
      if (match) uid = match[1];
    }

    // 2. Self-healing for broken URLs (e.g., "/attendance?userId=")
    const isBroken = target && target.includes('userId=') && (!target.split('userId=')[1] || target.split('userId=')[1].startsWith('&'));

    if (!target || isBroken) {
      if (notification.type === 'pointage') {
        target = `/attendance?userId=${uid || ''}`;
        // If it was a retard/absence with date in message, try to extract it too
        const dateMatch = notification.message?.match(/le (\d{4}-\d{2}-\d{2})/);
        if (dateMatch && !target.includes('date=')) target += `&date=${dateMatch[1]}`;
      }
      else if (notification.type === 'system' || notification.type === 'schedule') target = `/employees?userId=${uid || ''}`;
      else if (notification.type === 'avance') target = `/advances?userId=${uid || ''}`;
      else if (notification.type === 'payment') target = `/payroll`;
      else target = '/';
    }

    // 3. Final cleanup and navigation
    if (target) {
      // Ensure we don't end up with just "?" or empty strings
      if (target.endsWith('userId=')) target = target.replace('userId=', '');
      router.push(target);
    }
  }

  return (
    <div className="flex items-center gap-8">
      {/* Manager Bell */}
      <NotificationDropdown
        icon={<Bell className="h-6 w-6 lg:h-7 lg:w-7 text-indigo-600" />}
        iconColor="text-indigo-600"
        badgeColor="bg-indigo-500"
        title="Notification Manager"
        notifications={managerNotifications}
        onMarkAllRead={handleMarkManagerRead}
        onItemClick={handleNotificationClick}
        optimisticAllRead={optimisticManagerRead}
      />

      {/* Machine Bell */}
      <NotificationDropdown
        icon={<Bell className="h-6 w-6 lg:h-7 lg:w-7 text-[#8b5a2b]" />}
        iconColor="text-[#8b5a2b]"
        badgeColor="bg-red-500"
        title="Machine"
        notifications={machineNotifications}
        onMarkAllRead={handleMarkMachineRead}
        onItemClick={handleNotificationClick}
        optimisticAllRead={optimisticMachineRead}
      />
    </div>
  )
}
