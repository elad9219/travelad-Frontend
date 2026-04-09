import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import PlaceDetails from './Components/PlaceDetails/PlaceDetails/PlaceDetails';
import ErrorBoundary from './Components/Components/ErrorBoundary/ErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
      <ErrorBoundary>
          <App />
      </ErrorBoundary>
  </React.StrictMode>
);


reportWebVitals();
