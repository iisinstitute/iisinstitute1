import React, { useState } from 'react';
import {
  Bell,
  Search,
  CheckCircle,
  Calendar,
  LogIn,
  LogOut,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useData } from '../../context/DataContext.tsx';

interface HeaderProps {
  currentTabTitle: string;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTabTitle, onSearch }) => {
  const { currentUser, activeRole, firebaseUser, loginWithGoogle, logout } = useAuth();
  const { notifications, markNotificationRead, clearAllNotifications } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 flex h-18 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur-xs">
      {/* Title & Date */}
      <div className="flex items-center gap-3.5">
        <img
          src="/assets/aistudio/image_5aac2d2d.png"
          alt="IIS Logo"
          className="h-10 w-10 shrink-0 object-contain rounded-xl border border-gray-200/80 p-0.5 bg-white shadow-xs"
        />
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{currentTabTitle}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>Today: {todayStr}</span>
            <span className="text-gray-300">•</span>
            <span className="font-medium text-purple-700">Academic Year 2026-27</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search student, batch, ID..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
          />
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Institute Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearAllNotifications}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">No active notifications</p>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`cursor-pointer rounded-xl p-2.5 transition-all text-xs border ${
                        n.read ? 'bg-white border-gray-100' : 'bg-blue-50/60 border-blue-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-900">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                      </div>
                      <p className="mt-1 text-gray-600 text-[11px] leading-relaxed">{n.message}</p>
                      <span className="mt-1.5 block text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Authentication */}
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-purple-600 text-white font-bold text-xs shadow-xs">
              {currentUser.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-none">{currentUser.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                  {activeRole}
                </span>
                {currentUser.phone && (
                  <span className="text-[10px] font-mono text-gray-400">
                    {currentUser.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
            title="Log out of current account"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
