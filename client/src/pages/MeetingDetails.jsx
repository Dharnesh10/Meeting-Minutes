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
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  Check,
  AccessTime,
  Person,
  FiberManualRecord,
  CalendarToday,
  MeetingRoom,
  Business,
  Schedule,
  Info as InfoIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MeetingDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const meetingId = searchParams.get('id');

  const [currentTab, setCurrentTab] = useState(0);
  const [meeting, setMeeting] = useState(null);
  const [minutes, setMinutes] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [newMinute, setNewMinute] = useState('');
  const [editingMinute, setEditingMinute] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Scribe dialog
  const [scribeDialog, setScribeDialog] = useState(false);
  const [attendees, setAttendees] = useState([]);

  // Real-time polling
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingInterval = useRef(null);
  const heartbeatInterval = useRef(null);

  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    if (!meetingId) {
      navigate('/');
      return;
    }
    fetchMeeting();
    fetchMinutes();
    fetchAttendance();
    startHeartbeat();

    return () => {
      stopHeartbeat();
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [meetingId]);

  // Start polling
  useEffect(() => {
    if (!meetingId || !meeting) return;

    pollingInterval.current = setInterval(() => {
      pollForUpdates();
      fetchAttendance(); // Update attendance
    }, 2000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [meetingId, lastUpdate, meeting]);

  const fetchMeeting = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setMeeting(data);
        setAttendees(data.attendees || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const fetchMinutes = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/minutes/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMinutes(data.minutes);
        setPermissions(data.permissions);
        setLastUpdate(new Date().toISOString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startHeartbeat = () => {
    // Send heartbeat every 5 seconds to mark user as online
    heartbeatInterval.current = setInterval(async () => {
      try {
        await fetch(`http://localhost:5000/api/attendance/${meetingId}/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 5000);
  };

  const stopHeartbeat = async () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    // Mark user as offline
    try {
      await fetch(`http://localhost:5000/api/attendance/${meetingId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Leave error:', err);
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
    if (!window.confirm('End this meeting? Attendance will be finalized.')) return;

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

      setSuccess('Meeting ended. Attendance finalized.');
      setTimeout(() => setSuccess(''), 3000);
      fetchAttendance(); // Refresh to show final percentages

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Typography>Loading...</Typography>
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

  const onlineCount = attendance.filter(a => a.isOnline).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            {meeting.meeting_name}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {formatDate(meeting.meeting_datetime)}
            </Typography>
            <Chip 
              label={`${onlineCount} online`}
              size="small"
              color="success"
              icon={<FiberManualRecord />}
            />
          </Stack>
        </Box>

        {/* Meeting Status */}
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

      {/* Alerts */}
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

      {/* Host Controls */}
      {permissions.isCreator && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {!meeting.meetingStarted && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={handleStartMeeting}
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
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="Details" />
          <Tab label={`Minutes (${minutes.length})`} />
          <Tab label={`Attendance (${attendance.length})`} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {/* Meeting Details */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography variant="body1">{meeting.meeting_description || 'No description provided'}</Typography>
              </Box>

              <Divider />

              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Host</Typography>
                  <Typography variant="body1">
                    {meeting.createdBy?.firstName} {meeting.createdBy?.lastName} ({meeting.createdBy?.facultyId})
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Venue</Typography>
                  <Typography variant="body1">{meeting.venue?.name}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                  <Typography variant="body1">{meeting.meeting_duration} minutes</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
                  <Chip label={meeting.priority.toUpperCase()} size="small" />
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Attendees ({attendees.length})</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {attendees.map(att => (
                    <Chip
                      key={att.user._id}
                      label={`${att.user.firstName} ${att.user.lastName}`}
                      size="small"
                      avatar={<Avatar>{att.user.firstName[0]}</Avatar>}
                    />
                  ))}
                </Stack>
              </Box>

              {meeting.agenda && meeting.agenda.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Agenda</Typography>
                    <List>
                      {meeting.agenda.map((item, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={`${idx + 1}. ${item.title}`}
                            secondary={item.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {/* Minutes Tab - same as before but in tab */}
        <Card>
          <CardContent>
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

            {/* Add Minute Input */}
            {permissions.canTakeMinutes && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Type a minute and press Enter..."
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
              </Box>
            )}

            {!permissions.canTakeMinutes && !meeting.meetingEnded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Only the host {meeting.currentScribe ? 'or assigned scribe' : ''} can take minutes.
              </Alert>
            )}

            {meeting.meetingEnded && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Meeting has ended. No more minutes can be added.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        {/* Attendance Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attendance Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {meeting.meetingEnded 
                ? 'Final attendance report' 
                : 'Live attendance tracking - updates every 2 seconds'}
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time in Meeting</TableCell>
                    <TableCell>Attendance %</TableCell>
                    <TableCell>Sessions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((att) => (
                    <TableRow key={att.user._id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {att.user.firstName[0]}{att.user.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {att.user.firstName} {att.user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {att.user.facultyId}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {att.isOnline ? (
                          <Chip
                            label="Online"
                            color="success"
                            size="small"
                            icon={<FiberManualRecord />}
                          />
                        ) : (
                          <Chip
                            label="Offline"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDuration(att.totalDuration || 0)}</TableCell>
                      <TableCell>
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={att.attendancePercentage || 0}
                            sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
                          />
                          <Typography variant="caption">
                            {(att.attendancePercentage || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {att.sessions?.length || 0} session(s)
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {attendance.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No attendance data yet. Users will appear when they join the meeting.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Assign Scribe Dialog */}
      <Dialog open={scribeDialog} onClose={() => setScribeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Scribe</DialogTitle>
        <DialogContent>
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