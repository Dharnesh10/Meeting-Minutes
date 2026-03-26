import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Stack,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Grid,
  IconButton,
  Paper,
  Avatar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider,
  InputAdornment,
  alpha,
  Container,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useTheme,
  Fade,
  Grow,
  Zoom,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  AddCircleOutline,
  Person,
  Business,
  Schedule,
  MeetingRoom,
  Delete,
  Add,
  Edit,
  Close,
  Search,
  CalendarMonth,
  AccessTime,
  LocationOn,
  Group,
  FormatListBulleted,
  CheckCircle,
  CallSplit,
  Info,
  Dashboard,
  RocketLaunch,
  AutoAwesome,
  EventNote,
  PeopleAlt,
  Assignment,
  Send,
  ArrowForward,
  CheckCircleOutline,
  CancelOutlined,
  Today,
  Timer,
  Videocam,
  RoomPreferences,
  Category,
  PriorityHigh,
  Notes,
  Save
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API_CONFIG from '../config/api';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function CreateMeeting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isEditMode = !!id;
  const [searchParams] = useSearchParams();
  const followupMeetingId = searchParams.get('followup');
  const isFollowupMode = !!followupMeetingId;

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Meeting Details', 'Date & Venue', 'Attendees', 'Agenda', 'Review'];

  const [formData, setFormData] = useState({
    meeting_name: '',
    meeting_description: '',
    meeting_date: '',
    meeting_time: '',
    meeting_duration: 60,
    venue: '',
    meetingType: 'internal',
    priority: 'medium',
    selectedUsers: [],
    selectedDepartments: [],
    agenda: []
  });

  const [departments, setDepartments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [venueAvailability, setVenueAvailability] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isFollowupMode) {
      loadParentMeetingData();
    } else if (isEditMode) {
      loadMeetingData();
    }
    fetchDepartments();
    fetchVenues();
  }, [id, followupMeetingId]);

  useEffect(() => {
    if (formData.meeting_date && formData.meeting_time && formData.venue) {
      checkVenueAvailability();
    }
  }, [formData.meeting_date, formData.meeting_time, formData.meeting_duration, formData.venue]);

  useEffect(() => {
    if (userSearch.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [userSearch]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_CONFIG.baseURL}/meetings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to load meeting data');

      const meeting = await res.json();
      const meetingDateTime = new Date(meeting.meeting_datetime);
      const formattedDate = meetingDateTime.toISOString().split('T')[0];
      const formattedTime = meetingDateTime.toTimeString().slice(0, 5);

      const selectedUsers = meeting.attendees.map(a => ({
        _id: a.user._id || a.user,
        firstName: a.user.firstName || '',
        lastName: a.user.lastName || '',
        facultyId: a.user.facultyId || '',
        email: a.user.email || '',
        department: a.user.department || null,
        role: a.user.role || ''
      }));

      setFormData({
        meeting_name: meeting.meeting_name,
        meeting_description: meeting.meeting_description || '',
        meeting_date: formattedDate,
        meeting_time: formattedTime,
        meeting_duration: meeting.meeting_duration || 60,
        venue: meeting.venue?._id || '',
        meetingType: meeting.meetingType || 'internal',
        priority: meeting.priority || 'medium',
        selectedUsers: selectedUsers,
        selectedDepartments: meeting.departments?.map(d => d._id) || [],
        agenda: meeting.agenda || []
      });

      setLoading(false);
    } catch (err) {
      console.error('Load meeting error:', err);
      setError('Failed to load meeting data');
      setLoading(false);
    }
  };

  const loadParentMeetingData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_CONFIG.baseURL}/meetings/${followupMeetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to load parent meeting data');

      const parentMeeting = await res.json();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = tomorrow.toISOString().split('T')[0];

      const meetingDateTime = new Date(parentMeeting.meeting_datetime);
      const formattedTime = meetingDateTime.toTimeString().slice(0, 5);

      setFormData({
        meeting_name: `Follow-up: ${parentMeeting.meeting_name}`,
        meeting_description: parentMeeting.meeting_description 
          ? `Follow-up discussion: ${parentMeeting.meeting_description}` 
          : 'Follow-up meeting to continue discussion',
        meeting_date: formattedDate,
        meeting_time: formattedTime,
        meeting_duration: parentMeeting.meeting_duration,
        venue: parentMeeting.venue?._id || '',
        meetingType: parentMeeting.meetingType || 'internal',
        priority: parentMeeting.priority || 'medium',
        selectedUsers: parentMeeting.attendees?.map(a => ({
          _id: a.user._id || a.user,
          firstName: a.user.firstName || '',
          lastName: a.user.lastName || '',
          facultyId: a.user.facultyId || '',
          email: a.user.email || '',
          department: a.user.department || null,
          role: a.user.role || ''
        })) || [],
        selectedDepartments: parentMeeting.departments?.map(d => d._id) || [],
        agenda: []
      });

      setLoading(false);
    } catch (err) {
      console.error('Load parent meeting error:', err);
      setError('Failed to load parent meeting data');
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseURL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVenues = async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseURL}/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVenues(data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkVenueAvailability = async () => {
    if (!formData.venue || !formData.meeting_date || !formData.meeting_time) return;

    try {
      const startTime = `${formData.meeting_date}T${formData.meeting_time}:00`;
      
      const res = await fetch(`${API_CONFIG.baseURL}/venues/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          venueId: formData.venue,
          startTime,
          duration: formData.meeting_duration,
          excludeMeetingId: isEditMode ? id : null
        })
      });

      const data = await res.json();
      setVenueAvailability(data);
    } catch (err) {
      console.error(err);
    }
  };

  const searchUsers = async () => {
    try {
      const res = await fetch(
        `${API_CONFIG.baseURL}/meetings/search/users?query=${userSearch}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "meeting_duration" ? (value === "" ? "" : parseInt(value)) : value
    }));
  };

  const addUserToMeeting = (user) => {
    const userId = user._id || user.id;
    if (!formData.selectedUsers.find(u => (u._id || u.id) === userId)) {
      setFormData({
        ...formData,
        selectedUsers: [...formData.selectedUsers, user]
      });
    }
    setUserSearch('');
    setSearchResults([]);
  };

  const removeUser = (userId) => {
    setFormData({
      ...formData,
      selectedUsers: formData.selectedUsers.filter(u => (u._id || u.id) !== userId)
    });
  };

  const addAgendaItem = () => {
    setFormData({
      ...formData,
      agenda: [...formData.agenda, { title: '', description: '', duration: 10 }]
    });
  };

  const updateAgendaItem = (index, field, value) => {
    const newAgenda = [...formData.agenda];
    newAgenda[index][field] = value;
    setFormData({ ...formData, agenda: newAgenda });
  };

  const removeAgendaItem = (index) => {
    setFormData({
      ...formData,
      agenda: formData.agenda.filter((_, i) => i !== index)
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (formData.selectedUsers.length === 0 && formData.selectedDepartments.length === 0) {
      setError('Please add at least one attendee or select a department');
      setSaving(false);
      return;
    }

    if (venueAvailability && !venueAvailability.available) {
      setError('Selected venue is not available for this time slot');
      setSaving(false);
      return;
    }

    if (Number(formData.meeting_duration) < 15) {
      setError('Meeting duration must be at least 15 minutes');
      setSaving(false);
      return;
    }

    try {
      // Create local datetime without timezone conversion
      const localDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}:00`);
      
      const year = localDateTime.getFullYear();
      const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(localDateTime.getDate()).padStart(2, '0');
      const hours = String(localDateTime.getHours()).padStart(2, '0');
      const minutes = String(localDateTime.getMinutes()).padStart(2, '0');
      
      const meeting_date = `${year}-${month}-${day}`;
      const meeting_time = `${hours}:${minutes}`;

      const payload = {
        meeting_name: formData.meeting_name,
        meeting_description: formData.meeting_description,
        meeting_date: meeting_date,
        meeting_time: meeting_time,
        meeting_duration: formData.meeting_duration,
        venue: formData.venue,
        meetingType: formData.meetingType,
        priority: formData.priority,
        attendees: formData.selectedUsers.map(u => u._id || u.id).filter(Boolean),
        departments: formData.selectedDepartments,
        agenda: formData.agenda.filter(a => a.title),
        isFollowup: isFollowupMode,
        parentMeetingId: followupMeetingId || null
      };

      const url = isEditMode 
        ? `${API_CONFIG.baseURL}/meetings/${id}`
        : `${API_CONFIG.baseURL}/meetings`;

      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save meeting');
      }

      if (isEditMode) {
        setSuccess('Meeting updated successfully');
      } else if (isFollowupMode) {
        await fetch(`${API_CONFIG.baseURL}/minutes/${followupMeetingId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        
        setSuccess('Follow-up meeting created successfully');
      } else {
        if (data.requiresApproval) {
          setSuccess(`Meeting created - ID: ${data.meeting.meetingid}. Sent for approval.`);
        } else {
          setSuccess(`Meeting created and approved - ID: ${data.meeting.meetingid}`);
        }
      }

      setTimeout(() => {
        if (isEditMode) {
          navigate(`/meeting-details?id=${id}`);
          window.location.reload();
        } else {
          navigate('/');
        }
      }, 1500);

    } catch (err) {
      setError(err.message || 'Failed to save meeting');
      setSaving(false);
    }
  };

  // Helper function to check if current step is valid
  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return formData.meeting_name.trim() !== '' && formData.meeting_description.trim() !== '';
      case 1:
        return formData.meeting_date !== '' && formData.meeting_time !== '' && formData.meeting_duration >= 15 && formData.venue !== '';
      case 2:
        return formData.selectedUsers.length > 0 || formData.selectedDepartments.length > 0;
      default:
        return true;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      default: return '#4caf50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'urgent': return <PriorityHigh sx={{ fontSize: 16 }} />;
      case 'high': return <PriorityHigh sx={{ fontSize: 16 }} />;
      default: return <Category sx={{ fontSize: 16 }} />;
    }
  };

  const getMeetingTypeIcon = (type) => {
    switch(type) {
      case 'internal': return <PeopleAlt sx={{ fontSize: 16 }} />;
      case 'departmental': return <Business sx={{ fontSize: 16 }} />;
      case 'external': return <Videocam sx={{ fontSize: 16 }} />;
      default: return <Group sx={{ fontSize: 16 }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
      }}>
        <Fade in>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="text.secondary">Loading meeting details...</Typography>
          </Stack>
        </Fade>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
      py: { xs: 2, md: 5 },
      px: { xs: 1, md: 2 }
    }}>
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section */}
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Chip 
              label={isEditMode ? 'Edit Mode' : isFollowupMode ? 'Follow-up Mode' : 'New Meeting'}
              color={isEditMode ? 'warning' : isFollowupMode ? 'info' : 'primary'}
              sx={{ mb: 2, fontWeight: 600, px: 1 }}
              icon={isEditMode ? <Edit /> : isFollowupMode ? <CallSplit /> : <AutoAwesome />}
            />
            <Typography 
              variant="h3" 
              fontWeight="800" 
              sx={{ 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1
              }}
            >
              {isEditMode ? 'Edit Meeting' : isFollowupMode ? 'Create Follow-up Meeting' : 'Schedule New Meeting'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              {isEditMode ? 'Update the meeting details below' : 
               isFollowupMode ? 'Data copied from parent meeting. Adjust as needed.' :
               'Enter the required information below. You can change it anytime.'}
            </Typography>
          </Box>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Alert 
                  severity="error" 
                  sx={{ mb: 3, borderRadius: 2 }}
                  action={
                    <IconButton color="inherit" size="small" onClick={() => setError('')}>
                      <Close fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Alert 
                  severity="success" 
                  sx={{ mb: 3, borderRadius: 2 }}
                  icon={<CheckCircleOutline />}
                  action={
                    <IconButton color="inherit" size="small" onClick={() => setSuccess('')}>
                      <Close fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {success}
                </Alert>
              </motion.div>
            )}
            {isFollowupMode && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Alert 
                  severity="info" 
                  sx={{ mb: 3, borderRadius: 2 }} 
                  icon={<Info />}
                >
                  Creating follow-up meeting from parent meeting. All data has been pre-filled.
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stepper Form */}
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 4,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              overflow: 'hidden'
            }}
          >
            <Stepper activeStep={activeStep} orientation="vertical" sx={{ p: 3 }}>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel 
                    StepIconComponent={(props) => (
                      <Zoom in>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: props.active ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` : 
                                       props.completed ? theme.palette.success.main : 
                                       alpha(theme.palette.grey[500], 0.2),
                            color: props.active || props.completed ? 'white' : theme.palette.text.secondary,
                            transition: 'all 0.3s'
                          }}
                        >
                          {props.completed ? <CheckCircle sx={{ fontSize: 18 }} /> : index + 1}
                        </Box>
                      </Zoom>
                    )}
                  >
                    <Typography variant="subtitle1" fontWeight={activeStep === index ? 700 : 500}>
                      {label}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box sx={{ py: 2, maxWidth: '100%' }}>
                        {/* Step 0: Meeting Details */}
                        {activeStep === 0 && (
                          <Grid container spacing={3}>
                            <Grid item xs={12}>
                              <TextField
                                name="meeting_name"
                                label="Meeting Name"
                                value={formData.meeting_name}
                                onChange={handleChange}
                                required
                                fullWidth
                                placeholder="e.g., Department Review Meeting"
                                variant="outlined"
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <EventNote color="primary" />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                name="meeting_description"
                                label="Description"
                                value={formData.meeting_description}
                                onChange={handleChange}
                                multiline
                                rows={4}
                                fullWidth
                                placeholder="Brief description of the meeting purpose"
                                variant="outlined"
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Notes color="primary" />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth required>
                                <InputLabel>Meeting Type</InputLabel>
                                <Select
                                  name="meetingType"
                                  value={formData.meetingType}
                                  onChange={handleChange}
                                  label="Meeting Type"
                                  startAdornment={
                                    <InputAdornment position="start">
                                      {getMeetingTypeIcon(formData.meetingType)}
                                    </InputAdornment>
                                  }
                                >
                                  <MenuItem value="internal">Internal</MenuItem>
                                  <MenuItem value="departmental">Departmental</MenuItem>
                                  <MenuItem value="inter-departmental">Inter-Departmental</MenuItem>
                                  <MenuItem value="external">External</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Priority Level
                              </Typography>
                              <RadioGroup
                                row
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                              >
                                <FormControlLabel 
                                  value="low" 
                                  control={<Radio />} 
                                  label={<Chip label="Low" size="small" sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50' }} />}
                                />
                                <FormControlLabel 
                                  value="medium" 
                                  control={<Radio />} 
                                  label={<Chip label="Medium" size="small" sx={{ bgcolor: alpha('#2196f3', 0.1), color: '#2196f3' }} />}
                                />
                                <FormControlLabel 
                                  value="high" 
                                  control={<Radio />} 
                                  label={<Chip label="High" size="small" sx={{ bgcolor: alpha('#ff9800', 0.1), color: '#ff9800' }} />}
                                />
                                <FormControlLabel 
                                  value="urgent" 
                                  control={<Radio />} 
                                  label={<Chip label="Urgent" size="small" sx={{ bgcolor: alpha('#f44336', 0.1), color: '#f44336' }} />}
                                />
                              </RadioGroup>
                            </Grid>
                          </Grid>
                        )}

                        {/* Step 1: Date & Venue */}
                        {activeStep === 1 && (
                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                name="meeting_date"
                                label="Meeting Date"
                                type="date"
                                value={formData.meeting_date}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Today color="primary" />
                                    </InputAdornment>
                                  ),
                                }}
                                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                name="meeting_time"
                                label="Meeting Time"
                                type="time"
                                value={formData.meeting_time}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <AccessTime color="primary" />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                name="meeting_duration"
                                label="Duration (minutes)"
                                type="number"
                                value={formData.meeting_duration}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Timer color="primary" />
                                    </InputAdornment>
                                  ),
                                  inputProps: { min: 15, step: 15 }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth required>
                                <InputLabel>Select Venue</InputLabel>
                                <Select
                                  name="venue"
                                  value={formData.venue}
                                  onChange={handleChange}
                                  label="Select Venue"
                                  startAdornment={
                                    <InputAdornment position="start">
                                      <RoomPreferences color="primary" />
                                    </InputAdornment>
                                  }
                                >
                                  {venues.map(v => (
                                    <MenuItem key={v._id} value={v._id}>
                                      <Box>
                                        <Typography variant="body2">{v.name} ({v.code})</Typography>
                                        <Typography variant="caption" color="text.secondary">Capacity: {v.capacity}</Typography>
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            {venueAvailability && (
                              <Grid item xs={12}>
                                <Alert 
                                  severity={venueAvailability.available ? 'success' : 'error'}
                                  icon={venueAvailability.available ? <CheckCircle /> : <Info />}
                                  sx={{ borderRadius: 2 }}
                                >
                                  {venueAvailability.available ? (
                                    'Venue is available for the selected time slot ✓'
                                  ) : (
                                    <>
                                      <strong>Venue is booked during this time</strong>
                                      {venueAvailability.conflicts?.map((c, i) => (
                                        <Box key={i} sx={{ mt: 1, fontSize: '0.875rem' }}>
                                          • {c.meeting_name} by {c.host}
                                        </Box>
                                      ))}
                                    </>
                                  )}
                                </Alert>
                              </Grid>
                            )}
                          </Grid>
                        )}

                        {/* Step 2: Attendees */}
                        {activeStep === 2 && (
                          <Stack spacing={3}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Search for users
                              </Typography>
                              <TextField
                                fullWidth
                                placeholder="Search by name, email, or faculty ID..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Search color="primary" />
                                    </InputAdornment>
                                  ),
                                }}
                              />
                              <AnimatePresence>
                                {searchResults.length > 0 && (
                                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Paper variant="outlined" sx={{ mt: 2, maxHeight: 300, overflow: 'auto', borderRadius: 2 }}>
                                      {searchResults.map(user => (
                                        <Box
                                          key={user._id}
                                          sx={{ 
                                            p: 2, 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2
                                          }}
                                          onClick={() => addUserToMeeting(user)}
                                        >
                                          <Avatar sx={{ width: 40, height: 40, bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }}>
                                            {user.firstName?.[0]}
                                          </Avatar>
                                          <Box>
                                            <Typography variant="body2" fontWeight="500">
                                              {user.firstName} {user.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {user.facultyId} • {user.department?.name}
                                            </Typography>
                                          </Box>
                                          <Button size="small" variant="outlined" sx={{ ml: 'auto' }}>Add</Button>
                                        </Box>
                                      ))}
                                    </Paper>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Box>

                            {formData.selectedUsers.length > 0 && (
                              <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                  Selected Users ({formData.selectedUsers.length})
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" gap={1}>
                                  {formData.selectedUsers.map(user => (
                                    <Chip
                                      key={user._id}
                                      avatar={<Avatar sx={{ width: 24, height: 24 }}>{user.firstName?.[0]}</Avatar>}
                                      label={`${user.firstName} ${user.lastName}`}
                                      onDelete={() => removeUser(user._id)}
                                      variant="outlined"
                                      sx={{ borderRadius: 2 }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            )}

                            <Divider sx={{ my: 1 }} />

                            <Box>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Add entire departments
                              </Typography>
                              <FormControl fullWidth>
                                <InputLabel>Select Departments</InputLabel>
                                <Select
                                  multiple
                                  value={formData.selectedDepartments}
                                  onChange={(e) => setFormData({ ...formData, selectedDepartments: e.target.value })}
                                  label="Select Departments"
                                  renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {selected.map((value) => {
                                        const dept = departments.find(d => d._id === value);
                                        return <Chip key={value} label={dept?.name} size="small" />;
                                      })}
                                    </Box>
                                  )}
                                >
                                  {departments.map(dept => (
                                    <MenuItem key={dept._id} value={dept._id}>
                                      <Typography variant="body2">{dept.name}</Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({dept.code})</Typography>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          </Stack>
                        )}

                        {/* Step 3: Agenda */}
                        {activeStep === 3 && (
                          <Stack spacing={2}>
                            <Button
                              startIcon={<Add />}
                              onClick={addAgendaItem}
                              variant="outlined"
                              sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                            >
                              Add Agenda Item
                            </Button>
                            <AnimatePresence>
                              {formData.agenda.map((item, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Grid container spacing={2} alignItems="center">
                                      <Grid item xs={12} sm={5}>
                                        <TextField
                                          placeholder="Agenda title"
                                          value={item.title}
                                          onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                                          fullWidth
                                          size="small"
                                          InputProps={{
                                            startAdornment: (
                                              <InputAdornment position="start">
                                                <FormatListBulleted sx={{ fontSize: 18 }} />
                                              </InputAdornment>
                                            ),
                                          }}
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={5}>
                                        <TextField
                                          placeholder="Description"
                                          value={item.description}
                                          onChange={(e) => updateAgendaItem(index, 'description', e.target.value)}
                                          fullWidth
                                          size="small"
                                        />
                                      </Grid>
                                      <Grid item xs={10} sm={1}>
                                        <TextField
                                          placeholder="Min"
                                          type="number"
                                          value={item.duration}
                                          onChange={(e) => updateAgendaItem(index, 'duration', parseInt(e.target.value))}
                                          fullWidth
                                          size="small"
                                          inputProps={{ min: 5 }}
                                        />
                                      </Grid>
                                      <Grid item xs={2} sm={1}>
                                        <IconButton color="error" onClick={() => removeAgendaItem(index)} size="small">
                                          <Delete />
                                        </IconButton>
                                      </Grid>
                                    </Grid>
                                  </Paper>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            {formData.agenda.length === 0 && (
                              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                                No agenda items added. Click "Add Agenda Item" to start.
                              </Typography>
                            )}
                          </Stack>
                        )}

                        {/* Step 4: Review */}
                        {activeStep === 4 && (
                          <Stack spacing={3}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                              <Typography variant="h6" fontWeight="600" gutterBottom>
                                Meeting Summary
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">Meeting Name</Typography>
                                  <Typography variant="body1" fontWeight="500">{formData.meeting_name || 'Not specified'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">Description</Typography>
                                  <Typography variant="body2">{formData.meeting_description || 'No description'}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Date</Typography>
                                  <Typography variant="body2">{formData.meeting_date || 'Not set'}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Time</Typography>
                                  <Typography variant="body2">{formData.meeting_time || 'Not set'}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Duration</Typography>
                                  <Typography variant="body2">{formData.meeting_duration} minutes</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Venue</Typography>
                                  <Typography variant="body2">{venues.find(v => v._id === formData.venue)?.name || 'Not selected'}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Meeting Type</Typography>
                                  <Chip 
                                    label={formData.meetingType} 
                                    size="small" 
                                    icon={getMeetingTypeIcon(formData.meetingType)}
                                    sx={{ mt: 0.5 }}
                                  />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                                  <Chip 
                                    label={formData.priority} 
                                    size="small" 
                                    sx={{ bgcolor: alpha(getPriorityColor(formData.priority), 0.1), color: getPriorityColor(formData.priority), mt: 0.5 }}
                                  />
                                </Grid>
                              </Grid>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="subtitle2" gutterBottom>Attendees</Typography>
                              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                                {formData.selectedUsers.map(user => (
                                  <Chip key={user._id} label={`${user.firstName} ${user.lastName}`} size="small" variant="outlined" />
                                ))}
                                {formData.selectedDepartments.map(deptId => {
                                  const dept = departments.find(d => d._id === deptId);
                                  return <Chip key={deptId} label={`${dept?.name} (Department)`} size="small" variant="outlined" color="primary" />;
                                })}
                                {formData.selectedUsers.length === 0 && formData.selectedDepartments.length === 0 && (
                                  <Typography variant="body2" color="error">No attendees selected!</Typography>
                                )}
                              </Stack>
                              {formData.agenda.length > 0 && (
                                <>
                                  <Divider sx={{ my: 2 }} />
                                  <Typography variant="subtitle2" gutterBottom>Agenda ({formData.agenda.length} items)</Typography>
                                  {formData.agenda.map((item, idx) => (
                                    <Box key={idx} sx={{ mb: 1, pl: 2, borderLeft: `2px solid ${theme.palette.primary.main}` }}>
                                      <Typography variant="body2" fontWeight="500">{item.title || 'Untitled'}</Typography>
                                      {item.description && <Typography variant="caption" color="text.secondary">{item.description}</Typography>}
                                      <Typography variant="caption" color="text.secondary">Duration: {item.duration} min</Typography>
                                    </Box>
                                  ))}
                                </>
                              )}
                            </Paper>
                            {(!formData.selectedUsers.length && !formData.selectedDepartments.length) && (
                              <Alert severity="error">At least one attendee or department is required to schedule the meeting.</Alert>
                            )}
                            {venueAvailability && !venueAvailability.available && (
                              <Alert severity="error">Selected venue is not available for this time slot.</Alert>
                            )}
                          </Stack>
                        )}

                        {/* Navigation Buttons */}
                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          >
                            Back
                          </Button>
                          {activeStep === steps.length - 1 ? (
                            <Button
                              variant="contained"
                              onClick={handleSubmit}
                              disabled={saving || (!formData.selectedUsers.length && !formData.selectedDepartments.length) || (venueAvailability && !venueAvailability.available)}
                              sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                borderRadius: 2,
                                px: 4,
                                '&:hover': {
                                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                                }
                              }}
                            >
                              {saving ? (
                                <>
                                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                                  {isEditMode ? 'Updating...' : 'Creating...'}
                                </>
                              ) : (
                                <>
                                  {isEditMode ? 'Update Meeting' : 'Schedule Meeting'}
                                  <Send sx={{ ml: 1, fontSize: 18 }} />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              onClick={handleNext}
                              disabled={!isStepValid()}
                              sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                borderRadius: 2,
                                px: 4
                              }}
                            >
                              Next
                              <ArrowForward sx={{ ml: 1, fontSize: 18 }} />
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </motion.div>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}