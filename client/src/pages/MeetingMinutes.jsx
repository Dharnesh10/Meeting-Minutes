// MeetingMinutes.jsx - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Badge,
  Tooltip,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Send,
  Close,
  PersonAdd,
  PersonRemove,
  PlayArrow,
  Stop,
  ArrowBack,
  MoreVert,
  Check,
  AccessTime,
  Person
} from '@mui/icons-material';

export default function MeetingMinutes() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const meetingId = searchParams.get('id');

  const [meeting, setMeeting] = useState(null);
  const [minutes, setMinutes] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [newMinute, setNewMinute] = useState('');
  const [editingMinute, setEditingMinute] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [scribeDialog, setScribeDialog] = useState(false);
  const [attendees, setAttendees] = useState([]);

  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingInterval = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!meetingId) {
      navigate('/');
      return;
    }
    fetchMinutes();
    fetchAttendees();
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId || !meeting) return;

    pollingInterval.current = setInterval(() => {
      pollForUpdates();
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [meetingId, lastUpdate, meeting]);

  const fetchMinutes = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/minutes/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      setMeeting(data.meeting);
      setMinutes(data.minutes);
      setPermissions(data.permissions);
      setLastUpdate(new Date().toISOString());
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load meeting minutes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAttendees(data.attendees || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pollForUpdates = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/poll?lastUpdate=${lastUpdate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();

        if (data.updates.length > 0) {
          setMinutes(prev => {
            const updated = [...prev];
            data.updates.forEach(newMin => {
              const index = updated.findIndex(m => m._id === newMin._id);
              if (index >= 0) {
                updated[index] = newMin;
              } else {
                updated.push(newMin);
              }
            });
            return updated.sort((a, b) => a.order - b.order);
          });
        }

        if (data.deleted.length > 0) {
          setMinutes(prev => prev.filter(m => !data.deleted.includes(m._id)));
        }

        if (data.meetingState) {
          setMeeting(prev => ({
            ...prev,
            currentScribe: data.meetingState.currentScribe,
            meetingStarted: data.meetingState.meetingStarted,
            meetingEnded: data.meetingState.meetingEnded
          }));
        }

        // ⭐ FIX: Update permissions from polling
        if (data.permissions) {
          setPermissions(data.permissions);
        }

        setLastUpdate(data.timestamp);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const handleAddMinute = async () => {
    if (!newMinute.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/minutes/${meetingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMinute })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setNewMinute('');
      setSuccess('Minute added successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      setMinutes(prev => [...prev, data.minute]);

    } catch (err) {
      setError(err.message || 'Failed to add minute');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEditMinute = (minute) => {
    setEditingMinute(minute);
    setEditContent(minute.content);
  };

  const handleUpdateMinute = async () => {
    if (!editContent.trim()) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/${editingMinute._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: editContent })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setEditingMinute(null);
      setEditContent('');
      setSuccess('Minute updated successfully');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to update minute');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteMinute = async (minuteId) => {
    if (!window.confirm('Are you sure you want to delete this minute?')) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/${minuteId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }

      setSuccess('Minute deleted successfully');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to delete minute');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleApproveScribe = async (userId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/scribe/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setScribeDialog(false);
      setSuccess(`${data.scribe.firstName} ${data.scribe.lastName} is now the scribe`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to approve scribe');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleRemoveScribe = async () => {
    if (!window.confirm('Remove current scribe? You will become the scribe again.')) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/scribe/remove`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setSuccess('You are now the scribe');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to remove scribe');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleStartMeeting = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/start`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setSuccess('Meeting started!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to start meeting');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEndMeeting = async () => {
    if (!window.confirm('End this meeting? No more minutes can be added after this.')) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/minutes/${meetingId}/end`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setSuccess('Meeting ended');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.message || 'Failed to end meeting');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const currentUserId = localStorage.getItem('userId');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Typography>Loading meeting minutes...</Typography>
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Meeting not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            {meeting.meeting_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(meeting.meeting_datetime)} at {formatTime(new Date(new Date(meeting.meeting_datetime).getTime() + meeting.meeting_duration * 60000))}
          </Typography>
        </Box>

        {meeting.meetingStarted && !meeting.meetingEnded && (
          <Chip
            label="Meeting in Progress"
            color="success"
            icon={<AccessTime />}
            sx={{ animation: 'pulse 2s infinite' }}
          />
        )}
        {meeting.meetingEnded && (
          <Chip label="Meeting Ended" color="default" />
        )}
        {!meeting.meetingStarted && (
          <Chip label="Not Started" color="warning" />
        )}
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

      {permissions.isCreator && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Host Controls
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {!meeting.meetingStarted && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={handleStartMeeting}
                  sx={{ color: 'white' }}
                >
                  Start Meeting
                </Button>
              )}

              {meeting.meetingStarted && !meeting.meetingEnded && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleEndMeeting}
                >
                  End Meeting
                </Button>
              )}

              {permissions.canApproveScribe && (
                <>
                  {!meeting.currentScribe ? (
                    <Button
                      variant="outlined"
                      startIcon={<PersonAdd />}
                      onClick={() => setScribeDialog(true)}
                    >
                      Assign Scribe
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<PersonRemove />}
                      onClick={handleRemoveScribe}
                    >
                      Remove Scribe
                    </Button>
                  )}
                </>
              )}
            </Stack>

            {meeting.currentScribe && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Current Scribe:</strong> {meeting.currentScribe.firstName} {meeting.currentScribe.lastName}
                  {permissions.isHost && ' (You cannot take minutes while a scribe is assigned)'}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flexGrow: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meeting Minutes ({minutes.length})
              </Typography>

              {minutes.length === 0 ? (
                <Alert severity="info">
                  No minutes recorded yet. {permissions.canTakeMinutes ? 'Start adding minutes below!' : ''}
                </Alert>
              ) : (
                <List>
                  {minutes.map((minute, index) => (
                    <React.Fragment key={minute._id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          bgcolor: minute.createdBy._id === currentUserId ? 'action.hover' : 'transparent',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            {minute.createdBy.firstName[0]}{minute.createdBy.lastName[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle2">
                                {minute.createdBy.firstName} {minute.createdBy.lastName}
                              </Typography>
                              {minute.isScribe && (
                                <Chip label="Scribe" size="small" color="primary" />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                • {formatTime(minute.createdAt)}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            editingMinute?._id === minute._id ? (
                              <Box sx={{ mt: 1 }}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={2}
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  autoFocus
                                />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Button size="small" onClick={handleUpdateMinute} startIcon={<Check />}>
                                    Save
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => setEditingMinute(null)}
                                    startIcon={<Close />}
                                  >
                                    Cancel
                                  </Button>
                                </Stack>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                {index + 1}. {minute.content}
                              </Typography>
                            )
                          }
                        />
                        {minute.createdBy._id === currentUserId && permissions.canTakeMinutes && (
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleEditMinute(minute)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              edge="end"
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMinute(minute._id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                      {index < minutes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}

              {permissions.canTakeMinutes && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Add New Minute
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Type a minute and press Enter or click Send..."
                      value={newMinute}
                      onChange={(e) => setNewMinute(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddMinute();
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      onClick={handleAddMinute}
                      disabled={!newMinute.trim()}
                    >
                      <Send />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Press Enter to send, Shift+Enter for new line
                  </Typography>
                </Box>
              )}

              {!permissions.canTakeMinutes && !meeting.meetingEnded && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Only the host {meeting.currentScribe ? 'or assigned scribe' : ''} can take minutes.
                </Alert>
              )}

              {meeting.meetingEnded && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Meeting has ended. No more minutes can be added or edited.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 300 } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendees ({attendees.length})
              </Typography>
              <List dense>
                {attendees.map(attendee => (
                  <ListItem key={attendee.user._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {attendee.user.firstName[0]}{attendee.user.lastName[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          {attendee.user.firstName} {attendee.user.lastName}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption">
                          {attendee.user.facultyId}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      <Dialog open={scribeDialog} onClose={() => setScribeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Scribe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an attendee to take meeting minutes. You will lose the ability to take minutes until you remove the scribe.
          </Typography>
          <List>
            {attendees.map(attendee => (
              <ListItem
                key={attendee.user._id}
                button
                onClick={() => handleApproveScribe(attendee.user._id)}
              >
                <ListItemAvatar>
                  <Avatar>
                    {attendee.user.firstName[0]}{attendee.user.lastName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${attendee.user.firstName} ${attendee.user.lastName}`}
                  secondary={`${attendee.user.facultyId} • ${attendee.user.role}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScribeDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </Box>
  );
}