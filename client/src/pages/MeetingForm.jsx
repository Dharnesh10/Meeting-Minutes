import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

const Details = () => {
  const [openConfirm, setOpenConfirm] = useState(false);

  // Dummy data
  const meetingdetails = {
    meetingid: "12345",
    title: "Project Review",
    mid: "87654",
    dept: "IT Department",
    host: "Mr. Asdf",
    date: "2024-10-21",
    time: "11:00 AM",
    minutetaker: "Jane Doe",
    venue: "Seminar Hall",
    description:
      "This meeting is to review the progress of the Q4 project milestones, discuss blockers, and assign new tasks. Please prepare the required documents beforehand.",
    members: ["john.doe@bitsaty.com", "jane.smith@bitsaty.com", "alex@bitsaty.com"],
    status: "active",
  };

  const titleStyle = { color: "#006a67", fontWeight: "bold" };

  return (
    <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
      <Card
        sx={{
          width: "90%",
          maxWidth: 1000,
          minHeight: 600,
          borderRadius: 3,
          boxShadow: 6,
          position: "relative",
          p: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Edit button */}
        <IconButton sx={{ position: "absolute", top: 12, right: 12 }} color="primary">
          <EditIcon />
        </IconButton>

        <CardContent sx={{ flex: 1, overflow: "hidden" }}>
          <Box sx={{ display: "flex", gap: 6, height: "100%" }}>
            {/* Left side */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body1">
                <span style={titleStyle}>Title:</span> {meetingdetails.title}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Mid:</span> {meetingdetails.mid}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Dept:</span> {meetingdetails.dept}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Host:</span> {meetingdetails.host}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Date:</span> {meetingdetails.date}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Time:</span> {meetingdetails.time}
              </Typography>
              <Typography variant="body1">
                <span style={titleStyle}>Minute Taker:</span> {meetingdetails.minutetaker}
              </Typography>
            </Box>

            {/* Right side */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body1">
                <span style={titleStyle}>Venue:</span> {meetingdetails.venue}
              </Typography>

              <Typography variant="body1">
                <span style={titleStyle}>Description:</span>
              </Typography>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "grey.300",
                  borderRadius: 2,
                  p: 2,
                  flex: 1,
                  overflow: "auto",
                  backgroundColor: "grey.50",
                }}
              >
                <Typography variant="body2">{meetingdetails.description}</Typography>
              </Box>

              <Typography variant="body1">
                <span style={titleStyle}>Members:</span>
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  maxHeight: 150,
                  overflow: "auto",
                  p: 1,
                  border: "1px dashed",
                  borderColor: "grey.300",
                  borderRadius: 2,
                }}
              >
                {meetingdetails.members.map((m, i) => (
                  <Chip key={i} label={m} size="small" />
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>

        <Divider />

        {/* Action buttons */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 3, p: 3 }}>
          <Button
            variant="contained"
            color="error"
            sx={{ px: 4, py: 1.5, fontWeight: "bold" }}
            onClick={() => setOpenConfirm(true)}
          >
            END THE MEETING
          </Button>
          <Button variant="contained" color="primary" sx={{ px: 4, py: 1.5, fontWeight: "bold" }}>
            FOLLOW UP
          </Button>
        </Box>
      </Card>

      {/* Confirm Popup */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Are you sure you want to end the meeting?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Once ended, the meeting status will be marked as completed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Close</Button>
          <Button variant="contained" color="error">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Details;
