import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Rating,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  Alert,
  Checkbox,
  FormControlLabel,
  FormLabel
} from '@mui/material';
import {
  CheckCircle,
  Close,
  CallSplit,
  Star
} from '@mui/icons-material';

export default function EndMeetingDialog({ 
  open, 
  onClose, 
  onEnd, 
  onCreateFollowup,
  meetingName 
}) {
  const [step, setStep] = useState(1); // 1: Choose action, 2: End meeting form
  const [action, setAction] = useState(''); // 'end' or 'followup'
  
  // End meeting form state
  const [completionNotes, setCompletionNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hasUnfinishedItems, setHasUnfinishedItems] = useState(false);

  const handleNext = () => {
    if (action === 'followup') {
      // Create follow-up meeting
      onCreateFollowup();
      handleClose();
    } else {
      // Go to end meeting form
      setStep(2);
    }
  };

  const handleEndMeeting = () => {
    onEnd({
      completionNotes,
      rating,
      feedback
    });
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setAction('');
    setCompletionNotes('');
    setRating(0);
    setFeedback('');
    setHasUnfinishedItems(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      {step === 1 ? (
        // Step 1: Choose Action
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              End Meeting
            </Box>
          </DialogTitle>

          <DialogContent>
            <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
              <strong>"{meetingName}"</strong>
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Has this meeting concluded or do you need to schedule a follow-up?
            </Alert>

            <Stack spacing={2}>
              {/* End Meeting Option */}
              <Box
                onClick={() => setAction('end')}
                sx={{
                  p: 3,
                  border: 2,
                  borderColor: action === 'end' ? 'success.main' : 'grey.300',
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: action === 'end' ? 'success.50' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'success.main',
                    bgcolor: 'success.50'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <CheckCircle color={action === 'end' ? 'success' : 'action'} />
                  <Typography variant="h6">
                    End Meeting
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Meeting objectives completed. Mark as finished and provide feedback.
                </Typography>
              </Box>

              {/* Create Follow-up Option */}
              <Box
                onClick={() => setAction('followup')}
                sx={{
                  p: 3,
                  border: 2,
                  borderColor: action === 'followup' ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: action === 'followup' ? 'primary.50' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <CallSplit color={action === 'followup' ? 'primary' : 'action'} />
                  <Typography variant="h6">
                    Create Follow-up Meeting
                  </Typography>
                  <Chip 
                    label="F" 
                    color="primary" 
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Need more discussion? End this meeting and schedule a follow-up session.
                </Typography>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClose} startIcon={<Close />}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={!action}
              color={action === 'followup' ? 'primary' : 'success'}
              startIcon={action === 'followup' ? <CallSplit /> : <CheckCircle />}
            >
              {action === 'followup' ? 'Create Follow-up' : 'Continue'}
            </Button>
          </DialogActions>
        </>
      ) : (
        // Step 2: End Meeting Form
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              Complete Meeting
            </Box>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Completion Notes */}
              <TextField
                label="Meeting Summary / Completion Notes"
                multiline
                rows={4}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Summarize key outcomes, decisions, and next steps..."
                fullWidth
              />

              <Divider />

              {/* Rating */}
              <Box>
                <FormLabel component="legend" sx={{ mb: 1 }}>
                  How would you rate this meeting?
                </FormLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Rating
                    value={rating}
                    onChange={(e, newValue) => setRating(newValue)}
                    size="large"
                    icon={<Star fontSize="inherit" />}
                    emptyIcon={<Star fontSize="inherit" />}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {rating === 0 && 'Not rated'}
                    {rating === 1 && 'Poor'}
                    {rating === 2 && 'Below Average'}
                    {rating === 3 && 'Average'}
                    {rating === 4 && 'Good'}
                    {rating === 5 && 'Excellent'}
                  </Typography>
                </Box>
              </Box>

              {/* Feedback */}
              <TextField
                label="Additional Feedback (Optional)"
                multiline
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share any additional thoughts or suggestions..."
                fullWidth
              />

              {/* Unfinished Items Warning */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hasUnfinishedItems}
                    onChange={(e) => setHasUnfinishedItems(e.target.checked)}
                  />
                }
                label="This meeting has unfinished action items or discussions"
              />

              {hasUnfinishedItems && (
                <Alert severity="warning">
                  Consider creating a follow-up meeting to address remaining items.
                  You can do this from the meeting details page after ending.
                </Alert>
              )}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleEndMeeting}
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
            >
              End Meeting
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}