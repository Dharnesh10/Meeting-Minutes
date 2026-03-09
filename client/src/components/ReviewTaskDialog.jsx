// client/src/components/ReviewTaskDialog.jsx
import React, { useState } from 'react';
import axios from '../config/axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Typography, Alert, Stack, Box, Chip, IconButton, Divider
} from '@mui/material';
import { Close, CheckCircle, Cancel } from '@mui/icons-material';

export default function ReviewTaskDialog({ open, onClose, task, onSuccess }) {
  const [action, setAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const latestSubmission = task.submissions?.[task.currentSubmission];

  const handleReview = async (reviewAction) => {
    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`/tasks/${task._id}/review`, {
        action: reviewAction,
        reviewNotes: reviewNotes || undefined
      });

      setAction('');
      setReviewNotes('');
      onClose();
      onSuccess();
    } catch (err) {
      console.error('[ReviewTask] Error:', err);
      setError(err.message || 'Failed to review task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Review Task Submission</Typography>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">{task.title}</Typography>
          <Typography variant="body2" color="text.secondary">{task.description}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {latestSubmission && (
          <>
            <Typography variant="subtitle2" gutterBottom>Staff Submission:</Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2">{latestSubmission.description}</Typography>
              
              {latestSubmission.attachments?.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                  {latestSubmission.attachments.map((att, idx) => (
                    <Chip key={idx} label={att.filename} size="small" 
                      component="a" href={att.url} target="_blank" clickable />
                  ))}
                </Stack>
              )}
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Submitted: {new Date(latestSubmission.submittedAt).toLocaleString()}
              </Typography>
            </Box>
          </>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label={action === 'reject' ? 'Reason for Rejection *' : 'Review Notes (Optional)'}
          placeholder={action === 'reject' ? 'Explain why this needs to be redone...' : 'Add any comments...'}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          error={action === 'reject' && !reviewNotes.trim()}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="outlined" color="error" startIcon={<Cancel />}
          onClick={() => { setAction('reject'); handleReview('reject'); }} disabled={loading}>
          Reject
        </Button>
        <Button variant="contained" color="success" startIcon={<CheckCircle />}
          onClick={() => { setAction('approve'); handleReview('approve'); }} disabled={loading}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}