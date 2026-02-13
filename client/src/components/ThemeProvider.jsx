import React, { createContext, useMemo, useState, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from "@mui/material/CssBaseline";


const ThemeToggleContext = createContext();

export const useThemeToggle = () => useContext(ThemeToggleContext);

export default function ThemeProvider({ children }) {
  // Get saved theme from localStorage or default to 'light'
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode
                primary: {
                  main: '#667eea',
                  light: '#8b9cf5',
                  dark: '#5568d3',
                },
                secondary: {
                  main: '#764ba2',
                },
                background: {
                  default: '#f5f7fa',
                  paper: '#ffffff',
                },
                text: {
                  primary: '#2c3e50',
                  secondary: '#7f8c8d',
                },
                divider: '#e0e0e0',
              }
            : {
                // Dark mode
                primary: {
                  main: '#8b9cf5',
                  light: '#a5b4ff',
                  dark: '#667eea',
                },
                secondary: {
                  main: '#9d7bba',
                },
                background: {
                  default: '#0a0a0a',
                  paper: '#1a1a1a',
                },
                text: {
                  primary: '#e0e0e0',
                  secondary: '#b0b0b0',
                },
                divider: '#2a2a2a',
              }),
          success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#388e3c',
          },
          warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
          },
          error: {
            main: '#f44336',
            light: '#e57373',
            dark: '#d32f2f',
          },
          info: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
          },
          h2: {
            fontWeight: 700,
          },
          h3: {
            fontWeight: 600,
          },
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
          subtitle1: {
            fontWeight: 500,
          },
          subtitle2: {
            fontWeight: 500,
          },
          body1: {
            fontWeight: 400,
          },
          body2: {
            fontWeight: 400,
          },
          button: {
            fontWeight: 600,
            textTransform: 'none',
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          '0px 2px 4px rgba(0,0,0,0.05)',
          '0px 4px 8px rgba(0,0,0,0.08)',
          '0px 8px 16px rgba(0,0,0,0.1)',
          '0px 12px 24px rgba(0,0,0,0.12)',
          '0px 16px 32px rgba(0,0,0,0.14)',
          '0px 20px 40px rgba(0,0,0,0.16)',
          '0px 24px 48px rgba(0,0,0,0.18)',
          '0px 2px 4px rgba(0,0,0,0.05)',
          '0px 4px 8px rgba(0,0,0,0.08)',
          '0px 8px 16px rgba(0,0,0,0.1)',
          '0px 12px 24px rgba(0,0,0,0.12)',
          '0px 16px 32px rgba(0,0,0,0.14)',
          '0px 20px 40px rgba(0,0,0,0.16)',
          '0px 24px 48px rgba(0,0,0,0.18)',
          '0px 2px 4px rgba(0,0,0,0.05)',
          '0px 4px 8px rgba(0,0,0,0.08)',
          '0px 8px 16px rgba(0,0,0,0.1)',
          '0px 12px 24px rgba(0,0,0,0.12)',
          '0px 20px 40px rgba(0,0,0,0.16)',
          '0px 24px 48px rgba(0,0,0,0.18)',
          '0px 2px 4px rgba(0,0,0,0.05)',
          '0px 4px 8px rgba(0,0,0,0.08)',
          '0px 8px 16px rgba(0,0,0,0.1)',
          '0px 12px 24px rgba(0,0,0,0.12)',
        ],
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '10px 24px',
                fontSize: '0.95rem',
              },
              contained: {
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: mode === 'light' 
                  ? '0 2px 8px rgba(0,0,0,0.08)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                fontWeight: 600,
                backgroundColor: mode === 'light' ? '#f5f7fa' : '#2a2a2a',
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeToggleContext.Provider value={{ toggleTheme, mode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeToggleContext.Provider>
  );
}