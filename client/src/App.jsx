import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, useMediaQuery, CssBaseline } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ThemeProvider, { useThemeToggle } from './components/ThemeProvider';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './components/Home';
import CreateMeeting from './pages/CreateMeeting';
import MeetingDetails from './pages/MeetingDetails';
import Tasks from './pages/Tasks';
import RejectedMeetings from './pages/RejectedMeetings';
import Calendar from './components/Calendar';
import Login from './components/Login'; // Ensure this component exists
import PendingApprovals from './pages/PendingApprovals';
import './App.css';

function AppContent() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { toggleTheme, mode } = useThemeToggle();

  const token = localStorage.getItem('token');
  const isLoginPage = location.pathname === '/login';

  // 1. Auth Guard: Redirect to login if no token is found
  useEffect(() => {
    if (!token && !isLoginPage) {
      navigate('/login');
    }
    // If user is already logged in and tries to go to /login, send them home
    if (token && isLoginPage) {
      navigate('/');
    }
  }, [token, navigate, isLoginPage]);

  // 2. Responsive Sidebar: Auto-close on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // 3. Layout Logic: If it's the login page, don't show Sidebar or Navbar
  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      
      {/* Sidebar handles its own responsive variants */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Navbar 
          sidebarOpen={sidebarOpen} 
          toggleTheme={toggleTheme}
          themeMode={mode}
          isMobile={isMobile}
        />
        
        <Box
          sx={{
            flexGrow: 1,
            pt: { xs: 10, md: 14 }, // Space for fixed Navbar
            px: { 
              xs: 2, 
              md: sidebarOpen ? 3 : 18 // Dynamic padding requested
            },
            pb: 3,
            overflowY: 'auto',
            transition: theme.transitions.create(['padding'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Routes>
            {/* Authenticated Routes */}
            <Route path="/" element={<Home type="all" />} />
            <Route path="/my-meetings/scheduled" element={<Home type="scheduled" />} />
            <Route path="/my-meetings/completed" element={<Home type="completed" />} />
            
            <Route path="/create-meeting" element={<CreateMeeting />} />
            <Route path="/edit-meeting/:id" element={<CreateMeeting />} />
            <Route path="/meeting-details" element={<MeetingDetails />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/rejected-meetings" element={<RejectedMeetings />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path='pending-approvals' element={<PendingApprovals />} />
            
            {/* Catch-all to redirect back home if path doesn't exist */}
            <Route path="*" element={<Home type="all" />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}