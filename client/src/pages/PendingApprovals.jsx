import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Person,
  CalendarToday,
  Schedule,
  MeetingRoom,
  ArrowBack,
  Business,
  PriorityHigh
} from '@mui/icons-material';

export default function PendingApprovals() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvalDialog, setApprovalDialog] = useState({ open: false, meeting: null, action: '' });
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPendingMeetings();
  }, []);

  const fetchPendingMeetings = async () => {
    setLoading(true);
    try {
      // Assuming your API supports a status filter
      const res = await fetch('http://localhost:5000/api/meetings?status=pending_approval', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      } else {
        setError('Failed to fetch pending approvals');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const isApprove = approvalDialog.action === 'approve';
    const endpoint = isApprove ? 'approve' : 'reject';
    const body = isApprove 
      ? { comments: approvalComments } 
      : { reason: rejectionReason };

    if (!isApprove && !rejectionReason.trim()) {
      setError('A rejection reason is required');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${approvalDialog.meeting._id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setMeetings(meetings.filter(m => m._id !== approvalDialog.meeting._id));
        closeDialog();
      } else {
        const data = await res.json();
        setError(data.message || 'Action failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const openDialog = (meeting, action) => {
    setApprovalDialog({ open: true, meeting, action });
    setApprovalComments('');
    setRejectionReason('');
  };

  const closeDialog = () => setApprovalDialog({ open: false, meeting: null, action: '' });

  const formatDate = (dt) => new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Box sx={{ p: 3, maxWidth: 1000, margin: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">Approvals Queue</Typography>
        <Chip label={`${meetings.length} Pending`} color="warning" />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Typography>Loading pending requests...</Typography>
      ) : meetings.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#f9f9f9' }}>
          <CheckCircle sx={{ fontSize: 60, color: 'success.light', mb: 2 }} />
          <Typography variant="h6">All caught up!</Typography>
          <Typography color="text.secondary">There are no meetings currently awaiting your approval.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {meetings.map((meeting) => (
            <Card key={meeting._id} variant="outlined" sx={{ borderRadius: 2, '&:hover': { boxShadow: 2 } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {meeting.meeting_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Requested by: <strong>{meeting.createdBy?.firstName} {meeting.createdBy?.lastName}</strong>
                    </Typography>
                  </Box>
                  <Chip 
                    label={meeting.priority?.toUpperCase()} 
                    color={meeting.priority === 'urgent' ? 'error' : 'warning'} 
                    size="small" 
                    icon={<PriorityHigh fontSize="small" />}
                  />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(meeting.meeting_datetime)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2">{formatTime(meeting.meeting_datetime)} ({meeting.meeting_duration} min)</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MeetingRoom fontSize="small" color="action" />
                        <Typography variant="body2">{meeting.venue?.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Business fontSize="small" color="action" />
                        <Typography variant="body2">Depts: {meeting.departments?.map(d => d.code).join(', ')}</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="success" 
                    startIcon={<CheckCircle />}
                    onClick={() => openDialog(meeting, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    color="error" 
                    startIcon={<Cancel />}
                    onClick={() => openDialog(meeting, 'reject')}
                  >
                    Reject
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Reusable Action Dialog */}
      <Dialog open={approvalDialog.open} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Finalize Approval' : 'Specify Rejection Reason'}
        </DialogTitle>
        <DialogContent>
          {approvalDialog.action === 'approve' ? (
            <TextField
              autoFocus
              margin="dense"
              label="Optional Comments"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
            />
          ) : (
            <TextField
              autoFocus
              margin="dense"
              label="Why is this meeting rejected?"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              error={!rejectionReason.trim()}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button 
            onClick={handleAction} 
            variant="contained" 
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
          >
            Confirm {approvalDialog.action === 'approve' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Add Grid import from MUI if not already present
import { Grid } from '@mui/material';