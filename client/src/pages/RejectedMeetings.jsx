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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  Block,
  Person,
  CalendarToday,
  Schedule,
  MeetingRoom,
  Info,
  Visibility
} from '@mui/icons-material';

export default function RejectedMeetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRejectedMeetings();
  }, []);

  const fetchRejectedMeetings = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/meetings/rejected-cancelled', {
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
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialog(true);
  };

  const formatDate = (dt) =>
    new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getReasonText = (meeting) => {
    if (meeting.status === 'rejected') {
      return {
        type: 'Rejected by HOD',
        reason: meeting.rejectionReason,
        by: meeting.approver,
        date: meeting.approvalDate
      };
    } else if (meeting.status === 'cancelled') {
      return {
        type: 'Cancelled by User',
        reason: meeting.cancellationReason,
        by: meeting.cancelledBy,
        date: meeting.cancelledAt
      };
    }
    return null;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            Rejected & Cancelled Meetings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View all meetings that were rejected or cancelled
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Compact Cards Grid */}
      <Grid container spacing={2}>
        {loading ? (
          <Grid item xs={12}>
            <Typography>Loading...</Typography>
          </Grid>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => {
            const reasonData = getReasonText(meeting);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={meeting._id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-4px)'
                    }
                  }}
                  onClick={() => handleViewDetails(meeting)}
                >
                  <CardContent>
                    {/* Status Chip */}
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={reasonData?.type}
                        color={meeting.status === 'rejected' ? 'error' : 'default'}
                        size="small"
                        icon={meeting.status === 'rejected' ? <Block /> : <Cancel />}
                      />
                    </Box>

                    {/* Meeting Name */}
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {meeting.meeting_name}
                    </Typography>

                    {/* Meeting ID */}
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      ID: {meeting.meetingid}
                    </Typography>

                    {/* Date */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <CalendarToday sx={{ fontSize: 14 }} color="action" />
                      <Typography variant="caption">
                        {formatDate(meeting.meeting_datetime)}
                      </Typography>
                    </Stack>

                    {/* Host */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Person sx={{ fontSize: 14 }} color="action" />
                      <Typography variant="caption">
                        {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                      </Typography>
                    </Stack>

                    {/* Reason Preview */}
                    <Alert severity={meeting.status === 'rejected' ? 'error' : 'warning'} sx={{ mt: 2, py: 0 }}>
                      <Typography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reasonData?.reason || 'No reason provided'}
                      </Typography>
                    </Alert>

                    {/* View Button */}
                    <Button
                      size="small"
                      fullWidth
                      startIcon={<Visibility />}
                      sx={{ mt: 1 }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h6" color="text.secondary">
                No rejected or cancelled meetings
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All your meetings are active!
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMeeting && (
          <>
            <DialogTitle>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedMeeting.meeting_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Meeting ID: {selectedMeeting.meetingid}
                  </Typography>
                </Box>
                <Chip
                  label={selectedMeeting.status === 'rejected' ? 'REJECTED' : 'CANCELLED'}
                  color={selectedMeeting.status === 'rejected' ? 'error' : 'default'}
                  icon={selectedMeeting.status === 'rejected' ? <Block /> : <Cancel />}
                />
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={3}>
                {/* Rejection/Cancellation Info */}
                <Alert severity={selectedMeeting.status === 'rejected' ? 'error' : 'warning'}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {getReasonText(selectedMeeting)?.type}
                  </Typography>
                  <Typography variant="body2">
                    {getReasonText(selectedMeeting)?.reason || 'No reason provided'}
                  </Typography>
                  {getReasonText(selectedMeeting)?.date && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      On {formatDate(getReasonText(selectedMeeting).date)} at {formatTime(getReasonText(selectedMeeting).date)}
                    </Typography>
                  )}
                </Alert>

                <Divider />

                {/* Meeting Details */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Meeting Details
                  </Typography>
                  
                  {selectedMeeting.meeting_description && (
                    <Typography variant="body2" paragraph>
                      {selectedMeeting.meeting_description}
                    </Typography>
                  )}

                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Host:</strong> {selectedMeeting.createdBy?.firstName} {selectedMeeting.createdBy?.lastName} ({selectedMeeting.createdBy?.facultyId})
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarToday fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Scheduled:</strong> {formatDate(selectedMeeting.meeting_datetime)} at {formatTime(selectedMeeting.meeting_datetime)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Duration:</strong> {selectedMeeting.meeting_duration} minutes
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <MeetingRoom fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Venue:</strong> {selectedMeeting.venue?.name} ({selectedMeeting.venue?.code})
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Info fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Type:</strong> {selectedMeeting.meetingType}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Info fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Priority:</strong> {selectedMeeting.priority.toUpperCase()}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Divider />

                {/* Attendees */}
                {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Attendees ({selectedMeeting.attendees.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedMeeting.attendees.map((att, idx) => (
                        <Chip
                          key={idx}
                          label={`${att.user?.firstName} ${att.user?.lastName}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Agenda */}
                {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Agenda
                      </Typography>
                      {selectedMeeting.agenda.map((item, idx) => (
                        <Box key={idx} sx={{ ml: 2, mb: 1 }}>
                          <Typography variant="body2">
                            {idx + 1}. <strong>{item.title}</strong>
                          </Typography>
                          {item.description && (
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialog(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}