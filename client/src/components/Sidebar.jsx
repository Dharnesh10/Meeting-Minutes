import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';

import {
  Home,
  Logout,
  PlaylistAddCheck,
  AssignmentTurnedIn,
  Groups,
  Description,
  CalendarMonth,
  ChevronLeft,
  ChevronRight,
  Add,
  Block
} from '@mui/icons-material';

import {jwtDecode} from 'jwt-decode';

const drawerWidth = 300;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
}));

export default function Sidebar({ open, setOpen }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const [name, setName] = React.useState('User');
  const [email, setEmail] = React.useState('');

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setName(decoded.name || decoded.userName || 'User');
      setEmail(decoded.email || decoded.userEmail || '');
    } catch (error) {
      console.error('Failed to decode token:', error);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Toggle button visible even when drawer is closed */}
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 10,
            zIndex: theme.zIndex.drawer + 1,
            // bgcolor: 'background.paper',
            // border: '1px solid',
          }}
        >
          <ChevronRight />
        </IconButton>
      )}

      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <DrawerHeader>
          <Box>
            <Typography variant="subtitle1">Welcome, {name}!</Typography>
            <Typography variant="body2" color="text.secondary">
              {email || 'No email available'}
            </Typography>
          </Box>

          <IconButton onClick={() => setOpen(false)}>
            <ChevronLeft />
          </IconButton>
        </DrawerHeader>

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/create-meeting">
              <Tooltip title="Create Meeting" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <Add />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Create Meeting" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton component={Link} to="/">
              <Tooltip title="Home" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <Home />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton component={Link} to="/tasks">
              <Tooltip title="Tasks" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <PlaylistAddCheck />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Tasks" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton component={Link} to="/rejected-meetings">
              <Tooltip title="Rejected Meetings" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <Block />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Rejected Meetings" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton component={Link} to="/calendar">
              <Tooltip title="Calendar" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <CalendarMonth />
                </ListItemIcon>
              </Tooltip>
              <ListItemText primary="Calendar" />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ mt: 'auto' }} />

        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <Tooltip title="Logout" placement="right" disableHoverListener={open}>
                <ListItemIcon>
                  <Logout />
                </ListItemIcon>
              </Tooltip>
              <ListItemText
                primary="Logout"
                secondary={email || 'No email available'}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </Box>
  );
}
