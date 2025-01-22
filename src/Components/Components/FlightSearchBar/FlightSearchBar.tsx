import React, { useState } from 'react';
import axios from 'axios';

interface FlightSearchProps {
  onFlightSearch: (destinationIata: string) => void;
}

const FlightSearchBar: React.FC<FlightSearchProps> = ({ onFlightSearch }) => {
  const [destination, setDestination] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.get(`/search?destination=${encodeURIComponent(destination)}`);
      onFlightSearch(response.data.iataCode);
      setError(null);
    } catch (err) {
      setError('Destination not found or error in fetching data');
      console.error('Error fetching flight data:', err);
    }
  };

  return (
    <form onSubmit={handleSearch}>
      <input 
        type="text" 
        value={destination} 
        onChange={(e) => setDestination(e.target.value)} 
        placeholder="Destination City" 
      />
      <button type="submit">Search Flights</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};

export default FlightSearchBar;