// server/routes/tasks.js
const router = require('express').Router();
const mongoose = require('mongoose');
const { Task } = require('../models/task');
const { User } = require('../models/user');
const { ScheduledMeeting } = require('../models/scheduledMeeting'); // Updated import
const authMiddleware = require('../middleware/auth');

// ============================================
// CREATE TASKS FROM MEETING (Bulk creation)
// ============================================
router.post('/meetings/:meetingId/tasks/bulk', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { tasks } = req.body; 
    
    // Verify meeting exists and user is host
    const meeting = await ScheduledMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }
    
    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only meeting host can create tasks' });
    }
    
    // Validate all tasks have assignedTo
    const incompleteTasks = tasks.filter(t => !t.assignedTo);
    if (incompleteTasks.length > 0) {
      return res.status(400).send({ message: 'All tasks must be assigned to someone' });
    }
    
    // Validate due dates
    for (const task of tasks) {
      const validation = await Task.validateDueDate(task.dueDate, meetingId);
      if (!validation.valid) {
        return res.status(400).send({ message: validation.message });
      }
    }
    
    // Create all tasks
    const createdTasks = await Promise.all(
      tasks.map(async (taskData) => {
        const task = new Task({
          meeting: meetingId,
          meetingName: meeting.meeting_name,
          meetingId: meeting.meetingid,
          title: taskData.title,
          description: taskData.description,
          assignedTo: taskData.assignedTo,
          assignedBy: req.user.id,
          dueDate: taskData.dueDate,
          priority: taskData.priority || 'medium',
          relatedMinute: taskData.relatedMinute,
          followupMeeting: meeting.followupMeetings?.[0],
          isLocked: true, 
        });
        
        await task.save();
        return task;
      })
    );
    
    return res.status(201).send({
      message: `${createdTasks.length} tasks created successfully`,
      tasks: createdTasks
    });
    
  } catch (error) {
    console.error('Bulk create tasks error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// GET ALL TASKS FOR A MEETING
// ============================================
router.get('/meetings/:meetingId/tasks', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await ScheduledMeeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }
    
    const isAttendee = meeting.attendees.some(a => a.user.toString() === req.user.id);
    const isHost = meeting.createdBy.toString() === req.user.id;
    
    if (!isAttendee && !isHost) {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    const tasks = await Task.find({ meeting: meetingId })
      .populate('assignedTo', 'firstName lastName email facultyId')
      .populate('assignedBy', 'firstName lastName')
      .populate('submissions.reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    return res.status(200).send(tasks);
    
  } catch (error) {
    console.error('Get meeting tasks error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// GET MY TASKS (All tasks assigned to me)
// ============================================
router.get('/my-tasks', authMiddleware, async (req, res) => {
  try {
    const { sort = 'new_to_old', status, fromDate, toDate } = req.query;
    
    let query = { assignedTo: req.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'old_to_new') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'due_date') {
      sortOption = { dueDate: 1 };
    }
    
    const tasks = await Task.find(query)
      .populate('meeting', 'meeting_name meeting_datetime venue')
      .populate('assignedBy', 'firstName lastName')
      .populate('submissions.reviewedBy', 'firstName lastName')
      .sort(sortOption);
    
    return res.status(200).send(tasks);
    
  } catch (error) {
    console.error('Get my tasks error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// GET ALL TASKS (For Tasks Page)
// ============================================
router.get('/all-tasks', authMiddleware, async (req, res) => {
  try {
    const { sort = 'new_to_old', fromDate, toDate } = req.query;
    
    const meetings = await ScheduledMeeting.find({
      $or: [
        { createdBy: req.user.id },
        { 'attendees.user': req.user.id }
      ]
    }).select('_id');
    
    const meetingIds = meetings.map(m => m._id);
    
    let query = { meeting: { $in: meetingIds } };
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'old_to_new') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'due_date') {
      sortOption = { dueDate: 1 };
    }
    
    const tasks = await Task.find(query)
      .populate('meeting', 'meeting_name meeting_datetime createdBy venue')
      .populate('assignedTo', 'firstName lastName email facultyId')
      .populate('assignedBy', 'firstName lastName')
      .sort(sortOption);
    
    const groupedTasks = tasks.reduce((acc, task) => {
      const meetingId = task.meeting._id.toString();
      if (!acc[meetingId]) {
        acc[meetingId] = {
          meeting: task.meeting,
          meetingName: task.meetingName,
          meetingId: task.meetingId,
          tasks: []
        };
      }
      acc[meetingId].tasks.push(task);
      return acc;
    }, {});
    
    return res.status(200).send(Object.values(groupedTasks));
    
  } catch (error) {
    console.error('Get all tasks error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// GET SINGLE TASK
// ============================================
router.get('/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('meeting')
      .populate('assignedTo', 'firstName lastName email facultyId')
      .populate('assignedBy', 'firstName lastName')
      .populate('submissions.reviewedBy', 'firstName lastName');
    
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    
    const meeting = await ScheduledMeeting.findById(task.meeting._id);
    const isAttendee = meeting.attendees.some(a => a.user.toString() === req.user.id);
    const isHost = meeting.createdBy.toString() === req.user.id;
    
    if (!isAttendee && !isHost) {
      return res.status(403).send({ message: 'Access denied' });
    }
    
    return res.status(200).send(task);
    
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// UPDATE TASK STATUS
// ============================================
router.patch('/:taskId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.taskId);
    
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    
    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only assigned user can update status' });
    }
    
    const validStatuses = ['not_started', 'in_progress'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ message: 'Invalid status' });
    }
    
    task.status = status;
    await task.save();
    
    return res.status(200).send({ message: 'Status updated', task });
    
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// SUBMIT TASK
// ============================================
router.post('/:taskId/submit', authMiddleware, async (req, res) => {
  try {
    const { description, attachments } = req.body;
    const task = await Task.findById(req.params.taskId)
      .populate('assignedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName');
    
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    
    if (task.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only assigned user can submit' });
    }
    
    if (task.status === 'submitted' && task.latestSubmission?.status === 'pending_review') {
      return res.status(400).send({ message: 'Task already submitted. Awaiting review.' });
    }
    
    const submission = {
      description,
      attachments: attachments || [],
      status: 'pending_review',
      submittedAt: new Date()
    };
    
    task.submissions.push(submission);
    task.currentSubmission = task.submissions.length - 1;
    task.status = 'submitted';
    
    await task.save();
    
    try {
      const Notification = require('../models/notification');
      await Notification.create({
        recipient: task.assignedBy._id,
        type: 'task_submitted',
        title: 'Task Submitted for Review',
        message: `${task.assignedTo.firstName} ${task.assignedTo.lastName} has submitted task "${task.title}" for your review`,
        relatedTask: task._id,
        triggeredBy: req.user.id
      });
    } catch (notifError) {
      console.error('❌ Failed to send task notification:', notifError);
    }
    
    return res.status(200).send({ message: 'Task submitted for review', task });
    
  } catch (error) {
    console.error('Submit task error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// REVIEW TASK
// ============================================
router.post('/:taskId/review', authMiddleware, async (req, res) => {
  try {
    const { action, reviewNotes } = req.body;
    const task = await Task.findById(req.params.taskId)
      .populate('assignedTo', 'firstName lastName email');
    
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    
    if (task.assignedBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only the meeting host can review tasks' });
    }
    
    if (!task.latestSubmission || task.latestSubmission.status !== 'pending_review') {
      return res.status(400).send({ message: 'No submission pending review' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).send({ message: 'Invalid action' });
    }
    
    if (action === 'reject' && !reviewNotes) {
      return res.status(400).send({ message: 'Rejection reason is required' });
    }
    
    const submission = task.submissions[task.currentSubmission];
    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.reviewedAt = new Date();
    submission.reviewedBy = req.user.id;
    submission.reviewNotes = reviewNotes;
    
    if (action === 'approve') {
      task.status = 'completed';
      task.completedAt = new Date();
    } else {
      task.status = 'rejected';
    }
    
    await task.save();
    await task.populate([{ path: 'submissions.reviewedBy', select: 'firstName lastName' }]);
    
    try {
      const Notification = require('../models/notification');
      await Notification.create({
        recipient: task.assignedTo._id,
        type: action === 'approve' ? 'task_approved' : 'task_rejected',
        title: action === 'approve' ? 'Task Approved' : 'Task Rejected',
        message: action === 'approve' 
          ? `Your task "${task.title}" has been approved`
          : `Your task "${task.title}" has been rejected: ${reviewNotes}`,
        relatedTask: task._id,
        triggeredBy: req.user.id
      });
    } catch (notifError) {
      console.error('❌ Failed to send review notification:', notifError);
    }
    
    return res.status(200).send({ message: `Task ${action}d successfully`, task });
    
  } catch (error) {
    console.error('Review task error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// SEND REMINDER
// ============================================
router.post('/:taskId/remind', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName');
    
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    
    if (task.assignedBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only task creator can send reminders' });
    }
    
    try {
      const Notification = require('../models/notification');
      await Notification.create({
        recipient: task.assignedTo._id,
        type: 'task_reminder',
        title: 'Task Reminder',
        message: `Reminder: Please complete task "${task.title}"`,
        relatedTask: task._id,
        triggeredBy: req.user.id
      });
    } catch (notifError) {
      console.error('Failed to send reminder:', notifError);
    }
    
    return res.status(200).send({ 
      message: `Reminder sent to ${task.assignedTo.firstName} ${task.assignedTo.lastName}` 
    });
    
  } catch (error) {
    console.error('Send reminder error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ============================================
// GET TASK STATISTICS
// ============================================
router.get('/meetings/:meetingId/stats', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const stats = await Task.aggregate([
      { $match: { meeting: new mongoose.Types.ObjectId(meetingId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const completed = stats.find(s => s._id === 'completed')?.count || 0;
    const pending = stats.find(s => s._id === 'submitted')?.count || 0;
    const notStarted = stats.filter(s => ['not_started', 'in_progress'].includes(s._id))
      .reduce((sum, s) => sum + s.count, 0);
    
    return res.status(200).send({
      total,
      completed,
      pending,
      notStarted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
    
  } catch (error) {
    console.error('Get task stats error:', error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
});

module.exports = router;