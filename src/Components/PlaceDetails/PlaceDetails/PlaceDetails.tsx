import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PlaceDetails.css';
import MapComponent from '../../Components/MapComponent/MapComponent';
import { City } from '../../../modal/City';

const PlaceDetails: React.FC = () => {
  const [placeName, setPlaceName] = useState(''); // For user input
  const [places, setPlaces] = useState<City[]>([]); // For API results
  const [loading, setLoading] = useState(false); // For loading state
  const [error, setError] = useState(''); // For error messages

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8080/api/places/search', {
        params: { city: placeName },
      });
  
      if (response.data) {
        const place = response.data; // Assuming API now returns a single place
        setPlaces([place]); // Wrap in an array for consistent UI rendering
        console.log('Place:', place);
      } else {
        setError('No place found for this city.');
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError('Failed to fetch place details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateFontSize = (text: string): number => {
    const baseSize = 24; // Default size
    const maxLength = 50; // Adjust this based on expected length
    return text.length > maxLength ? baseSize - (text.length - maxLength) / 2 : baseSize;
  };
  
  return (
    <div className="place-details-container">
      <h1>Search for a Place</h1>
      <input
        type="text"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        placeholder="Enter a city name"
        className="search-input"
      />
      <button onClick={handleSearch} className="search-button">
        Search
      </button>

      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="places-list">
        {places.map((place, index) => (
          <div key={place.id} className="place-card">
            <h3
              className="place-address"
              style={{
                backgroundImage: place.icon 
                  ? `url('${place.icon}')`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                aspectRatio: '16 / 9', // Force wide aspect ratio
                fontSize: `${calculateFontSize(place.address || '')}px`, // Dynamic font size
                padding: '20px',
                borderRadius: '10px',
                textShadow: '1px 1px 5px black', 
                color: 'white',
              }}
            >
              {place.address}
            </h3>

            {index === 0 && (
              <MapComponent lat={place.latitude!} lng={place.longitude!} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaceDetails;
