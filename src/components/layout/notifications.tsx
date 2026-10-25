'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  card_id: string | null
  board_id: string | null
  message: string
  read: boolean
  created_at: string
}

export function Notifications() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [bellAnimate, setBellAnimate] = useState(false)
  const prevUnreadRef = useRef(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadNotifications()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as Notification
          setNotifications((prev) => [notif, ...prev])
          setUnreadCount((prev) => prev + 1)
          setBellAnimate(true)
          setTimeout(() => setBellAnimate(false), 800)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    }
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  async function deleteOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo)

    setNotifications((prev) => prev.filter((n) => new Date(n.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000))
  }

  function handleClick(notif: Notification) {
    markAsRead(notif.id)
    if (notif.board_id) {
      router.push(`/board/${notif.board_id}`)
      setOpen(false)
    }
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 hover:bg-white/10 rounded transition-colors"
      >
        <Bell className={`w-5 h-5 text-white ${bellAnimate ? 'bell-animate' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-10 w-80 rounded-lg shadow-xl z-50 overflow-hidden border border-[#A6C5E229]"
            style={{
              background: 'rgba(40, 46, 51, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as React.CSSProperties}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#A6C5E229]">
              <h4 className="text-sm font-semibold text-[#DEE4EA]">Notificações</h4>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={deleteOldNotifications}
                    className="text-xs text-[#9FADBC] hover:text-[#F87168]"
                  >
                    Limpar antigas
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#579DFF] hover:text-[#85B8FF]"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[#8C9BAB]">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-[#A6C5E229] last:border-0 hover:bg-[#A1BDD914] transition-colors ${
                      !notif.read ? 'bg-[#579DFF]/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#579DFF] mt-1.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#DEE4EA] truncate">{notif.message}</p>
                        <span className="text-xs text-[#8C9BAB]">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
