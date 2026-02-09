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
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [data, setData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

      // Success - save token and user data
      localStorage.setItem('token', result.data);
      localStorage.setItem('firstName', result.firstName);
      localStorage.setItem('lastName', result.lastName);
      localStorage.setItem('email', result.email);

      // Redirect to home
      navigate('/');
      window.location.reload(); // Refresh to load user data

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
              <Alert severity="error" sx={{ mb: 2 }}>
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
                type="password"
                value={data.password}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                autoComplete="current-password"
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