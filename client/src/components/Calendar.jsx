import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  useTheme,
  useMediaQuery,
  Popover,
  Grid,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  Refresh,
  Event,
  MeetingRoom,
  Person,
  Group,
  Schedule,
  CheckCircle,
  HourglassEmpty,
  EventAvailable
} from '@mui/icons-material';

export default function Calendar() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverMeetings, setPopoverMeetings] = useState([]);

  const token = localStorage.getItem('token');

  const calendarWidth = isMobile ? window.innerWidth - 32 : 420;
  const isSmallPhone = useMediaQuery('(max-width:360px)');
  
  // FIXED: Adjusted mobile cellSize from 45 to 40 to fit smaller screens
  const cellSize = isSmallPhone ? 36 : isMobile ? 40 : isTablet ? 55 : 65;

  useEffect(() => {
    fetchMeetings();
  }, [currentDate, statusFilter]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const getMeetingsForDate = (date) => {
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.meeting_datetime);
      return (
        meetingDate.getDate() === date.getDate() &&
        meetingDate.getMonth() === date.getMonth() &&
        meetingDate.getFullYear() === date.getFullYear() &&
        (statusFilter === 'all' || meeting.status === statusFilter)
      );
    }).sort((a, b) => new Date(a.meeting_datetime) - new Date(b.meeting_datetime));
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const formatTime = (datetime) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleDateClick = (event, day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayMeetings = getMeetingsForDate(date);
    
    if (dayMeetings.length > 0) {
      setPopoverMeetings(dayMeetings);
      setAnchorEl(event.currentTarget);
      setSelectedDate(date);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rows = [];
    let cells = [];

    weekDays.forEach((day) => {
      cells.push(
        <Box
          key={`header-${day}`}
          sx={{
            width: cellSize,
            height: isMobile ? 20 : 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: isMobile ? '0.65rem' : '0.875rem',
            color: 'text.secondary'
          }}
        >
          {day}
        </Box>
      );
    });
    
    // FIXED: Adjusted the gap on the header row to match the day rows
    rows.push(
      <Box key="header-row" sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, mb: 1 }}>
        {cells}
      </Box>
    );
    cells = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(
        <Box
          key={`empty-${i}`}
          sx={{
            width: cellSize,
            height: cellSize
          }}
        />
      );
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayMeetings = getMeetingsForDate(date);
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const hasSelectedMeetings = 
        selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      cells.push(
        <Box
          key={`day-${day}`}
          onClick={(e) => dayMeetings.length > 0 && handleDateClick(e, day)}
          sx={{
            width: cellSize,
            height: cellSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: dayMeetings.length > 0 ? 'pointer' : 'default',
            borderRadius: '50%',
            border: isToday ? '2px solid' : 'none',
            borderColor: 'primary.main',
            backgroundColor: hasSelectedMeetings 
              ? alpha('#667eea', 0.15) 
              : dayMeetings.length > 0 
                ? alpha('#667eea', 0.08)
                : 'transparent',
            position: 'relative',
            transition: 'all 0.2s',
            '&:hover': dayMeetings.length > 0 ? {
              backgroundColor: alpha('#667eea', 0.15),
              transform: 'scale(1.05)'
            } : {}
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: isToday ? 700 : 500,
              color: isToday ? 'primary.main' : 'text.primary'
            }}
          >
            {day}
          </Typography>

          {dayMeetings.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: isMobile ? 14 : 18,
                height: isMobile ? 14 : 18,
                fontSize: isMobile ? '0.55rem' : '0.7rem',
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {dayMeetings.length}
            </Box>
          )}
        </Box>
      );

      if ((startingDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
        rows.push(
          <Box
            key={`row-${day}`}
            sx={{
              display: 'flex',
              gap: isMobile ? 0.5 : 1,
              mb: isMobile ? 0.5 : 1
            }}
          >
            {cells}
          </Box>
        );
        cells = [];
      }
    }

    return rows;
  };

  const stats = {
    thisMonth: meetings.filter(m => {
      const meetingDate = new Date(m.meeting_datetime);
      return meetingDate.getMonth() === currentDate.getMonth() &&
             meetingDate.getFullYear() === currentDate.getFullYear();
    }).length,
    approved: meetings.filter(m => m.status === 'approved').length,
    pending: meetings.filter(m => m.status === 'pending_approval').length,
    completed: meetings.filter(m => m.status === 'completed').length
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Meeting Calendar
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={fetchMeetings} color="primary" size={isMobile ? 'small' : 'medium'}>
            <Refresh />
          </IconButton>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: { xs: 40, sm: 50 },
                  height: { xs: 40, sm: 50 },
                  mx: 5,
                  mb: 1
                }}
              >
                <Event />
              </Avatar>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.thisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <Avatar
                sx={{
                  bgcolor: 'success.main',
                  width: { xs: 40, sm: 50 },
                  height: { xs: 40, sm: 50 },
                  mx: 5,
                  mb: 1
                }}
              >
                <CheckCircle />
              </Avatar>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <Avatar
                sx={{
                  bgcolor: 'warning.main',
                  width: { xs: 40, sm: 50 },
                  height: { xs: 40, sm: 50 },
                  mx: 5,
                  mb: 1
                }}
              >
                <HourglassEmpty />
              </Avatar>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <Avatar
                sx={{
                  bgcolor: 'grey.400',
                  width: { xs: 40, sm: 50 },
                  height: { xs: 40, sm: 50 },
                  mx: 5,
                  mb: 1
                }}
              >
                <EventAvailable />
              </Avatar>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', sm: 'flex-start' }}>
            <IconButton onClick={() => navigateMonth(-1)} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                minWidth: { xs: 180, sm: 200 },
                textAlign: 'center',
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={() => navigateMonth(1)} size="small">
              <ChevronRight />
            </IconButton>
            <Button
              startIcon={<Today />}
              onClick={goToToday}
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Today
            </Button>
          </Stack>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Meetings</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="pending_approval">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 1, sm: 3 }, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {renderCalendar()}
        </Box>
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 300, sm: 380 },
              maxHeight: 450,
              overflow: 'auto',
              mt: 1
            }
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          {selectedDate && (
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Typography>
          )}

          <Stack spacing={1.5}>
            {popoverMeetings.map((meeting) => (
              <Paper
                key={meeting._id}
                onClick={() => {
                  navigate(`/meeting-details?id=${meeting._id}`);
                  handlePopoverClose();
                }}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  },
                  transition: 'all 0.2s'
                }}
              >
                <Stack spacing={0.8}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Schedule fontSize="small" color="primary" />
                      <Typography variant="body1" fontWeight={700} color="primary">
                        {formatTime(meeting.meeting_datetime)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.3,
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: 
                          meeting.status === 'approved' ? alpha('#4caf50', 0.15) :
                          meeting.status === 'completed' ? alpha('#9e9e9e', 0.15) :
                          alpha('#ff9800', 0.15),
                        color:
                          meeting.status === 'approved' ? '#2e7d32' :
                          meeting.status === 'completed' ? '#616161' :
                          '#e65100'
                      }}
                    >
                      {meeting.status === 'approved' ? 'APPROVED' : 
                       meeting.status === 'completed' ? 'COMPLETED' : 'PENDING'}
                    </Box>
                  </Stack>
                  
                  <Typography variant="body1" fontWeight={600}>
                    {meeting.meeting_name}
                  </Typography>
                  
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <MeetingRoom fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.venue?.name || 'No venue'}
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.createdBy?.firstName} {meeting.createdBy?.lastName}
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Group fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.attendees?.length || 0} attendees
                    </Typography>
                    <Schedule fontSize="small" color="action" sx={{ ml: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {meeting.meeting_duration} min
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}