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
  alpha
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
  Info
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

export default function CreateMeeting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [searchParams] = useSearchParams();
  const followupMeetingId = searchParams.get('followup');
  const isFollowupMode = !!followupMeetingId;

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
      const res = await fetch(`http://localhost:5000/api/meetings/${id}`, {
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
      const res = await fetch(`http://localhost:5000/api/meetings/${followupMeetingId}`, {
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
      const res = await fetch('http://localhost:5000/api/departments', {
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
      const res = await fetch('http://localhost:5000/api/venues', {
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
      
      const res = await fetch('http://localhost:5000/api/venues/check-availability', {
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
        `http://localhost:5000/api/meetings/search/users?query=${userSearch}`,
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
      const payload = {
        meeting_name: formData.meeting_name,
        meeting_description: formData.meeting_description,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
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
        ? `http://localhost:5000/api/meetings/${id}`
        : 'http://localhost:5000/api/meetings';

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
        await fetch(`http://localhost:5000/api/minutes/${followupMeetingId}/end`, {
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading meeting data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: alpha('#667eea', 0.02),
      py: 4
    }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            {isEditMode ? <Edit sx={{ fontSize: 32, color: 'primary.main' }} /> : 
             isFollowupMode ? <CallSplit sx={{ fontSize: 32, color: 'primary.main' }} /> :
             <AddCircleOutline sx={{ fontSize: 32, color: 'primary.main' }} />}
            <Typography variant="h4" fontWeight="700">
              {isEditMode ? 'Edit Meeting' : isFollowupMode ? 'Create Follow-up Meeting' : 'Schedule New Meeting'}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? 'Update the meeting details below' : 
             isFollowupMode ? 'Data copied from parent meeting. Adjust as needed.' :
             'Enter the required information below. You can change it anytime.'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {isFollowupMode && (
          <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
            Creating follow-up meeting from parent meeting
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            {/* Meeting Name */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Meeting name
                </Typography>
                <TextField
                  name="meeting_name"
                  value={formData.meeting_name}
                  onChange={handleChange}
                  required
                  fullWidth
                  placeholder="e.g., Department Review Meeting"
                  variant="outlined"
                />
              </Box>
            </Card>

            {/* Description */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <TextField
                  name="meeting_description"
                  value={formData.meeting_description}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Brief description of the meeting purpose"
                  variant="outlined"
                />
              </Box>
            </Card>

            {/* Date & Time */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  Date and time
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="meeting_date"
                      type="date"
                      value={formData.meeting_date}
                      onChange={handleChange}
                      required
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonth />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: new Date().toISOString().split('T')[0] }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="meeting_time"
                      type="time"
                      value={formData.meeting_time}
                      onChange={handleChange}
                      required
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccessTime />
                          </InputAdornment>
                        ),
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      name="meeting_duration"
                      type="number"
                      value={formData.meeting_duration}
                      onChange={handleChange}
                      required
                      fullWidth
                      placeholder="Duration (minutes)"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Schedule />
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{ min: 15, step: 15 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Card>

            {/* Venue */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Select venue
                </Typography>
                <FormControl fullWidth required>
                  <Select
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    displayEmpty
                    startAdornment={
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="" disabled>
                      Choose a venue
                    </MenuItem>
                    {venues.map(v => (
                      <MenuItem key={v._id} value={v._id}>
                        {v.name} ({v.code}) - Capacity: {v.capacity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {venueAvailability && (
                  <Alert 
                    severity={venueAvailability.available ? 'success' : 'error'}
                    icon={venueAvailability.available ? <CheckCircle /> : <Info />}
                    sx={{ mt: 2 }}
                  >
                    {venueAvailability.available ? (
                      'Venue is available for the selected time slot'
                    ) : (
                      <>
                        Venue is booked during this time
                        {venueAvailability.conflicts?.map((c, i) => (
                          <Box key={i} sx={{ mt: 1, fontSize: '0.875rem' }}>
                            {c.meeting_name} by {c.host}
                          </Box>
                        ))}
                      </>
                    )}
                  </Alert>
                )}
              </Box>
            </Card>

            {/* Meeting Type & Priority */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Meeting type
                    </Typography>
                    <FormControl fullWidth required>
                      <Select
                        name="meetingType"
                        value={formData.meetingType}
                        onChange={handleChange}
                        displayEmpty
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
                      Priority level
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
                        label={<Chip label="Low" size="small" />}
                      />
                      <FormControlLabel 
                        value="medium" 
                        control={<Radio />} 
                        label={<Chip label="Medium" size="small" color="info" />}
                      />
                      <FormControlLabel 
                        value="high" 
                        control={<Radio />} 
                        label={<Chip label="High" size="small" color="warning" />}
                      />
                      <FormControlLabel 
                        value="urgent" 
                        control={<Radio />} 
                        label={<Chip label="Urgent" size="small" color="error" />}
                      />
                    </RadioGroup>
                  </Grid>
                </Grid>
              </Box>
            </Card>

            {/* Attendees */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Add attendees
                </Typography>
                <Typography variant="caption" color="error" gutterBottom display="block" sx={{ mb: 2 }}>
                  At least one attendee or department is required
                </Typography>

                <TextField
                  fullWidth
                  placeholder="Search by name, email, or faculty ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                {searchResults.length > 0 && (
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
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
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
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
                      </Box>
                    ))}
                  </Paper>
                )}

                {formData.selectedUsers.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      Selected users ({formData.selectedUsers.length})
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {formData.selectedUsers.map(user => (
                        <Chip
                          key={user._id}
                          avatar={<Avatar>{user.firstName?.[0]}</Avatar>}
                          label={`${user.firstName} ${user.lastName} (${user.facultyId})`}
                          onDelete={() => removeUser(user._id)}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Or add entire departments
                </Typography>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <Select
                    multiple
                    value={formData.selectedDepartments}
                    onChange={(e) => setFormData({ ...formData, selectedDepartments: e.target.value })}
                    displayEmpty
                    startAdornment={
                      <InputAdornment position="start">
                        <Business />
                      </InputAdornment>
                    }
                    renderValue={(selected) => {
                      if (selected.length === 0) return <em>Select departments</em>;
                      return `${selected.length} department(s) selected`;
                    }}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Card>

            {/* Agenda */}
            <Card>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Agenda items (optional)
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<Add />}
                    onClick={addAgendaItem}
                    variant="outlined"
                    size="small"
                  >
                    Add item
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {formData.agenda.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            placeholder="Agenda title"
                            value={item.title}
                            onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                            fullWidth
                            size="small"
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
                  ))}
                </Stack>
              </Box>
            </Card>

            {/* Submit Buttons */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                disabled={saving}
                size="large"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving || (venueAvailability && !venueAvailability.available)}
                sx={{
                  minWidth: 160,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Meeting' : 'Schedule Meeting'
                )}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
    </Box>
  );
}