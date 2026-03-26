import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Home,
  Logout,
  CheckSquare,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Circle,
  XCircle
} from 'lucide-react';

import API_CONFIG from '../config/api';

export default function Sidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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

    // Check if mobile on mount and on resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    { text: 'Create Meeting', icon: Plus, path: '/create-meeting' },
    { text: 'Home', icon: Home, path: '/' },
    { 
      text: 'My Meetings', 
      icon: CalendarDays, 
      submenu: [
        { text: 'Scheduled', path: '/my-meetings/scheduled' },
        { text: 'Completed', path: '/my-meetings/completed' },
      ]
    },
    { text: 'Rejected', icon: XCircle, path: '/rejected-meetings' },
    { text: 'Tasks', icon: CheckSquare, path: '/tasks'},
    { text: 'Calendar', icon: Calendar, path: '/calendar' },
  ];

  const handleItemClick = () => {
    if (isMobile) setOpen(false);
  };

  const MenuItem = ({ item, isOpen, isMobileDevice }) => {
    const active = !item.submenu && isActive(item.path);
    const Icon = item.icon;
    const hasSubmenuActive = item.submenu?.some(sub => location.pathname.includes(sub.path));
    
    if (item.submenu) {
      return (
        <div className="mb-1">
          <button
            onClick={() => setPaymentsOpen(!paymentsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${hasSubmenuActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'
              }`}
          >
            <div className={`min-w-[40px] ${hasSubmenuActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <Icon size={20} />
            </div>
            {(isOpen || isMobileDevice) && (
              <>
                <span className={`flex-1 text-left text-sm font-medium ${hasSubmenuActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item.text}
                </span>
                {paymentsOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </>
            )}
          </button>
          
          {paymentsOpen && (isOpen || isMobileDevice) && (
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
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
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
        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group mb-1
          ${active 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-600 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'
          }`}
      >
        <div className={`min-w-[40px] ${active ? 'text-blue-500' : 'group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>
          <Icon size={20} />
        </div>
        {(isOpen || isMobileDevice) && (
          <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
            {item.text}
          </span>
        )}
      </Link>
    );
  };

  const drawerContent = (isOpen, isMobileDevice) => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className={`flex items-center p-4 min-h-[72px] border-b border-gray-200 dark:border-gray-800 ${isOpen || isMobileDevice ? 'justify-between' : 'justify-center'}`}>
        {(isOpen || isMobileDevice) ? (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
              </div>
            </div>
            {!isMobileDevice && (
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-500" />
              </button>
            )}
          </>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => (
          <MenuItem key={item.text} item={item} isOpen={isOpen} isMobileDevice={isMobileDevice} />
        ))}
      </div>

      {/* Footer - Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
            ${isOpen || isMobileDevice ? '' : 'justify-center'}
            hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400`}
        >
          <div className={`min-w-[40px] ${isOpen || isMobileDevice ? '' : 'mx-auto'}`}>
            <Logout size={20} />
          </div>
          {(isOpen || isMobileDevice) && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {open && isMobile && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden animate-slideIn">
            {drawerContent(true, true)}
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden md:block fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-30
        ${open ? 'w-[280px]' : 'w-[70px]'}`}
      >
        {drawerContent(open, false)}
      </div>

      {/* Toggle Button for Desktop (when closed) */}
      {!open && !isMobile && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-5 left-5 z-40 p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hidden md:flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
        >
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Floating Action Button for Mobile (when closed) */}
      {!open && isMobile && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 md:hidden hover:scale-105"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );
}