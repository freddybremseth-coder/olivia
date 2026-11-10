
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';

const registerOliviaServiceWorker=()=>{
  if(typeof window==='undefined'||!('serviceWorker' in navigator))return;
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches;
  if(path!=='/olivia'&&path!=='/app'&&!standalone)return;
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/olivia-sw.js',{scope:'/'})
      .catch(error=>console.warn('[offline] service worker registration failed',error));
  },{once:true});
};
registerOliviaServiceWorker();

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
