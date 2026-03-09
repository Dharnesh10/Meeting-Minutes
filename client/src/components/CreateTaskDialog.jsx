// client/src/components/CreateTaskDialog.jsx
import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Typography, Alert, Stack, Box, IconButton, Select,
  MenuItem, FormControl, InputLabel, Chip, Avatar
} from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';

export default function CreateTaskDialog({ open, onClose, meeting, minutes, onSuccess }) {
  const [tasks, setTasks] = useState([{ title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' }]);
  const [attendees, setAttendees] = useState([]);
  const [maxDueDate, setMaxDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && meeting) {
      setAttendees(meeting.attendees || []);
      
      // Set max due date (follow-up meeting date or 30 days from now)
      if (meeting.followupMeetings && meeting.followupMeetings.length > 0) {
        const followupDate = new Date(meeting.followupMeetings[0].meeting_datetime);
        setMaxDueDate(followupDate.toISOString().split('T')[0]);
      } else {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        setMaxDueDate(thirtyDaysLater.toISOString().split('T')[0]);
      }
    }
  }, [open, meeting]);

  const addTask = () => {
    setTasks([...tasks, { title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' }]);
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    // Validation
    const incompleteTasks = tasks.filter(t => !t.title || !t.description || !t.assignedTo || !t.dueDate);
    if (incompleteTasks.length > 0) {
      setError('All tasks must have title, description, assignee, and due date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`/tasks/meetings/${meeting._id}/tasks/bulk`, { tasks });
      
      setTasks([{ title: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' }]);
      onClose();
      onSuccess();
    } catch (err) {
      console.error('[CreateTask] Error:', err);
      setError(err.message || 'Failed to create tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create Tasks from Meeting</Typography>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Alert severity="info" sx={{ mb: 2 }}>
          Review meeting minutes and create action items. All tasks must be assigned before saving.
        </Alert>

        <Stack spacing={3}>
          {tasks.map((task, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Task {index + 1}</Typography>
                {tasks.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeTask(index)}>
                    <Delete />
                  </IconButton>
                )}
              </Stack>

              <TextField
                fullWidth
                label="Task Title *"
                value={task.title}
                onChange={(e) => updateTask(index, 'title', e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description *"
                value={task.description}
                onChange={(e) => updateTask(index, 'description', e.target.value)}
                sx={{ mb: 2 }}
              />

              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Assign To *</InputLabel>
                  <Select
                    value={task.assignedTo}
                    label="Assign To *"
                    onChange={(e) => updateTask(index, 'assignedTo', e.target.value)}
                  >
                    {attendees.map(att => (
                      <MenuItem key={att.user._id} value={att.user._id}>
                        {att.user.firstName} {att.user.lastName} ({att.user.facultyId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  type="date"
                  label="Due Date *"
                  value={task.dueDate}
                  onChange={(e) => updateTask(index, 'dueDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: maxDueDate }}
                  sx={{ minWidth: 180 }}
                />

                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={task.priority}
                    label="Priority"
                    onChange={(e) => updateTask(index, 'priority', e.target.value)}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Button startIcon={<Add />} onClick={addTask} sx={{ mt: 2 }}>
          Add Another Task
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating...' : `Assign ${tasks.length} Task${tasks.length > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}