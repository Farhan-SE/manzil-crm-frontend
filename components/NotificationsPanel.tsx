"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons/DashboardIcons";
import { announceUnread } from "@/components/NotificationToasts";
import { Icon } from "@/components/ui/Icon";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api";
import { timeAgo } from "@/lib/time";

const headingStyle = { fontVariationSettings: '"SOFT" 0, "WONK" 1' };

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    getNotifications(unreadOnly)
      .then((res) => {
        setNotifications(res.data);
        setUnreadCount(res.unread_count);
        announceUnread(res.unread_count);
      })
      .catch(() => setNotifications([]));
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(notification: AppNotification) {
    if (!notification.is_read) {
      await markNotificationRead(notification.id).catch(() => {});
      announceUnread(Math.max(0, unreadCount - 1));
    }
    if (notification.link) onClose();
    else load();
  }

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-40 flex h-[390px] w-[380px] max-w-[calc(100vw-2rem)] flex-col border border-border bg-white shadow-lg">
      <div className="flex h-[62px] shrink-0 items-center justify-between border-b border-border px-5">
        <h2 className="font-serif text-base font-bold text-dash-ink" style={headingStyle}>
          Notifications
        </h2>
        <button type="button" onClick={onClose} aria-label="Close notifications" className="text-ink">
          <CloseIcon className="size-2.5" />
        </button>
      </div>

      <div className="flex h-[45px] shrink-0 items-center gap-6 border-b border-border px-5 text-xs leading-[1.4]">
        {[false, true].map((unread) => (
          <button
            key={String(unread)}
            type="button"
            onClick={() => setUnreadOnly(unread)}
            aria-pressed={unreadOnly === unread}
            className={unreadOnly === unread ? "font-bold text-ink" : "text-nav-idle hover:text-ink"}
          >
            {unread ? "Unread" : "All"}
          </button>
        ))}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllNotificationsRead().then(load)}
            className="ml-auto text-[11px] text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-nav-idle">
          <Icon name="bell" className="size-8" />
          <p className="text-xs">No notifications</p>
        </div>
      )}

      {notifications && notifications.length > 0 && (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {notifications.map((notification) => {
            const content = (
              <>
                <p className={`text-xs text-ink ${notification.is_read ? "" : "font-bold"}`}>{notification.title}</p>
                {notification.body && <p className="mt-1 text-[10px] text-muted">{notification.body}</p>}
                <p className="mt-1 text-[10px] text-nav-idle">{timeAgo(notification.created_at)}</p>
              </>
            );
            const itemClass = "block w-full border-b border-border px-5 py-3 text-left leading-[1.4] hover:bg-sidebar";
            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link href={notification.link} onClick={() => void open(notification)} className={itemClass}>
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={() => void open(notification)} className={itemClass}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
