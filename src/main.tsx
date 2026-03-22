import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const stored = localStorage.getItem('ls_dashboard_theme');
document.documentElement.setAttribute('data-theme', stored === 'light' ? 'light' : 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
