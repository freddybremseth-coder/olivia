
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';

const loadProfessionalLinks = () => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-donaanna-links="true"]')) return;

  const script = document.createElement('script');
  script.src = '/donaanna-site-links.js';
  script.defer = true;
  script.dataset.donaannaLinks = 'true';
  document.body.appendChild(script);
};

loadProfessionalLinks();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
