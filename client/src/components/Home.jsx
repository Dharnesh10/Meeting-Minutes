import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import {
  Person,
  CalendarToday,
  Schedule,
  MeetingRoom,
} from '@mui/icons-material';

export default function Home() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const userName = localStorage.getItem('firstName') || 'User';

  useEffect(() => {
    const fetchMeetings = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/meetings', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }

        const data = await res.json();
        setMeetings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const formatDate = (dt) =>
    new Date(dt).toLocaleDateString();

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Box sx={{ pl: { xs: 3, md: 11 }, pt: 3 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Welcome, {userName} !
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {loading ? (
          <Typography>Loading meetings...</Typography>
        ) : meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card key={meeting._id} sx={{ width: 280 }}>
              {meeting.meeting_followup && (
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <Typography color="primary">F</Typography>
                </Box>
              )}

              <CardMedia
                component="img"
                height="120"
                image="./meeting.png"
              />

              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  {meeting.meeting_name}
                </Typography>

                <Typography variant="body2" mb={1}>
                  By {meeting.meeting_host_by}
                </Typography>

                <Stack spacing={1}>
                  <Stack direction="row" spacing={1}>
                    <Person fontSize="small" />
                    <Typography variant="body2">
                      {meeting.meeting_host_name}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <CalendarToday fontSize="small" />
                    <Typography variant="body2">
                      {formatDate(meeting.meeting_datetime)}
                    </Typography>
                    <Schedule fontSize="small" />
                    <Typography variant="body2">
                      {formatTime(meeting.meeting_datetime)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <MeetingRoom fontSize="small" />
                    <Typography variant="body2">
                      {meeting.meeting_venue}
                    </Typography>
                  </Stack>
                </Stack> 
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography>No meetings found!</Typography>
        )}
      </Box>
    </Box>
  );
}
