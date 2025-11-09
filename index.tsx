import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Corrected import path for App.tsx
import App from './App.tsx';
import { initializeLocalStorage } from './constants.ts';
import './src/index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

initializeLocalStorage();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);