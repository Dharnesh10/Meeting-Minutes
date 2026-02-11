import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Stack,
  CircularProgress,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  AddCircleOutline,
  Person,
  Business,
  Schedule,
  MeetingRoom,
  Delete,
  Add,
  Info,
  Edit,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { CallSplit } from '@mui/icons-material';

export default function CreateMeeting() {
  const { id } = useParams(); // Get meeting ID from URL for edit mode
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
  const [departmentUsers, setDepartmentUsers] = useState({});
  
  const [loading, setLoading] = useState(isEditMode); // Load if editing
  const [saving, setSaving] = useState(false);
  const [venueLoading, setVenueLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [venueAvailability, setVenueAvailability] = useState(null);

  const token = localStorage.getItem('token');

  // Load existing meeting data if in edit mode
  useEffect(() => {
    if (isFollowupMode) {
      loadParentMeetingData();
    } else if (isEditMode) {
      loadMeetingData();
    }
  }, [id, followupMeetingId]);

  // Fetch departments and venues on mount
  useEffect(() => {
    fetchDepartments();
    fetchVenues();
  }, []);

  // Check venue availability when datetime or duration changes
  useEffect(() => {
    if (formData.meeting_date && formData.meeting_time && formData.venue) {
      checkVenueAvailability();
    }
  }, [formData.meeting_date, formData.meeting_time, formData.meeting_duration, formData.venue]);

  // Search users as they type
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

      if (!res.ok) {
        throw new Error('Failed to load meeting data');
      }

      const meeting = await res.json();

      // Format date and time
      const meetingDateTime = new Date(meeting.meeting_datetime);
      const formattedDate = meetingDateTime.toISOString().split('T')[0];
      const formattedTime = meetingDateTime.toTimeString().slice(0, 5);

      // Format selected users with full user objects
      const selectedUsers = meeting.attendees.map(a => ({
        _id: a.user._id || a.user,
        firstName: a.user.firstName || '',
        lastName: a.user.lastName || '',
        facultyId: a.user.facultyId || '',
        email: a.user.email || '',
        department: a.user.department || null,
        role: a.user.role || ''
      }));

      // Populate form with existing data
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

    if (!res.ok) {
      throw new Error('Failed to load parent meeting data');
    }

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

    setVenueLoading(true);
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
          excludeMeetingId: isEditMode ? id : null // Exclude current meeting when editing
        })
      });

      const data = await res.json();
      setVenueAvailability(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVenueLoading(false);
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

  const handleDepartmentSelect = async (deptId) => {
    if (!departmentUsers[deptId]) {
      try {
        const res = await fetch(
          `http://localhost:5000/api/departments/${deptId}/users`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await res.json();
        setDepartmentUsers(prev => ({
          ...prev,
          [deptId]: data.users
        }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const addUserToMeeting = (user) => {
    if (!formData.selectedUsers.find(u => u._id === user._id)) {
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
      selectedUsers: formData.selectedUsers.filter(u => u._id !== userId)
    });
  };

  const handleDepartmentChange = (event) => {
    const deptIds = event.target.value;
    setFormData({ ...formData, selectedDepartments: deptIds });
    
    deptIds.forEach(id => handleDepartmentSelect(id));
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

    // CRITICAL VALIDATION: At least one attendee required
    if (formData.selectedUsers.length === 0 && formData.selectedDepartments.length === 0) {
      setError('Please add at least one attendee or select a department');
      setSaving(false);
      return;
    }

    // Check venue availability
    if (venueAvailability && !venueAvailability.available) {
      setError('Selected venue is not available for this time slot');
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
        attendees: formData.selectedUsers.map(u => u._id),
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
        setSuccess('Meeting updated successfully!');
      } else if (isFollowupMode) {
        await fetch(`http://localhost:5000/api/minutes/${followupMeetingId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        
        setSuccess('Follow-up meeting created! Parent meeting has been ended.');
      } else {
        if (data.requiresApproval) {
          setSuccess(`Meeting created successfully! Meeting ID: ${data.meeting.meetingid}. It has been sent to your HOD for approval.`);
        } else {
          setSuccess(`Meeting created and approved! Meeting ID: ${data.meeting.meetingid}`);
        }
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        if (isEditMode) {
          navigate(`/meeting-details?id=${id}`);
          window.location.reload(); // Force refresh to show updates
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
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isEditMode ? (
          <>
            <Edit fontSize="large" color="primary" />
            Edit Meeting
          </>
        ) : isFollowupMode ? (
          <>
            <CallSplit fontSize="large" color="primary" />
            Create Follow-up Meeting
            <Chip label="F" color="primary" size="small" sx={{ fontWeight: 'bold' }} />
          </>
        ) : (
          <>
            <AddCircleOutline fontSize="large" color="primary" />
            Schedule New Meeting
          </>
        )}
      </Typography>

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

      <Card>
        <CardContent>
          {isFollowupMode && (
            <Alert severity="info" sx={{ mb: 3 }} icon={<CallSplit />}>
              <strong>Creating Follow-up Meeting</strong>
              <br />
              Data has been copied from the parent meeting. Adjust as needed.
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Basic Details */}
              <Typography variant="h6" color="primary">Basic Details</Typography>
              
              <TextField
                label="Meeting Name"
                name="meeting_name"
                value={formData.meeting_name}
                onChange={handleChange}
                required
                fullWidth
                placeholder="e.g., Department Review Meeting"
              />

              <TextField
                label="Description"
                name="meeting_description"
                value={formData.meeting_description}
                onChange={handleChange}
                multiline
                rows={3}
                fullWidth
                placeholder="Brief description of the meeting purpose"
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Meeting Type</InputLabel>
                    <Select
                      name="meetingType"
                      value={formData.meetingType}
                      onChange={handleChange}
                      label="Meeting Type"
                    >
                      <MenuItem value="internal">Internal</MenuItem>
                      <MenuItem value="departmental">Departmental</MenuItem>
                      <MenuItem value="inter-departmental">Inter-Departmental</MenuItem>
                      <MenuItem value="external">External</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Duration (minutes)"
                    name="meeting_duration"
                    type="number"
                    value={formData.meeting_duration}
                    onChange={handleChange}
                    required
                    fullWidth
                    inputProps={{ min: 15, step: 15 }}
                  />
                </Grid>
              </Grid>

              <Divider />

              {/* Date, Time & Venue */}
              <Typography variant="h6" color="primary">Schedule & Venue</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Meeting Date"
                    name="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={handleChange}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: new Date().toISOString().split('T')[0] }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Meeting Time"
                    name="meeting_time"
                    type="time"
                    value={formData.meeting_time}
                    onChange={handleChange}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth required>
                <InputLabel>Venue</InputLabel>
                <Select
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  label="Venue"
                  disabled={venueLoading}
                >
                  {venues.map(v => (
                    <MenuItem key={v._id} value={v._id}>
                      {v.name} ({v.code}) - Capacity: {v.capacity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {venueLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Checking availability...</Typography>
                </Box>
              )}

              {venueAvailability && (
                <Alert 
                  severity={venueAvailability.available ? 'success' : 'error'}
                  icon={<Info />}
                >
                  {venueAvailability.available ? (
                    'Venue is available for the selected time slot!'
                  ) : (
                    <>
                      Venue is booked during this time.
                      {venueAvailability.conflicts?.map((c, i) => (
                        <Box key={i} sx={{ mt: 1, fontSize: '0.875rem' }}>
                          • {c.meeting_name} by {c.host}
                        </Box>
                      ))}
                    </>
                  )}
                </Alert>
              )}

              <Divider />

              {/* Attendees */}
              <Typography variant="h6" color="primary">
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Attendees {formData.selectedUsers.length === 0 && formData.selectedDepartments.length === 0 && (
                  <Typography component="span" color="error" variant="caption">
                    (Required - Add at least 1)
                  </Typography>
                )}
              </Typography>

              {/* Add Individual Users */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>Search and Add Users</Typography>
                <TextField
                  fullWidth
                  placeholder="Search by name, email, or faculty ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                
                {searchResults.length > 0 && (
                  <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                    {searchResults.map(user => (
                      <Box
                        key={user._id}
                        sx={{ 
                          p: 1.5, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                          borderBottom: '1px solid',
                          borderColor: 'divider'
                        }}
                        onClick={() => addUserToMeeting(user)}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {user.firstName} {user.lastName} ({user.facultyId})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.department?.name} • {user.role}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>

              {/* Selected Users */}
              {formData.selectedUsers.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Users ({formData.selectedUsers.length}):
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {formData.selectedUsers.map(user => (
                      <Chip
                        key={user._id}
                        label={`${user.firstName} ${user.lastName} (${user.facultyId})`}
                        onDelete={() => removeUser(user._id)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Add Departments */}
              <FormControl fullWidth>
                <InputLabel>
                  <Business sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Add Entire Departments
                </InputLabel>
                <Select
                  multiple
                  value={formData.selectedDepartments}
                  onChange={handleDepartmentChange}
                  input={<OutlinedInput label="Add Entire Departments" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((id) => {
                        const dept = departments.find(d => d._id === id);
                        return <Chip key={id} label={dept?.name} />;
                      })}
                    </Box>
                  )}
                >
                  {departments.map(dept => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                      {departmentUsers[dept._id] && ` - ${departmentUsers[dept._id].length} members`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.selectedDepartments.length > 0 && (
                <Alert severity="info" icon={<Business />}>
                  {formData.selectedDepartments.length} department(s) selected. 
                  All members will be automatically added as attendees.
                </Alert>
              )}

              <Divider />

              {/* Agenda */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Agenda (Optional)
                  </Typography>
                  <Button
                    startIcon={<Add />}
                    onClick={addAgendaItem}
                    variant="outlined"
                    size="small"
                  >
                    Add Item
                  </Button>
                </Box>

                <Stack spacing={2}>
                  {formData.agenda.map((item, index) => (
                    <Paper key={index} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={5}>
                          <TextField
                            label="Agenda Title"
                            value={item.title}
                            onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={5}>
                          <TextField
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateAgendaItem(index, 'description', e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={10} md={1}>
                          <TextField
                            label="Minutes"
                            type="number"
                            value={item.duration}
                            onChange={(e) => updateAgendaItem(index, 'duration', parseInt(e.target.value))}
                            fullWidth
                            size="small"
                            inputProps={{ min: 5 }}
                          />
                        </Grid>
                        <Grid item xs={2} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton color="error" onClick={() => removeAgendaItem(index)}>
                            <Delete />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              {/* Submit Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving || (venueAvailability && !venueAvailability.available)}
                >
                  {saving ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEditMode ? 'Update Meeting' : 'Schedule Meeting'
                  )}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}