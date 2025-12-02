import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Corrected import path for App.tsx
import App from './App.tsx';
import './src/index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
          <App />
        </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);