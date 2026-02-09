import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  Person,
  CalendarToday,
  Schedule,
  MeetingRoom,
  Pending
} from '@mui/icons-material';

export default function PendingApprovals() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState({
    open: false,
    meeting: null,
    action: ''
  });
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPendingMeetings();
  }, []);

  const fetchPendingMeetings = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/meetings?role=pending_approval', {
        headers: { Authorization: `Bearer ${token}` }
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
      setError('Failed to load pending meetings');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (meeting, action) => {
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
        setSuccess('Meeting approved successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchPendingMeetings();
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
        setSuccess('Meeting rejected');
        setTimeout(() => setSuccess(''), 3000);
        fetchPendingMeetings();
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
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            Pending Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Meetings awaiting your approval ({meetings.length})
          </Typography>
        </Box>
        <Chip 
          label={`${meetings.length} Pending`}
          color="warning"
          icon={<Pending />}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Meeting Cards */}
      <Stack spacing={2}>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card key={meeting._id}>
              <CardContent>
                <Stack direction="row" spacing={2}>
                  {/* Meeting Info */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {meeting.meeting_name}
                      </Typography>
                      <Chip label={`ID: ${meeting.meetingid}`} size="small" variant="outlined" />
                      <Chip 
                        label={meeting.priority.toUpperCase()} 
                        size="small"
                        color={
                          meeting.priority === 'urgent' ? 'error' :
                          meeting.priority === 'high' ? 'warning' : 'default'
                        }
                      />
                    </Stack>

                    {meeting.meeting_description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {meeting.meeting_description}
                      </Typography>
                    )}

                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Requested by:</strong> {meeting.createdBy?.firstName} {meeting.createdBy?.lastName} ({meeting.createdBy?.facultyId})
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Date:</strong> {formatDate(meeting.meeting_datetime)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Time:</strong> {formatTime(meeting.meeting_datetime)} ({meeting.meeting_duration} min)
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <MeetingRoom fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Venue:</strong> {meeting.venue?.name} ({meeting.venue?.code})
                        </Typography>
                      </Stack>

                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <Typography variant="body2">
                          <strong>Attendees:</strong> {meeting.attendees.length} people
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  {/* Action Buttons */}
                  <Stack spacing={1} sx={{ minWidth: 150 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => openApprovalDialog(meeting, 'approve')}
                      fullWidth
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => openApprovalDialog(meeting, 'reject')}
                      fullWidth
                    >
                      Reject
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => navigate(`/meeting-details?id=${meeting._id}`)}
                    >
                      View Details
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" color="text.secondary">
              No pending approvals
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              All meetings have been reviewed!
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onClose={closeApprovalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.action === 'approve' ? 'Approve Meeting' : 'Reject Meeting'}
        </DialogTitle>
        <DialogContent dividers>
          {approvalDialog.meeting && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {approvalDialog.meeting.meeting_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Requested by: {approvalDialog.meeting.createdBy?.firstName} {approvalDialog.meeting.createdBy?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Date: {formatDate(approvalDialog.meeting.meeting_datetime)} at {formatTime(approvalDialog.meeting.meeting_datetime)}
              </Typography>

              <Divider sx={{ my: 2 }} />

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
                  label="Reason for Rejection *"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  required
                  error={!rejectionReason.trim() && approvalDialog.action === 'reject'}
                  helperText="Required field"
                />
              )}
            </>
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