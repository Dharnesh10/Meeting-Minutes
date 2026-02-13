import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import {
  Person,
  CalendarToday,
  Schedule,
  MeetingRoom,
  Refresh,
  Delete,
  Edit,
  CheckCircle,
  Cancel,
  Pending,
  MoreVert,
  Business,
  People,
  Info,
  Visibility,
  CallSplit,
  FilterList,
  ExpandMore,
  RememberMe,
  VpnKey
} from '@mui/icons-material';

// ACCEPT 'type' PROP TO DETERMINE WHICH MEETINGS TO SHOW
export default function Home({ type = 'all' }) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortFilter, setSortFilter] = useState('all');
  const [userRole, setUserRole] = useState('');
  const [canApprove, setCanApprove] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const [approvalDialog, setApprovalDialog] = useState({
    open: false,
    meeting: null,
    action: ''
  });
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const userName = localStorage.getItem('firstName') || 'User';
  const token = localStorage.getItem('token');
  const [filterAnchor, setFilterAnchor] = useState(null);

  // FETCH WHENEVER 'type' CHANGES (Route change)
  useEffect(() => {
    fetchUserInfo();
    fetchMeetings();
  }, [type, sortFilter]);

  useEffect(() => {
    if (!canApprove) return;
    const interval = setInterval(() => {
      fetchPendingApprovalCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [canApprove]);

  const fetchUserInfo = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
        setCanApprove(data.canApproveMeetings);
        if (data.canApproveMeetings) {
          fetchPendingApprovalCount();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingApprovalCount = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/meetings/pending-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalCount(data.count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeetings = async () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      let queryParams = '';
      
      // LOGIC REPLACING THE TABS
      switch (type) {
        case 'scheduled':
          // Scheduled typically means "Upcoming" or "Approved"
          queryParams = '?status=approved'; 
          break;
        case 'completed':
          queryParams = '?status=completed';
          break;
        case 'cancelled': // Add this case for your Rejected/Cancelled page
          queryParams = '?status=cancelled';
          break;
        case 'all':
        default:
          queryParams = ''; // Fetch all
          break;
      }

      if (sortFilter !== 'all') {
        queryParams += queryParams ? '&' : '?';
        queryParams += `filter=${sortFilter}`;
      }

      const res = await fetch(`http://localhost:5000/api/meetings${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      setMeetings(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get Page Title based on prop
  const getPageTitle = () => {
    switch(type) {
      case 'scheduled': return 'Scheduled Meetings';
      case 'completed': return 'Completed Meetings';
      default: return 'All Meetings';
    }
  }

  // ... (Keep handleCardClick, handleEdit, handleDelete, handleCancel, Approvals, formatDate, formatTime, getStatusColor, getStatusLabel, getPriorityColor, handleMenuOpen, handleMenuClose exactly as before) ...

  const handleCardClick = (meetingId, event) => {
    if (
      event.target.closest('button') ||
      event.target.closest('.MuiIconButton-root') ||
      event.target.closest('.MuiButton-root')
    ) {
      return;
    }
    navigate(`/meeting-details?id=${meetingId}`);
  };

  const handleEdit = (meeting, event) => {
    event.stopPropagation();
    navigate(`/edit-meeting/${meeting._id}`);
  };

  const handleDelete = async (meeting, event) => {
    event.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meeting._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMeetings(meetings.filter(m => m._id !== meeting._id));
        setError('');
        handleMenuClose();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete meeting');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete meeting');
    }
  };

  const handleCancel = async (meeting, event) => {
    event.stopPropagation();
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meeting._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchMeetings();
        handleMenuClose();
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to cancel meeting');
    }
  };

  const openApprovalDialog = (meeting, action, event) => {
    event.stopPropagation();
    setApprovalDialog({ open: true, meeting, action });
    setApprovalComments('');
    setRejectionReason('');
  };

  const closeApprovalDialog = () => {
    setApprovalDialog({ open: false, meeting: null, action: '' });
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/meetings/${approvalDialog.meeting._id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comments: approvalComments })
        }
      );
      if (res.ok) {
        fetchMeetings();
        fetchPendingApprovalCount();
        closeApprovalDialog();
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to approve meeting');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:5000/api/meetings/${approvalDialog.meeting._id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectionReason })
        }
      );
      if (res.ok) {
        fetchMeetings();
        fetchPendingApprovalCount();
        closeApprovalDialog();
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to reject meeting');
    }
  };

  const formatDate = (dt) =>
    new Date(dt).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending_approval': return 'warning';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      case 'completed': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'APPROVED';
      case 'pending_approval': return 'APPROVAL PENDING';
      case 'completed': return 'COMPLETED';
      case 'rejected': return 'REJECTED';
      case 'cancelled': return 'CANCELLED';
      default: return status.toUpperCase();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const handleMenuOpen = (event, meeting) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedMeeting(meeting);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMeeting(null);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* If looking at All Meetings, say Welcome. If sub-page, show Title */}
          {type === 'all' ? (
            <Typography variant="h5" fontWeight="bold">
              Welcome, {userName}!
            </Typography>
          ) : (
            <Typography variant="h5" fontWeight="bold">
              {getPageTitle()}
            </Typography>
          )}
          
          {userRole && <Chip label={userRole} size="small" color="primary" />}
          
          {canApprove && (
            <Tooltip title="Pending approvals">
              <Badge badgeContent={pendingApprovalCount ? pendingApprovalCount : "0"} color="error">
                <Chip 
                  label="Approvals Pending" 
                  color="warning" 
                  icon={<Pending />}
                  onClick={() => navigate('/pending-approvals')}
                  sx={{ cursor: 'pointer' }}
                />
              </Badge>
            </Tooltip>
          )}
        </Box>
        
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
          <Tooltip title="Refresh meetings">
            <IconButton onClick={fetchMeetings} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Box>
            <Button
              variant="text"
              startIcon={<FilterList />}
              endIcon={<ExpandMore fontSize="small" />}
              onClick={(e) => setFilterAnchor(e.currentTarget)} // You need to add this state
              sx={{ 
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: 'transparent', color: 'primary.main' }
              }}
            >
              {/* Map value to label for display */}
              {sortFilter === 'all' ? 'Filter' : 
              sortFilter === 'created' ? 'My Meetings' : 
              sortFilter.replace('_', ' ')}
            </Button>
            
            <Menu
              anchorEl={filterAnchor} // Add state: const [filterAnchor, setFilterAnchor] = useState(null);
              open={Boolean(filterAnchor)}
              onClose={() => setFilterAnchor(null)}
              PaperProps={{
                sx: { mt: 1, minWidth: 180, borderRadius: 1, boxShadow: 3 }
              }}
            >
              <MenuItem onClick={() => { setSortFilter('all'); setFilterAnchor(null); }} selected={sortFilter === 'all'}>
                All Meetings
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={() => { setSortFilter('created'); setFilterAnchor(null); }}>Created by Me</MenuItem>
              <MenuItem onClick={() => { setSortFilter('department'); setFilterAnchor(null); }}>Department</MenuItem>
              <MenuItem onClick={() => { setSortFilter('followup'); setFilterAnchor(null); }}>Follow-up</MenuItem>
              <MenuItem onClick={() => { setSortFilter('high_priority'); setFilterAnchor(null); }}>High Priority</MenuItem>
              <MenuItem onClick={() => { setSortFilter('this_week'); setFilterAnchor(null); }}>This Week</MenuItem>
            </Menu>
          </Box>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Meeting Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
        {loading ? (
          <Typography>Loading meetings...</Typography>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card 
              key={meeting._id} 
              sx={{ 
                width: { xs: '100%', sm: 360 },
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-8px)', boxShadow: 6 }
              }}
              onClick={(e) => handleCardClick(meeting._id, e)}
            >
              <Chip
                label={getStatusLabel(meeting.status)}
                color={getStatusColor(meeting.status)}
                size="small"
                sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  left: 8, 
                  zIndex: 1,
                  color: 'white', // This forces the text color to white
                  // Optional: if the icon is also looking dark, add this:
                  '& .MuiChip-icon': { color: 'white' } 
                }}
              />
              {meeting.priority !== 'medium' && (
                <Chip
                  label={meeting.priority.toUpperCase()}
                  color={getPriorityColor(meeting.priority)}
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 50, zIndex: 1 }}
                />
              )}
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                onClick={(e) => handleMenuOpen(e, meeting)}
              >
                <MoreVert />
              </IconButton>

              <CardMedia
                component="img"
                height="140"
                image="/meeting.png"
                alt="Meeting"
                sx={{
                  width: '90%',        // Makes it smaller (90% of card width)
                  height: 210,        // Fixed height
                  marginTop: '25px',   // Adds spacing top
                  marginX: 'auto',    // Centers the image horizontally
                  borderRadius: 2,     // rounds the corners of the image
                  objectFit: 'cover'   // keeps the image looking good
                }}
              />

              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {meeting.meeting_name}
                  {meeting.isFollowup && ' 🔗'}
                </Typography>

                {meeting.meeting_description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {meeting.meeting_description.slice(0, 100)}
                    {meeting.meeting_description.length > 100 && '...'}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    label={meeting.meetingType?.replace('-', ' ').toUpperCase() || 'INTERNAL'}
                    size="small"
                  />
                  {meeting.isFollowup && (
                    <Chip
                      label="F"
                      color="primary"
                      size="small"
                      icon={<CallSplit />}
                      sx={{ minWidth: 32, height: 24 }}
                    />
                  )}
                </Box>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Person fontSize="small" color="action" />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span">
                        {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                      </Typography>
                      <Chip label={meeting.createdBy?.facultyId} size="small" sx={{ height: 18 }} />
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">{formatDate(meeting.meeting_datetime)}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2">{formatTime(meeting.meeting_datetime)} - {formatTime(new Date(new Date(meeting.meeting_datetime).getTime() + meeting.meeting_duration * 60000))} ({meeting.meeting_duration} min)</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MeetingRoom fontSize="small" color="action" />
                    <Typography variant="body2">{meeting.venue?.name} ({meeting.venue?.code})</Typography>
                  </Stack>
                  {meeting.departments && meeting.departments.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Business fontSize="small" color="action" />
                      <Box>
                        {meeting.departments.map(dept => (
                          <Chip key={dept._id} label={dept.code} size="small" sx={{ mr: 0.5, height: 18 }} />
                        ))}
                      </Box>
                    </Stack>
                  )}
                  {meetings.map(m => {
                    if (m._id === meeting._id && m.attendees && m.attendees.length > 0) {
                      return (
                        <Stack direction="row" spacing={1} alignItems="center" key={m._id}>
                          <VpnKey fontSize="small" color="action" />
                          <Typography variant="body2">Meeting id: {m.meetingid}</Typography>
                        </Stack>
                      );
                    }
                    return null;
                  })}
                  {meeting.status === 'pending_approval' && meeting.approver && canApprove && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={(e) => openApprovalDialog(meeting, 'approve', e)} fullWidth>Approve</Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} onClick={(e) => openApprovalDialog(meeting, 'reject', e)} fullWidth>Reject</Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', width: '100%', py: 5 }}>
            <Typography variant="h6" color="text.secondary">No meetings found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {type === 'completed' ? 'No completed meetings yet' : 
               type === 'scheduled' ? 'No upcoming scheduled meetings' : 
               'Create your first meeting to get started!'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { navigate(`/meeting-details?id=${selectedMeeting?._id}`); handleMenuClose(); }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {selectedMeeting?.status === 'pending_approval' && (
          <MenuItem onClick={(e) => handleEdit(selectedMeeting, e)}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedMeeting?.status === 'approved' && (!userRole === 'HOD') && (
          <MenuItem onClick={(e) => handleCancel(selectedMeeting, e)}>
            <ListItemIcon><Cancel fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Cancel Meeting</ListItemText>
          </MenuItem>
        )}
        {selectedMeeting?.status === 'pending_approval' && (
          <MenuItem onClick={(e) => handleDelete(selectedMeeting, e)}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={closeApprovalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{approvalDialog.action === 'approve' ? 'Approve Meeting' : 'Reject Meeting'}</DialogTitle>
        <DialogContent>
           {approvalDialog.action === 'approve' ? (
            <TextField fullWidth multiline rows={3} label="Comments (Optional)" value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} sx={{ mt: 2 }} />
          ) : (
            <TextField fullWidth multiline rows={3} label="Reason for Rejection" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} required error={!rejectionReason.trim() && approvalDialog.action === 'reject'} sx={{ mt: 2 }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApprovalDialog}>Cancel</Button>
          <Button onClick={approvalDialog.action === 'approve' ? handleApprove : handleReject} variant="contained" color={approvalDialog.action === 'approve' ? 'success' : 'error'}>
            {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}