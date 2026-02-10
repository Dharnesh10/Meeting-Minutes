import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Navbar from './components/Navbar.jsx';
import ThemeProvider from './components/ThemeProvider.jsx';
import Home from './components/Home.jsx';
import Login from './components/Login.jsx';
import Signup from './components/SignUp.jsx';
import Tasks from './pages/Mytasks.jsx';
import AssignedTasks from './pages/AssignedTasks.jsx';
import MeetingDetails from './pages/MeetingDetails.jsx';
import Minutes from './pages/Minutes.jsx';
import MyCalendar from './components/Calendar.jsx';
import CreateMeeting from './pages/CreateMeeting.jsx';
import RejectedMeetings from './pages/RejectedMeetings.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div style={{ flexGrow: 1 }}>
        <Navbar sidebarOpen={sidebarOpen} />
        <div style={{ marginTop: 64, padding: 20 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const isLoggedIn = !!localStorage.getItem('token');
  return isLoggedIn ? children : <Navigate to='/login' />;
}

function LogoutRoute() {
  useEffect(() => {
    localStorage.clear();
    window.location.href = '/login';
  }, []);

  return null;
}

export default function App() {
  // Store user ID in localStorage when logged in
  useEffect(() => {
    const fetchUserId = async () => {
      const token = localStorage.getItem('token');
      if (token && !localStorage.getItem('userId')) {
        try {
          const res = await fetch('http://localhost:5000/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('userId', data._id);
          }
        } catch (err) {
          console.error('Failed to fetch user ID:', err);
        }
      }
    };
    fetchUserId();
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/create-meeting" element={<CreateMeeting />} />
            <Route path="/edit-meeting/:id" element={<CreateMeeting />} /> {/* ADDED: Edit route */}
            <Route path="/assigned-tasks" element={<AssignedTasks />} />
            <Route path="/meeting-details" element={<MeetingDetails />} />
            <Route path="/minutes" element={<Minutes />} />
            <Route path="/calendar" element={<MyCalendar />} />
            <Route path="/rejected-meetings" element={<RejectedMeetings />} />
            <Route path="/pending-approvals" element={<PendingApprovals />} />
          </Route>
          
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<LogoutRoute />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}