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
  Tabs,
  Tab,
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
  InputLabel
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
  FilterListAlt
} from '@mui/icons-material';

export default function Home() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [sortFilter, setSortFilter] = useState('all');
  const [userRole, setUserRole] = useState('');
  const [canApprove, setCanApprove] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  
  // Approval dialog state
  const [approvalDialog, setApprovalDialog] = useState({
    open: false,
    meeting: null,
    action: ''
  });
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const userName = localStorage.getItem('firstName') || 'User';

  // 1. Fetch User Info ONCE on mount to establish Role
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 2. Fetch Meetings whenever Tab or Filter changes
  useEffect(() => {
    fetchMeetings();
  }, [currentTab, sortFilter]);

  // 3. Fetch Count immediately when we know the user is an HOD
  useEffect(() => {
    if (canApprove) {
      fetchPendingApprovalCount();
    }
  }, [canApprove]);

  // 4. Poll for pending approval count every 30 seconds for HODs
  useEffect(() => {
    if (!canApprove) return;
    
    const interval = setInterval(() => {
      fetchPendingApprovalCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [canApprove]);

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
        setCanApprove(data.canApproveMeetings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingApprovalCount = async () => {
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      let queryParams = '';
      
      // Tab-based filtering
      switch (currentTab) {
        case 0: // Scheduled (Approved only)
          queryParams = '?status=approved';
          break;
        case 1: // All Meetings
          queryParams = '';
          break;
        case 2: // Completed
          queryParams = '?status=completed';
          break;
        default:
          queryParams = '';
      }

      // Add sort filter
      if (sortFilter !== 'all') {
        queryParams += queryParams ? '&' : '?';
        queryParams += `filter=${sortFilter}`;
      }

      const res = await fetch(`http://localhost:5000/api/meetings${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMeetings(meetings.filter(m => m._id !== id));
        setError('');
        // Refresh count if we deleted a pending meeting
        if (canApprove) fetchPendingApprovalCount();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete meeting');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete meeting');
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        fetchMeetings();
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
    const token = localStorage.getItem('token');

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
        fetchPendingApprovalCount(); // This updates the count immediately
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

  // const handleApprove = async (meeting) => {
  //   // 1. Optimistically hide errors
  //   setError(''); 

  //   try {
  //     const token = localStorage.getItem('token');
  //     const res = await fetch(`http://localhost:5000/api/meetings/${meeting._id}/approve`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify({ comments: approvalComments }) // if you have comments state
  //     });

  //     const data = await res.json();

  //     if (res.ok) {
  //       // ✅ Success: Remove the meeting from the list
  //       setMeetings((prev) => prev.filter((m) => m._id !== meeting._id));
        
  //       // If you have a function to update the badge count, call it here
  //       // fetchPendingApprovalCount(); 
  //     } else {
  //       // ⚠️ Error Case: Check if it's the "Already Done" error
  //       if (res.status === 400 || data.message === "Meeting is not pending approval") {
          
  //         // FORCE REMOVE: The server says it's already done, so remove it from UI
  //         setMeetings((prev) => prev.filter((m) => m._id !== meeting._id));
          
  //         // Optional: Show a success message instead of an error
  //         alert("Meeting was already processed. List updated.");
  //       } else {
  //         // Real error (e.g., Database failed), keep it on screen
  //         setError(data.message);
  //       }
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     setError('Failed to connect to server');
  //   }
  // };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    const token = localStorage.getItem('token');

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
        fetchPendingApprovalCount(); // This updates the count immediately
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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <Box sx={{ pl: { xs: 2, md: 10 }, pr: 2, pt: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Welcome, {userName}!
          </Typography>
          {userRole && <Chip label={userRole} size="small" color="primary" />}
          
          {/* MODIFIED: Removed `&& pendingApprovalCount > 0`.
              It now shows for all HODs (canApprove=true), regardless of count.
              Added `showZero` to Badge to make 0 visible if desired.
          */}
          {canApprove && (
            <Tooltip title="Pending approvals">
              <Badge badgeContent={pendingApprovalCount} color="error" showZero>
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
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh meetings">
            <IconButton onClick={fetchMeetings} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Box sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter By</InputLabel>
              <Select
                value={sortFilter}
                label="Filter By"
                onChange={(e) => setSortFilter(e.target.value)}
                startAdornment={<FilterListAlt sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">All Meetings</MenuItem>
                <MenuItem value="created">Created by Me</MenuItem>
                <MenuItem value="department">Department Meetings</MenuItem>
                <MenuItem value="followup">Follow-up Meetings</MenuItem>
                <MenuItem value="high_priority">High Priority</MenuItem>
                <MenuItem value="this_week">This Week</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button variant="outlined" color="error" onClick={handleLogout}>
            Logout
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="Scheduled" />
          <Tab label="All Meetings" />
          <Tab label="Completed" />
        </Tabs>
      </Box>

      {/* Meeting Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {loading ? (
          <Typography>Loading meetings...</Typography>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card 
              key={meeting._id} 
              sx={{ 
                width: 360, 
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                }
              }}
              onClick={(e) => handleCardClick(meeting._id, e)}
            >
              {/* Status Badge */}
              <Chip
                label={getStatusLabel(meeting.status)}
                color={getStatusColor(meeting.status)}
                size="small"
                sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
              />

              {/* Follow-up Badge (F symbol) */}
              {meeting.isFollowup && (
                <Chip
                  label="F"
                  color="secondary"
                  size="small"
                  icon={<CallSplit />}
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: meeting.priority !== 'medium' ? 90 : 50, 
                    zIndex: 1,
                    minWidth: 32,
                    height: 24
                  }}
                />
              )}

              {/* Priority Badge */}
              {meeting.priority !== 'medium' && (
                <Chip
                  label={meeting.priority.toUpperCase()}
                  color={getPriorityColor(meeting.priority)}
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 50, zIndex: 1 }}
                />
              )}

              {/* Rating Badge (NEW) */}
              {meeting.rating && (
                <Chip
                  label={`★ ${meeting.rating}`}
                  color="primary"
                  size="small"
                  sx={{ position: 'absolute', top: 40, right: 8, zIndex: 1 }}
                />
              )}

              {/* Menu */}
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
                sx={{ objectFit: 'cover' }}
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

                <Chip
                  label={meeting.meetingType?.replace('-', ' ').toUpperCase() || 'INTERNAL'}
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Person fontSize="small" color="action" />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span">
                        {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                      </Typography>
                      <Chip 
                        label={meeting.createdBy?.facultyId} 
                        size="small" 
                        sx={{ height: 18 }}
                      />
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatDate(meeting.meeting_datetime)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatTime(meeting.meeting_datetime)} ({meeting.meeting_duration} min)
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <MeetingRoom fontSize="small" color="action" />
                    <Typography variant="body2">
                      {meeting.venue?.name} ({meeting.venue?.code})
                    </Typography>
                  </Stack>

                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <People fontSize="small" color="action" />
                      <Typography variant="body2">
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                      </Typography>
                    </Stack>
                  )}

                  {meeting.departments && meeting.departments.length > 0 && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Business fontSize="small" color="action" />
                      <Box>
                        {meeting.departments.map(dept => (
                          <Chip 
                            key={dept._id}
                            label={dept.code}
                            size="small"
                            sx={{ mr: 0.5, height: 18 }}
                          />
                        ))}
                      </Box>
                    </Stack>
                  )}

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Info fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      ID: <strong>{meeting.meetingid}</strong>
                    </Typography>
                  </Stack>

                  {meeting.status === 'pending_approval' && meeting.approver && canApprove && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={(e) => openApprovalDialog(meeting, 'approve', e)}
                        fullWidth
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={(e) => openApprovalDialog(meeting, 'reject', e)}
                        fullWidth
                      >
                        Reject
                      </Button>
                    </Stack>
                  )}

                  <Button
                    size="small"
                    variant="text"
                    startIcon={<Visibility />}
                    sx={{ mt: 1 }}
                  >
                    Click to view details
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', width: '100%', py: 5 }}>
            <Typography variant="h6" color="text.secondary">
              No meetings found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {currentTab === 2 ? 'No completed meetings yet' : 'Create your first meeting to get started!'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { 
          navigate(`/meeting-details?id=${selectedMeeting?._id}`);
          handleMenuClose();
        }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        {selectedMeeting?.status === 'pending_approval' && (
          <MenuItem onClick={() => { 
            navigate(`/edit-meeting/${selectedMeeting?._id}`);
            handleMenuClose();
          }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {selectedMeeting?.status === 'approved' && (
          <MenuItem onClick={() => {
            handleCancel(selectedMeeting?._id);
            handleMenuClose();
          }}>
            <ListItemIcon><Cancel fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Cancel Meeting</ListItemText>
          </MenuItem>
        )}

        {selectedMeeting?.status === 'pending_approval' && (
          <MenuItem onClick={() => {
            handleDelete(selectedMeeting?._id);
            handleMenuClose();
          }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={closeApprovalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Approve Meeting' : 'Reject Meeting'}
        </DialogTitle>
        <DialogContent>
          {approvalDialog.meeting && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {approvalDialog.meeting.meeting_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requested by: {approvalDialog.meeting.createdBy?.firstName} {approvalDialog.meeting.createdBy?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {formatDate(approvalDialog.meeting.meeting_datetime)} at {formatTime(approvalDialog.meeting.meeting_datetime)}
              </Typography>
            </Box>
          )}

          {approvalDialog.action === 'approve' ? (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Comments (Optional)"
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Add any comments or notes..."
            />
          ) : (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              required
              error={!rejectionReason.trim() && approvalDialog.action === 'reject'}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApprovalDialog}>Cancel</Button>
          <Button
            onClick={approvalDialog.action === 'approve' ? handleApprove : handleReject}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
          >
            {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}