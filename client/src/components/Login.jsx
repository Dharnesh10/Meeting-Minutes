import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function Login() {
  const [data, setData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setData({
      ...data,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle error response
        throw new Error(result.message || 'Login failed');
      }

      // Clear old data first
      localStorage.clear();

      // Save token
      localStorage.setItem('token', result.data);

      // Save user data from the user object (NEW API FORMAT)
      if (result.user) {
        
        // Save all user information
        if (result.user.firstName) {
          localStorage.setItem('firstName', result.user.firstName);
        }
        if (result.user.lastName) {
          localStorage.setItem('lastName', result.user.lastName);
        }
        if (result.user.email) {
          localStorage.setItem('email', result.user.email);
        }
        if (result.user.id) {
          localStorage.setItem('userId', result.user.id);
        }
        if (result.user.role) {
          localStorage.setItem('role', result.user.role);
        }
        if (result.user.facultyId) {
          localStorage.setItem('facultyId', result.user.facultyId);
        }
        localStorage.setItem('canApproveMeetings', 
          (result.user.canApproveMeetings || false).toString()
        );
        
        // Save department info
        if (result.user.department) {
          const deptId = result.user.department._id || result.user.department;
          localStorage.setItem('departmentId', deptId);
          
          if (result.user.department.name) {
            localStorage.setItem('departmentName', result.user.department.name);
          }
        }
      } else if (result.firstName) {
        // Fallback: OLD API FORMAT (backward compatibility)
        console.log('Using old API format');
        localStorage.setItem('firstName', result.firstName);
        localStorage.setItem('lastName', result.lastName);
        localStorage.setItem('email', result.email);
      }

      // Verify what was saved
      console.log('Saved to localStorage:', {
        firstName: localStorage.getItem('firstName'),
        lastName: localStorage.getItem('lastName'),
        role: localStorage.getItem('role')
      });

      // Redirect to home without reload
      navigate('/');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 450 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
              Meeting Management
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>
              Sign In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={data.email}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
                autoComplete="email"
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Typography align="center" variant="body2">
                Don't have an account?{' '}
                <Link href="/signup" underline="hover">
                  Sign Up
                </Link>
              </Typography>
            </form>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" display="block" gutterBottom fontWeight="bold">
                Test Accounts:
              </Typography>
              <Typography variant="caption" display="block">
                Admin: admin@college.edu
              </Typography>
              <Typography variant="caption" display="block">
                HOD IT: it001@college.edu
              </Typography>
              <Typography variant="caption" display="block">
                Faculty: it002@college.edu
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Password: Password@123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}