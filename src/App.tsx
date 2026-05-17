import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PlaceDetails from './Components/PlaceDetails/PlaceDetails/PlaceDetails';

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Route that captures the city name from the URL */}
      <Route path="/:cityName" element={<PlaceDetails />} />
      {/* Default route for the homepage */}
      <Route path="/" element={<PlaceDetails />} />
    </Routes>
  </BrowserRouter>
);

export default App;