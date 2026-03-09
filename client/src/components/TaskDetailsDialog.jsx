// client/src/components/TaskDetailsDialog.jsx
import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tabs, Tab, Box, Typography, List, ListItem, ListItemText,
  Chip, Stack, Divider, Alert, IconButton, Tooltip, LinearProgress,
  Badge
} from '@mui/material';
import { 
  Close, PlayArrow, Send, CheckCircle, Cancel, 
  NotificationsActive, History
} from '@mui/icons-material';
import SubmitTaskDialog from './SubmitTaskDialog';
import ReviewTaskDialog from './ReviewTaskDialog';

function TabPanel({ children, value, index }) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ py: 2 }}>{children}</Box>}</div>;
}

export default function TaskDetailsDialog({ open, onClose, meetingData, onRefresh }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitDialog, setSubmitDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const userId = localStorage.getItem('userId');
  const isHost = meetingData.meeting.createdBy?._id === userId || meetingData.meeting.createdBy === userId;

  useEffect(() => {
    if (open) fetchTasks();
  }, [open]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/tasks/meetings/${meetingData.meeting._id}/tasks`);
      setTasks(response.data);
    } catch (err) {
      console.error('[TaskDetails] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await axios.patch(`/tasks/${taskId}/status`, { status: 'in_progress' });
      fetchTasks();
    } catch (err) {
      console.error('[TaskDetails] Start task error:', err);
    }
  };

  const handleSubmitClick = (task) => {
    setSelectedTask(task);
    setSubmitDialog(true);
  };

  const handleReviewClick = (task) => {
    setSelectedTask(task);
    setReviewDialog(true);
  };

  const handleRemindUser = async (task) => {
    try {
      await axios.post(`/tasks/${task._id}/remind`);
      alert(`Reminder sent to ${task.assignedTo.firstName} ${task.assignedTo.lastName}`);
    } catch (err) {
      console.error('[TaskDetails] Remind error:', err);
    }
  };

  const getStatusBadge = (task) => {
    const latestSubmission = task.submissions?.[task.currentSubmission];
    if (task.status === 'completed' || latestSubmission?.status === 'approved') {
      return { label: 'Completed', color: 'success' };
    }
    if (task.status === 'rejected' || latestSubmission?.status === 'rejected') {
      return { label: 'Rejected', color: 'error' };
    }
    if (task.status === 'submitted' || latestSubmission?.status === 'pending_review') {
      return { label: 'Pending Review', color: 'warning' };
    }
    if (task.status === 'in_progress') return { label: 'In Progress', color: 'info' };
    return { label: 'Not Started', color: 'default' };
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const isMyTask = (task) => task.assignedTo._id === userId;

  // Filter tasks for different tabs
  const myTasks = tasks.filter(t => isMyTask(t));
  const reviewTasks = tasks.filter(t => 
    t.status === 'submitted' && 
    t.submissions?.some(s => s.status === 'pending_review')
  );
  const notCompletedTasks = tasks
    .filter(t => ['not_started', 'in_progress', 'rejected', 'submitted'].includes(t.status))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

// client/src/components/TaskDetailsDialog.jsx

// ... existing imports

// I've updated the two render functions specifically to handle the nesting issues

  const renderTask = (task, showActions = false, highlightIfMine = false) => {
    const badge = getStatusBadge(task);
    const isMine = isMyTask(task);
    const canSubmit = isMine && ['not_started', 'in_progress', 'rejected'].includes(task.status);
    const canReview = isHost && task.status === 'submitted' && task.submissions?.some(s => s.status === 'pending_review');
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
      <ListItem 
        key={task._id} 
        sx={{ 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          gap: 1, 
          py: 2,
          bgcolor: highlightIfMine && isMine ? 'action.hover' : 'transparent',
          borderRadius: highlightIfMine && isMine ? 1 : 0,
          borderLeft: highlightIfMine && isMine ? '4px solid' : 'none',
          borderColor: highlightIfMine && isMine ? 'primary.main' : 'transparent',
        }}
      >
        <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
          {/* Changed Box to div component implicitly or via Stack */}
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold">{task.title}</Typography>
              {highlightIfMine && isMine && (
                <Chip label="MY TASK" size="small" color="primary" sx={{ height: 20 }} />
              )}
            </Stack>
            {/* Added component="div" to allow nested content if needed, though simple text is fine here */}
            <Typography variant="body2" color="text.secondary" component="div">
              {task.description}
            </Typography>
          </Box>
          <Box>
            <Chip label={badge.label} color={badge.color} size="small" />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip 
            label={`Assigned to: ${task.assignedTo.firstName} ${task.assignedTo.lastName}`} 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label={`Due: ${formatDate(task.dueDate)}`} 
            size="small" 
            color={isOverdue ? 'error' : 'default'} 
          />
          <Chip label={task.priority.toUpperCase()} size="small" />
        </Stack>

        {task.submissions && task.submissions.length > 0 && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <Stack spacing={1}>
              {task.submissions.map((submission, idx) => (
                <Alert 
                  key={idx}
                  severity={
                    submission.status === 'approved' ? 'success' :
                    submission.status === 'rejected' ? 'error' : 'warning'
                  }
                  sx={{ py: 0.5 }}
                  icon={<History />}
                >
                  {/* Using Box instead of Typography to avoid <p> nesting */}
                  <Box sx={{ typography: 'caption', fontWeight: 'bold' }}>
                    Submission #{idx + 1} - {submission.status.toUpperCase()}
                  </Box>
                  {submission.reviewNotes && (
                    <Box sx={{ typography: 'caption', display: 'block' }}>
                      <strong>Review:</strong> {submission.reviewNotes}
                    </Box>
                  )}
                  <Box sx={{ typography: 'caption', display: 'block', color: 'text.secondary' }}>
                    {new Date(submission.submittedAt).toLocaleString()}
                  </Box>
                </Alert>
              ))}
            </Stack>
          </Box>
        )}

        {showActions && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {task.status === 'not_started' && isMine && (
              <Button size="small" variant="outlined" startIcon={<PlayArrow />} 
                onClick={() => handleStartTask(task._id)}>Start Task</Button>
            )}
            {canSubmit && (
              <Button size="small" variant="contained" startIcon={<Send />}
                onClick={() => handleSubmitClick(task)}>Submit Proof</Button>
            )}
            {canReview && (
              <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />}
                onClick={() => handleReviewClick(task)}>Review</Button>
            )}
          </Stack>
        )}
      </ListItem>
    );
  };

  const renderNotCompletedTask = (task) => {
    const badge = getStatusBadge(task);
    const isMine = isMyTask(task);
    const isOverdue = new Date(task.dueDate) < new Date();

    return (
      <ListItem 
        key={task._id}
        sx={{ 
          py: 2,
          bgcolor: isOverdue ? 'error.light' : 'transparent',
          borderRadius: 1
        }}
      >
        <ListItemText
          // Change primary and secondary to render as <div> instead of <p>
          primaryTypographyProps={{ component: 'div' }}
          secondaryTypographyProps={{ component: 'div' }}
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold">{task.title}</Typography>
              <Chip label={badge.label} color={badge.color} size="small" />
              {isMine && <Chip label="MY TASK" size="small" color="primary" />}
            </Stack>
          }
          secondary={
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2" component="div">
                Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}
              </Typography>
              <Typography 
                variant="body2" 
                component="div"
                color={isOverdue ? 'error' : 'text.secondary'}
              >
                Due: {formatDate(task.dueDate)} {isOverdue && '(OVERDUE)'}
              </Typography>
            </Stack>
          }
        />
        {isHost && !isMine && (
          <Tooltip title="Send reminder">
            <IconButton onClick={() => handleRemindUser(task)} color="primary">
              <NotificationsActive />
            </IconButton>
          </Tooltip>
        )}
      </ListItem>
    );
  };


  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{meetingData.meetingName} - Tasks</Typography>
            <IconButton onClick={onClose}><Close /></IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
            <Tab label={`All Tasks (${tasks.length})`} />
            {isHost && <Tab label={
              <Badge badgeContent={reviewTasks.length} color="warning">
                Review
              </Badge>
            } />}
            <Tab label={`Not Completed (${notCompletedTasks.length})`} />
          </Tabs>

          {loading ? <LinearProgress /> : (
            <>
              {/* All Tasks Tab */}
              <TabPanel value={currentTab} index={0}>
                {tasks.length === 0 ? (
                  <Alert severity="info">No tasks for this meeting</Alert>
                ) : (
                  <List>
                    {tasks.map(t => renderTask(t, isMyTask(t), true))}
                  </List>
                )}
              </TabPanel>

              {/* Review Tab (Host Only) */}
              {isHost && (
                <TabPanel value={currentTab} index={1}>
                  {reviewTasks.length === 0 ? (
                    <Alert severity="info">No tasks pending review</Alert>
                  ) : (
                    <List>
                      {reviewTasks.map(t => renderTask(t, true, false))}
                    </List>
                  )}
                </TabPanel>
              )}

              {/* Not Completed Tab */}
              <TabPanel value={currentTab} index={isHost ? 2 : 1}>
                {notCompletedTasks.length === 0 ? (
                  <Alert severity="success">All tasks completed!</Alert>
                ) : (
                  <List>
                    {notCompletedTasks.map(t => renderNotCompletedTask(t))}
                  </List>
                )}
              </TabPanel>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {selectedTask && (
        <>
          <SubmitTaskDialog 
            open={submitDialog} 
            onClose={() => setSubmitDialog(false)}
            task={selectedTask} 
            onSuccess={() => { fetchTasks(); onRefresh(); }} 
          />
          <ReviewTaskDialog 
            open={reviewDialog} 
            onClose={() => setReviewDialog(false)}
            task={selectedTask} 
            onSuccess={() => { fetchTasks(); onRefresh(); }} 
          />
        </>
      )}
    </>
  );
}