import React, { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAppData } from '@/src/context/AppDataContext';

export default function Header({ onMenuClick, isMobileMenuOpen }: { onMenuClick?: () => void, isMobileMenuOpen?: boolean }) {
  const { notifications, markAllNotificationsRead } = useAppData();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 md:px-8 flex items-center justify-between flex-shrink-0 z-10 sticky top-0 print:hidden">
      <div className="flex items-center gap-4 flex-1">
        
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="md:hidden p-2 -mr-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg cursor-pointer transition-colors bg-transparent border-none block"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative hidden sm:block">
          <div className="absolute inset-y-0 right-3 flex items-center pr-1 pointer-events-none text-[#94A3B8]">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="bg-[#F1F5F9] border-none rounded-lg pr-10 pl-4 py-2 text-sm w-full sm:w-64 lg:w-80 focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            placeholder="بحث عام..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <button className="sm:hidden p-2 text-[#475569] hover:bg-[#F1F5F9] rounded-lg cursor-pointer bg-transparent border-none">
          <Search className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1 text-[#475569] hover:text-[#2563EB] cursor-pointer transition-colors border-none bg-transparent"
          >
            <Bell className="h-6 w-6" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#DC2626] rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-[#E2E8F0] overflow-hidden z-20">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="font-bold text-sm text-[#1E293B]">الإشعارات</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      markAllNotificationsRead();
                      setShowNotifications(false);
                    }} 
                    className="text-[11px] text-[#2563EB] hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-[#E2E8F0] last:border-0 ${!n.read ? 'bg-[#EFF6FF]' : 'bg-white'}`}>
                      <p className="text-sm font-bold text-[#1E293B]">{n.message}</p>
                      <span className="text-[10px] text-[#94A3B8] mt-1 block" dir="ltr">{new Date(n.date).toLocaleString('ar-EG')}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-[#94A3B8] text-sm">
                    لا توجد إشعارات حالياً
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
