import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Home,
  Logout,
  PlaylistAddCheck,
  Block,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Add,
  EventNote,
  ChevronDown,
  ChevronUp,
  Circle
} from 'lucide-react';

import API_CONFIG from '../config/api';

export default function Sidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setName(decoded.name || decoded.userName || 'User');
      setEmail(decoded.email || decoded.userEmail || '');
    } catch (error) {
      console.error('Failed to decode token:', error);
    }
    fetchPendingCount();
  }, [navigate]);

  const fetchPendingCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if(!token) return;
      const res = await fetch(`${API_CONFIG.baseURL}/meetings/pending-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) {
        const data = await res.json();
        setPendingCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { text: 'Create Meeting', icon: Add, path: '/create-meeting' },
    { text: 'Home', icon: Home, path: '/' },
    { 
      text: 'My Meetings', 
      icon: EventNote, 
      submenu: [
        { text: 'Scheduled', path: '/my-meetings/scheduled' },
        { text: 'Completed', path: '/my-meetings/completed' },
      ]
    },
    { text: 'Rejected', icon: Block, path: '/rejected-meetings' },
    { text: 'Tasks', icon: PlaylistAddCheck, path: '/tasks'},
    { text: 'Calendar', icon: CalendarMonth, path: '/calendar' },
  ];

  const handleItemClick = () => {
    if (window.innerWidth < 768) setOpen(false);
  };

  const MenuItem = ({ item, isOpen, isMobile }) => {
    const active = !item.submenu && isActive(item.path);
    const Icon = item.icon;
    const hasSubmenuActive = item.submenu?.some(sub => location.pathname.includes(sub.path));
    
    if (item.submenu) {
      return (
        <div className="mb-1">
          <button
            onClick={() => setPaymentsOpen(!paymentsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
              ${hasSubmenuActive 
                ? 'bg-primary-50 dark:bg-primary-900/20 border-l-3 border-primary-500' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-3 border-transparent'
              }`}
          >
            <div className={`min-w-[40px] ${hasSubmenuActive ? 'text-primary-500' : 'text-gray-600 dark:text-gray-400'}`}>
              <Icon size={20} />
            </div>
            {(isOpen || isMobile) && (
              <>
                <span className={`flex-1 text-left text-sm font-medium ${hasSubmenuActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item.text}
                </span>
                {paymentsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </>
            )}
          </button>
          
          {paymentsOpen && (isOpen || isMobile) && (
            <div className="mt-1 ml-11 pl-2 space-y-1">
              {item.submenu.map((subItem) => {
                const subActive = isActive(subItem.path);
                return (
                  <Link
                    key={subItem.text}
                    to={subItem.path}
                    onClick={handleItemClick}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                      ${subActive 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className="min-w-[30px]">
                      <Circle size={8} className="fill-current" />
                    </div>
                    <span className="text-sm">{subItem.text}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        onClick={handleItemClick}
        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group mb-1
          ${active 
            ? 'bg-primary-50 dark:bg-primary-900/20 border-l-3 border-primary-500 text-primary-600 dark:text-primary-400' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-3 border-transparent'
          }`}
      >
        <div className={`min-w-[40px] ${active ? 'text-primary-500' : 'group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
          <Icon size={20} />
        </div>
        {(isOpen || isMobile) && (
          <span className={`text-sm font-medium ${active ? 'font-semibold' : 'font-medium'}`}>
            {item.text}
          </span>
        )}
      </Link>
    );
  };

  const drawerContent = (isOpen, isMobile) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 min-h-[72px] ${isOpen || isMobile ? '' : 'justify-center'}`}>
        {(isOpen || isMobile) ? (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold shadow-md">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
            )}
          </>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold shadow-md mx-auto">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-700" />

      {/* Menu Items */}
      <div className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <MenuItem key={item.text} item={item} isOpen={isOpen} isMobile={isMobile} />
        ))}
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-700" />

      {/* Footer */}
      <div className="px-2 py-4">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
            ${isOpen || isMobile ? '' : 'justify-center'}
            hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400`}
        >
          <div className={`min-w-[40px] ${isOpen || isMobile ? '' : 'mx-auto'}`}>
            <Logout size={20} />
          </div>
          {(isOpen || isMobile) && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </div>
  );

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {/* Mobile Drawer */}
      {open && isMobile && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden">
            {drawerContent(true, true)}
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30
        ${open ? 'w-[280px]' : 'w-[70px]'}`}
      >
        {drawerContent(open, false)}
      </div>

      {/* Toggle Button for Desktop (when closed) */}
      {!open && !isMobile && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-5 left-5 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center border border-gray-200 dark:border-gray-700"
        >
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Floating Action Button for Mobile (when closed) */}
      {!open && isMobile && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3 bg-primary-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 md:hidden"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );
}