import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { styled, alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { jwtDecode } from 'jwt-decode';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Box,
  Typography,
  Avatar,
  Badge,
  Collapse
} from '@mui/material';

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
  ExpandLess,
  ExpandMore,
  Circle
} from '@mui/icons-material';

const drawerWidthOpen = 280;
const drawerWidthClosed = 70;

// ... (Keep StyledDrawer, StyledListItemButton, NestedListItemButton definitions exactly as before) ...
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? drawerWidthOpen : drawerWidthClosed,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  display: 'none', 
  [theme.breakpoints.up('md')]: {
    display: 'block',
  },
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  '& .MuiDrawer-paper': {
    width: open ? drawerWidthOpen : drawerWidthClosed,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  borderRadius: theme.spacing(1),
  margin: theme.spacing(0.5, 1),
  padding: theme.spacing(1.25, 1.5),
  minHeight: 48,
  transition: 'all 0.2s',
  backgroundColor: active 
    ? theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.2)
      : alpha(theme.palette.primary.main, 0.1)
    : 'transparent',
  borderLeft: active ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.15)
      : alpha(theme.palette.primary.main, 0.08),
  },
}));

const NestedListItemButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  margin: theme.spacing(0.5, 1, 0.5, 2),
  paddingLeft: theme.spacing(4),
  minHeight: 40,
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.1)
      : alpha(theme.palette.primary.main, 0.05),
  },
}));

export default function Sidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
      const res = await fetch('http://localhost:5000/api/meetings/pending-count', {
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

  // UPDATED MENU ITEMS
  const menuItems = [
    { text: 'Home', icon: <Home />, path: '/' },
    { text: 'Create Meeting', icon: <Add />, path: '/create-meeting' },
    { 
      text: 'My Meetings', 
      icon: <EventNote />, 
      submenu: [
        { text: 'Scheduled', path: '/my-meetings/scheduled' },
        { text: 'Completed', path: '/my-meetings/completed' },
      ]
    },
    { text: 'Tasks', icon: <PlaylistAddCheck />, path: '/tasks'},
    { text: 'Rejected', icon: <Block />, path: '/rejected-meetings' },
    { text: 'Calendar', icon: <CalendarMonth />, path: '/calendar' },
  ];

  const handleItemClick = () => {
    if (isMobile) setOpen(false);
  };

  const drawerContent = (
    <>
      <Box sx={{ 
        display: 'flex', alignItems: 'center', padding: theme.spacing(2, 1.5), minHeight: 72, justifyContent: 'space-between' 
      }}>
        {(open || isMobile) ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 600 }}>
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>{name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{email}</Typography>
                </Box>
              </Box>
              {!isMobile && (
                <IconButton onClick={() => setOpen(false)} size="small">
                  <ChevronLeft />
                </IconButton>
              )}
            </>
          ) : (
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 600, mx: 'auto' }}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
          )}
      </Box>

      <Divider />

      <List sx={{ px: 0.5, py: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            {item.submenu ? (
              <>
                <StyledListItemButton 
                  onClick={() => setPaymentsOpen(!paymentsOpen)}
                  active={item.submenu.some(sub => location.pathname.includes(sub.path)) ? 1 : 0}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.primary' }}>{item.icon}</ListItemIcon>
                  {(open || isMobile) && (
                    <>
                      <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
                      {paymentsOpen ? <ExpandLess /> : <ExpandMore />}
                    </>
                  )}
                </StyledListItemButton>
                <Collapse in={paymentsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subItem) => (
                      <NestedListItemButton 
                        key={subItem.text} 
                        component={Link} 
                        to={subItem.path} 
                        onClick={handleItemClick}
                        selected={isActive(subItem.path)}
                        sx={{ 
                           bgcolor: isActive(subItem.path) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                           color: isActive(subItem.path) ? 'primary.main' : 'text.primary',
                           '& .MuiListItemIcon-root': { color: isActive(subItem.path) ? 'primary.main' : 'inherit' }
                        }}
                      >
                         <ListItemIcon sx={{ minWidth: 30 }}><Circle sx={{ fontSize: 6 }} /></ListItemIcon>
                         <ListItemText primary={subItem.text} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                      </NestedListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <Tooltip title={(!open && !isMobile) ? item.text : ''} placement="right" arrow>
                <StyledListItemButton component={Link} to={item.path} active={isActive(item.path) ? 1 : 0} onClick={handleItemClick}>
                  <ListItemIcon sx={{ minWidth: 40, color: isActive(item.path) ? 'primary.main' : 'text.primary' }}>
                    {item.badge && item.badge > 0 ? (
                      <Badge badgeContent={item.badge} color="error">{item.icon}</Badge>
                    ) : ( item.icon )}
                  </ListItemIcon>
                  {(open || isMobile) && (
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive(item.path) ? 600 : 500, color: isActive(item.path) ? 'primary.main' : 'text.primary' }} />
                  )}
                </StyledListItemButton>
              </Tooltip>
            )}
          </React.Fragment>
        ))}
      </List>
      
      <Divider sx={{ mt: 'auto' }} />
      
      <List sx={{ px: 0.5, py: 1 }}>
         <Tooltip title={(!open && !isMobile) ? 'Logout' : ''} placement="right" arrow>
            <StyledListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}><Logout /></ListItemIcon>
              {(open || isMobile) && (
                <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500, color: 'error.main' }} />
              )}
            </StyledListItemButton>
         </Tooltip>
      </List>
    </>
  );

  return (
    <>
       <Drawer
          variant="temporary"
          open={open && isMobile}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }} 
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidthOpen },
          }}
        >
          {drawerContent}
        </Drawer>

       <StyledDrawer variant="permanent" open={open}>
          {drawerContent}
       </StyledDrawer>

       {(!open && !isMobile) && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed', top: 20, left: 20, zIndex: 1300,
            bgcolor: 'background.paper', boxShadow: 3,
            display: { xs: 'none', md: 'flex' },
            '&:hover': { bgcolor: 'background.paper', boxShadow: 6 }
          }}
        >
          <ChevronRight />
        </IconButton>
      )}

      {(!open && isMobile) && (
        <IconButton
            onClick={() => setOpen(true)}
            sx={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 1300,
                bgcolor: 'primary.main', color: 'white', boxShadow: 3,
                display: { xs: 'flex', md: 'none' },
                '&:hover': { bgcolor: 'primary.dark', boxShadow: 6 }
            }}
        >
            <ChevronRight />
        </IconButton>
      )}
    </>
  );
}