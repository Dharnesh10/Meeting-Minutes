// client/src/components/Tasks.jsx
// Version WITHOUT "My Tasks" tab - highlights user's tasks in All Tasks instead
import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Button,
  IconButton, Menu, MenuItem, Alert, CircularProgress,
  Select, TextField, Grid, Tooltip
} from '@mui/material';
import {
  FilterList, CalendarToday, Person, Assignment,
  FiberManualRecord, Refresh
} from '@mui/icons-material';
import TaskDetailsDialog from './TaskDetailsDialog';

export default function Tasks() {
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sortBy, setSortBy] = useState('new_to_old');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [sortBy, statusFilter, dateRange]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let params = { sort: sortBy };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateRange.from) params.fromDate = dateRange.from;
      if (dateRange.to) params.toDate = dateRange.to;

      const response = await axios.get('/tasks/all-tasks', { params });
      setAllTasks(response.data);
      setError('');
    } catch (err) {
      console.error('[Tasks] Fetch error:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (task) => {
    const latestSubmission = task.submissions?.[task.currentSubmission];
    
    if (task.status === 'completed' || latestSubmission?.status === 'approved') {
      return { label: 'C', bg: '#4caf50', text: 'Completed' };
    }
    if (task.status === 'rejected' || latestSubmission?.status === 'rejected') {
      return { label: 'NC', bg: '#f44336', text: 'Not Completed' };
    }
    if (task.status === 'submitted' || latestSubmission?.status === 'pending_review') {
      return { label: 'P', bg: '#ff9800', text: 'Pending Review' };
    }
    if (task.status === 'in_progress') {
      return { label: 'IP', bg: '#2196f3', text: 'In Progress' };
    }
    return { label: 'NS', bg: '#9e9e9e', text: 'Not Started' };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleViewTasks = (meetingData) => {
    setSelectedMeeting(meetingData);
    setDetailsDialog(true);
  };

  const renderTaskCard = (meetingData) => {
    const meeting = meetingData.meeting;
    const tasks = meetingData.tasks;
    const userId = localStorage.getItem('userId');
    
    // Find user's task in this meeting
    const myTask = tasks.find(t => t.assignedTo._id === userId);
    const myTaskBadge = myTask ? getStatusBadge(myTask) : null;

    return (
      <Card 
        key={meeting._id} 
        sx={{ 
          position: 'relative',
          '&:hover': { boxShadow: 6 },
          transition: 'all 0.2s'
        }}
      >
        {/* Show user's task status badge in top right */}
        {myTaskBadge && (
          <Tooltip title={`Your task: ${myTaskBadge.text}`}>
            <Chip
              label={myTaskBadge.label}
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                bgcolor: myTaskBadge.bg,
                color: 'white',
                fontWeight: 'bold',
                minWidth: 40,
                height: 32
              }}
            />
          </Tooltip>
        )}

        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ pr: 6 }}>
            {meetingData.meetingName}
          </Typography>

          <Stack spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Person fontSize="small" color="action" />
              <Typography variant="body2">
                {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Assignment fontSize="small" color="action" />
              <Typography variant="body2">
                Meeting ID: {meetingData.meetingId}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarToday fontSize="small" color="action" />
              <Typography variant="body2">
                {formatDate(meeting.meeting_datetime)} at {formatTime(meeting.meeting_datetime)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <FiberManualRecord fontSize="small" sx={{ color: '#2196f3' }} />
              <Typography variant="body2">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Stack>

          <Button 
            variant="contained" 
            fullWidth
            onClick={() => handleViewTasks(meetingData)}
          >
            View Tasks
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Tasks
        </Typography>

        <Stack direction="row" spacing={1}>
          <IconButton onClick={fetchTasks} color="primary">
            <Refresh />
          </IconButton>

          <Button
            startIcon={<FilterList />}
            onClick={(e) => setFilterAnchor(e.currentTarget)}
          >
            Filter & Sort
          </Button>
        </Stack>
      </Stack>

      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
        PaperProps={{ sx: { width: 300, p: 2 } }}
      >
        <Typography variant="subtitle2" gutterBottom>Sort By</Typography>
        <Select
          fullWidth size="small" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} sx={{ mb: 2 }}>
          <MenuItem value="new_to_old">Newest First</MenuItem>
          <MenuItem value="old_to_new">Oldest First</MenuItem>
          <MenuItem value="due_date">Due Date</MenuItem>
        </Select>

        <Typography variant="subtitle2" gutterBottom>Status</Typography>
        <Select
          fullWidth size="small" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ mb: 2 }}>
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value="not_started">Not Started</MenuItem>
          <MenuItem value="in_progress">In Progress</MenuItem>
          <MenuItem value="submitted">Submitted</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </Select>

        <Typography variant="subtitle2" gutterBottom>Date Range</Typography>
        <TextField
          fullWidth size="small" type="date" label="From"
          value={dateRange.from}
          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          InputLabelProps={{ shrink: true }} sx={{ mb: 1 }} />
        <TextField
          fullWidth size="small" type="date" label="To"
          value={dateRange.to}
          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          InputLabelProps={{ shrink: true }} />

        <Button fullWidth variant="outlined" sx={{ mt: 2 }}
          onClick={() => {
            setSortBy('new_to_old');
            setStatusFilter('all');
            setDateRange({ from: '', to: '' });
          }}>
          Reset Filters
        </Button>
      </Menu>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : allTasks.length === 0 ? (
        <Alert severity="info">No tasks found</Alert>
      ) : (
        <Grid container spacing={3}>
          {allTasks.map((meetingData) => (
            <Grid item xs={12} sm={6} md={4} key={meetingData.meeting._id}>
              {renderTaskCard(meetingData)}
            </Grid>
          ))}
        </Grid>
      )}

      {selectedMeeting && (
        <TaskDetailsDialog
          open={detailsDialog}
          onClose={() => setDetailsDialog(false)}
          meetingData={selectedMeeting}
          onRefresh={fetchTasks}
        />
      )}
    </Box>
  );
}