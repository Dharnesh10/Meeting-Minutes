// client/src/components/SubmitTaskDialog.jsx
import React, { useState } from 'react';
import axios from '../config/axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Typography, Alert, Stack, Box, Chip, IconButton
} from '@mui/material';
import { Close, Send, AttachFile, Link as LinkIcon } from '@mui/icons-material';

export default function SubmitTaskDialog({ open, onClose, task, onSuccess }) {
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newLink, setNewLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddLink = () => {
    if (newLink.trim()) {
      setAttachments([...attachments, { type: 'link', url: newLink, filename: newLink }]);
      setNewLink('');
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`/tasks/${task._id}/submit`, {
        description,
        attachments
      });

      setDescription('');
      setAttachments([]);
      onClose();
      onSuccess();
    } catch (err) {
      console.error('[SubmitTask] Error:', err);
      setError(err.message || 'Failed to submit task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Submit Task Proof</Typography>
          <IconButton onClick={onClose}><Close /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">{task.title}</Typography>
          <Typography variant="body2" color="text.secondary">{task.description}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Description of Completion *"
          placeholder="Explain how you completed this task..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle2" gutterBottom>Attachments (Optional)</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Paste link (Google Drive, document, screenshot URL...)"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
          />
          <Button variant="outlined" startIcon={<LinkIcon />} onClick={handleAddLink}>Add</Button>
        </Stack>

        {attachments.length > 0 && (
          <Stack spacing={1}>
            {attachments.map((att, idx) => (
              <Chip key={idx} label={att.filename} onDelete={() => 
                setAttachments(attachments.filter((_, i) => i !== idx))} />
            ))}
          </Stack>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          Provide proof of completion such as screenshots, final documents, or links to completed work.
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" startIcon={<Send />} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit for Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}