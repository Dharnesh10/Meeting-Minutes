import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";

const Mytasks = () => {
  // Dummy tasks just for UI
  const [tasklist] = useState([
    {
      id: 1,
      task: "Prepare Report",
      description: "Monthly financial report preparation",
      assignby: "Mr. Admin",
      date: "2024-10-19",
      status: "assigned",
    },
    {
      id: 2,
      task: "Schedule Meeting",
      description: "Plan meeting with project team",
      assignby: "Ms. Manager",
      date: "2024-10-20",
      status: "pending",
    },
    {
      id: 3,
      task: "Finalize Document",
      description: "Complete draft and finalize docs",
      assignby: "Mr. Lead",
      date: "2024-10-21",
      status: "completed",
    },
  ]);

  const [selectedTask, setSelectedTask] = useState(null);

  const handleOpen = (task) => setSelectedTask(task);
  const handleClose = () => setSelectedTask(null);

  return (
    <Box sx={{ p: 3 }}>
      {!tasklist.length ? (
        <Typography variant="body1" sx={{ textAlign: "center", mt: 4 }}>
          No tasks assigned!
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
          <Table>
            <TableBody>
              {tasklist.map((task, index) => (
                <TableRow
                  key={task.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleOpen(task)}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{task.task}</TableCell>
                  <TableCell>{task.date}</TableCell>
                  <TableCell>
                    {task.status === "assigned" ? (
                      <Button size="small" variant="outlined" color="primary">
                        SUBMIT
                      </Button>
                    ) : task.status === "pending" ? (
                      <Button size="small" variant="outlined" color="warning">
                        PENDING
                      </Button>
                    ) : (
                      <Button size="small" variant="contained" color="success" disabled>
                        COMPLETED
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Task Details Dialog */}
      <Dialog
        open={!!selectedTask}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 2 },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          Task Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Task
                </Typography>
                <Typography variant="body1">{selectedTask.task}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {selectedTask.description}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Assigned By
                </Typography>
                <Typography variant="body1">{selectedTask.assignby}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1">{selectedTask.date}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Mytasks;
