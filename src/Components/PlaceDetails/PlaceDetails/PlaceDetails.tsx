import React, { useState } from 'react';
import SearchBar from '../../Components/SearchBar/SearchBar';
import MapComponent from '../../Components/MapComponent/MapComponent';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import './PlaceDetails.css';
import axios from 'axios';

const PlaceDetails: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);

  const handleSearch = async (city: string) => {
    setLoading(true);
    setError('');
    setPlaces([]);
    try {
      const response = await axios.get('http://localhost:8080/api/places/search', {
        params: { city },
      });
      if (response.data) {
        setPlaces([response.data]);
      } else {
        setError('No results found for the city. Please try another.');
      }
    } catch (err) {
      setError('Unable to fetch place details. Please check your connection or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="place-details-container">
      <SearchBar 
        onSearch={handleSearch} 
        updateCities={setRecentCities} // Pass the state setter as prop
      />
      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      <div className="places-list">
        {places.map((place) => (
          <div key={place.id} className="place-details">
            <div className="place-image" style={{ backgroundImage: `url(${place.icon || 'default_image_url'})` }}>
              <div className="place-address">{place.address}</div>
            </div>
            <div className="place-map">
              <MapComponent lat={place.latitude!} lng={place.longitude!} />
              <WeatherComponent city={place.name || place.address} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaceDetails;