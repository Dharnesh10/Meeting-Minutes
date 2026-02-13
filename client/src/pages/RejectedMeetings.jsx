import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
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
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Block,
  CalendarToday,
  Person,
  ErrorOutline,
  Visibility,
  Cancel
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

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Section */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 4 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mt: -0.5 }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: '#1a237e' }}>
            Rejected & Cancelled Meetings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View all meetings that were rejected or cancelled
          </Typography>
        </Box>
      </Stack>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Grid Container */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: { xs: 'center', md: 'flex-start' } }}>
        
        {loading ? (
           <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 5 }}>
             <CircularProgress />
           </Box>
        ) : meetings.length === 0 ? (
           <Alert severity="info" sx={{ width: '100%' }}>No rejected or cancelled meetings found.</Alert>
        ) : (
          meetings.map((meeting) => (
            <Card 
              key={meeting._id} 
              sx={{ 
                width: 300, 
                height: 400, 
                borderRadius: '24px', // Large rounded corners like the image
                boxShadow: '0px 4px 20px rgba(0,0,0,0.05)',
                p: 3,
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0px 8px 30px rgba(0,0,0,0.1)' }
              }}
            >
              {/* Badge */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  icon={meeting.status === 'rejected' ? <Block sx={{ fontSize: 16 }} /> : <Cancel sx={{ fontSize: 16 }} />}
                  label={meeting.status === 'rejected' ? "Rejected by HOD" : "Cancelled"}
                  sx={{ 
                    bgcolor: meeting.status === 'rejected' ? '#ff3d00' : '#757575', 
                    color: 'white',
                    fontWeight: 600,
                    height: 28,
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
              </Box>

              {/* Title & ID */}
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem', mb: 0.5 }}>
                {meeting.meeting_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                ID: {meeting.meetingid || meeting._id.slice(-6)}
              </Typography>

              {/* Date & User Info */}
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.primary">
                    {formatDate(meeting.meeting_datetime)}
                  </Typography>
                </Stack>
                
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Person sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.primary">
                    {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                  </Typography>
                </Stack>
              </Stack>

              {/* Reason Box */}
              <Box 
                sx={{ 
                  bgcolor: '#fff5f5', // Light red background
                  borderRadius: '12px',
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  mb: 'auto' // Push footer to bottom
                }}
              >
                <ErrorOutline sx={{ color: '#d32f2f', fontSize: 20, mt: 0.2 }} />
                <Typography variant="body2" sx={{ color: '#c62828', fontSize: '0.9rem' }}>
                  {meeting.status === 'rejected' 
                    ? (meeting.rejectionReason || 'No reason provided') 
                    : (meeting.cancellationReason || 'No reason provided')}
                </Typography>
              </Box>

              {/* View Details Link */}
              <Button
                startIcon={<Visibility />}
                onClick={() => handleViewDetails(meeting)}
                sx={{ 
                  textTransform: 'none', 
                  color: '#3f51b5', 
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  mt: 2
                }}
              >
                View Details
              </Button>
            </Card>
          ))
        )}
      </Box>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialog} 
        onClose={() => setDetailsDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Meeting Details</DialogTitle>
        <DialogContent dividers>
          {selectedMeeting && (
            <Stack spacing={2}>
               <Box>
                 <Typography variant="subtitle2" color="text.secondary">Meeting Name</Typography>
                 <Typography variant="body1" fontWeight={500}>{selectedMeeting.meeting_name}</Typography>
               </Box>
               <Box>
                 <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                 <Typography variant="body1">
                   {new Date(selectedMeeting.meeting_datetime).toLocaleString()}
                 </Typography>
               </Box>
               <Box>
                 <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                 <Typography variant="body1" color="error">
                    {selectedMeeting.status === 'rejected' 
                        ? selectedMeeting.rejectionReason 
                        : selectedMeeting.cancellationReason || 'N/A'}
                 </Typography>
               </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}