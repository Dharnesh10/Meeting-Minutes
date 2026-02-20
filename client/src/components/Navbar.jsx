// Navbar.jsx - UPDATED WITH DYNAMIC NOTIFICATIONS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Badge,
  Divider,
  ListItemIcon,
  ListItemText,
  alpha,
  Button
} from '@mui/material';
import {
  Notifications,
  ChatBubbleOutline,
  Brightness4,
  Brightness7,
  Logout,
  Settings,
  Person,
  ExpandMore,
  CheckCircle,
  Cancel,
  AccessTime,
  Event
} from '@mui/icons-material';
import { jwtDecode } from 'jwt-decode';

export default function Navbar({ sidebarOpen, toggleTheme, themeMode }) {
  const navigate = useNavigate();
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const token = localStorage.getItem('token');
  const drawerWidth = 280;
  const miniDrawerWidth = 70;

useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const decoded = jwtDecode(token);
    // Log this specifically to see what's inside during the render

    // Match the key from your console log exactly
    if (decoded.fullName) {
      setName(decoded.fullName);
    } else if (decoded.firstName) {
      setName(`${decoded.firstName} ${decoded.lastName || ''}`.trim());
    }
  } catch (error) {
    console.error('Navbar token error:', error);
  }
}, []); // Empty dependency array ensures this runs once on mount

  // Fetch notifications on mount and poll every 30 seconds
  useEffect(() => {
    if (!token) return;

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleProfileClick = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setNotificationAnchor(null);
    setProfileAnchor(null);
  };

  const handleNotificationItemClick = async (notification) => {
    try {
      if (!notification.read) {
        await fetch(`http://localhost:5000/api/notifications/${notification._id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      if (notification.relatedMeeting) {
        navigate(`/meeting-details?id=${notification.relatedMeeting._id}`);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'meeting_scheduled':
        return <Event fontSize="small" color="primary" />;
      case 'meeting_cancelled':
        return <Cancel fontSize="small" color="error" />;
      case 'meeting_reminder':
        return <AccessTime fontSize="small" color="warning" />;
      case 'meeting_approved':
        return <CheckCircle fontSize="small" color="success" />;
      case 'meeting_rejected':
        return <Cancel fontSize="small" color="error" />;
      default:
        return <Event fontSize="small" />;
    }
  };

  const formatNotificationTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { 
          xs: '100%', 
          md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${miniDrawerWidth}px)` 
        },
        ml: { 
          xs: 0, 
          md: sidebarOpen ? `${drawerWidth}px` : `${miniDrawerWidth}px` 
        },
        transition: (theme) => theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        backgroundColor: (theme) => theme.palette.mode === 'dark' 
          ? alpha(theme.palette.background.paper, 0.8)
          : alpha('#ffffff', 0.8),
        backdropFilter: 'blur(8px)',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ justifyContent: 'flex-end', minHeight: 72 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
            <IconButton onClick={toggleTheme} color="inherit">
              {themeMode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Messages">
            <IconButton color="inherit">
              <ChatBubbleOutline />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={handleNotificationClick}>
              <Badge badgeContent={unreadCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton
              onClick={handleProfileClick}
              sx={{
                ml: 1,
                p: 0.5,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    View Profile
                  </Typography>
                </Box>
                <ExpandMore sx={{ fontSize: 20, display: { xs: 'none', sm: 'block' } }} />
              </Box>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleClose}
          PaperProps={{
            sx: { 
              width: 400, 
              maxHeight: 500, 
              mt: 1.5,
              maxWidth: '90vw'
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Notifications
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <Typography variant="caption" color="primary">
                  {unreadCount} new
                </Typography>
              )}
              {notifications.length > 0 && (
                <Button 
                  size="small" 
                  onClick={handleMarkAllRead}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Mark all read
                </Button>
              )}
            </Box>
          </Box>
          <Divider />
          
          {notifications.length > 0 ? (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.map((notification) => (
                <MenuItem
                  key={notification._id}
                  onClick={() => handleNotificationItemClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    backgroundColor: notification.read ? 'transparent' : alpha('#667eea', 0.05),
                    borderLeft: notification.read ? '3px solid transparent' : '3px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: notification.read 
                        ? alpha('#667eea', 0.03)
                        : alpha('#667eea', 0.08)
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      fontWeight={notification.read ? 400 : 600}
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatNotificationTime(notification.createdAt)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                You'll be notified when meetings are scheduled
              </Typography>
            </Box>
          )}
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={handleClose}
          PaperProps={{
            sx: { width: 240, mt: 1.5 }
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {email}
            </Typography>
          </Box>
          <Divider />
          
          <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>

          <MenuItem onClick={() => { navigate('/settings'); handleClose(); }}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>

          <Divider />

          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}