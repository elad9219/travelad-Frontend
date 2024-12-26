import React, { useState } from 'react';
import axios from 'axios';
import './PlaceDetails.css';
import MapComponent from '../../Components/MapComponent/MapComponent';

const PlaceDetails: React.FC = () => {
  const [placeName, setPlaceName] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [showRecentCities, setShowRecentCities] = useState(false);

  // Fetch recent cities
  const fetchRecentCities = async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      if (Array.isArray(response.data)) {
        setRecentCities(Array.from(new Set(response.data)).slice(0, 8)); // Remove duplicates and limit to 8
      } else {
        setRecentCities([]);
      }
    } catch (err) {
      console.error('Error fetching recent cities:', err);
    }
  };

  const handleSearchBarFocus = async () => {
    await fetchRecentCities();
    setShowRecentCities(true);
  };

  const handleSearchBarBlur = () => {
    setTimeout(() => setShowRecentCities(false), 200); // Delay hiding to allow clicks
  };

  const handleSearch = async (e: React.FormEvent | null, city?: string) => {
    if (e) e.preventDefault(); // Prevent default form submission
    const searchCity = city || placeName; // Use the provided city or current input value
    if (!searchCity) return;

    setLoading(true);
    setError('');
    setShowRecentCities(false); // Hide the recent cities list when searching
    try {
      const response = await axios.get('http://localhost:8080/api/places/search', {
        params: { city: searchCity },
      });

      if (response.data) {
        const place = response.data;
        setPlaces([place]);
        setRecentCities((prevCities) =>
          Array.from(new Set([searchCity, ...prevCities])).slice(0, 8)
        );
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

  const handleCityClick = (city: string) => {
    setPlaceName(city); // Update the search bar with the selected city
    setShowRecentCities(false); // Hide suggestions
    handleSearch(null, city); // Trigger the search with the selected city
  };

  const handleRemoveCity = async (city: string) => {
    try {
      await axios.delete('http://localhost:8080/cache/cities', {
        params: { city },
      });
      setRecentCities((prevCities) => prevCities.filter((item) => item !== city));
    } catch (err) {
      console.error('Error removing city:', err);
    }
  };

  const handleClearHistory = async () => {
    try {
      await axios.delete('http://localhost:8080/cache/cities/clear');
      setRecentCities([]);
    } catch (err) {
      console.error('Error clearing city history:', err);
    }
  };

  const handlePlaceClick = (place: any) => {
    setPlaceName(place.name || place.address); // Assuming place has name or address to search
    handleSearch(new Event('submit') as unknown as React.FormEvent); // Cast to match handleSearch signature
  };

  return (
    <div className="place-details-container">
      <div className="search-section">
        <h1>Search for a Place</h1>
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            onFocus={handleSearchBarFocus}
            onBlur={handleSearchBarBlur}
            placeholder="Enter a city name"
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>
        {showRecentCities && recentCities.length > 0 && (
          <div className="recent-cities expanded">
            <ul>
              {recentCities.map((city, index) => (
                <li key={index} onClick={() => handleCityClick(city)} style={{ cursor: 'pointer' }}>
                  <span>{city}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the click from bubbling up to the <li> when removing
                      handleRemoveCity(city);
                    }}
                    className="remove-btn"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={handleClearHistory} className="clear-history-btn">
              Clear History
            </button>
          </div>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="places-list">
        {places.map((place) => (
          <div
            key={place.id}
            className="place-details"
            onClick={() => handlePlaceClick(place)}
          >
            <div
              className="place-image"
              style={{
                backgroundImage: `url('${place.icon}')`,
              }}
            >
              <div className="place-address">{place.address}</div>
            </div>
            <div className="place-map">
              <MapComponent lat={place.latitude!} lng={place.longitude!} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaceDetails;
