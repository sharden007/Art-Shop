import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18
import App from './App'; // Import your main App component

// Get the root element from index.html
const rootElement = document.getElementById('root');

// Create a React root and render your App component
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
