import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (city: string) => void;
  updateCities: (cities: string[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, updateCities }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [showRecentCities, setShowRecentCities] = useState(false);

  const fetchRecentCities = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      const cities = Array.isArray(response.data)
        ? Array.from(new Set(response.data)).slice(0, 8)
        : [];
      setRecentCities(cities);
      updateCities(cities);
    } catch (err) {
      console.error('Error fetching recent cities:', err);
      setRecentCities([]);
      updateCities([]);
    }
  }, [updateCities]);

  useEffect(() => {
    fetchRecentCities();
  }, [fetchRecentCities]);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (placeName.trim()) {
        onSearch(placeName);
        setRecentCities((prevCities) =>
          Array.from(new Set([placeName, ...prevCities])).slice(0, 8)
        );
        setShowRecentCities(false);
        updateCities([placeName, ...recentCities.filter((c) => c !== placeName)].slice(0, 8));
        try {
          await axios.post('http://localhost:8080/cache/cities', { city: placeName });
        } catch (err) {
          console.error('Error saving city to cache:', err);
        }
      }
    },
    [placeName, recentCities, onSearch, updateCities]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      setPlaceName(city);
      onSearch(city);
      setRecentCities((prevCities) =>
        Array.from(new Set([city, ...prevCities.filter((c) => c !== city)])).slice(0, 8)
      );
      setShowRecentCities(false);
      updateCities([city, ...recentCities.filter((c) => c !== city)].slice(0, 8));
    },
    [onSearch, recentCities, updateCities]
  );

  const handleRemoveCity = useCallback(
    async (city: string) => {
      const newList = recentCities.filter((item) => item !== city);
      setRecentCities(newList);
      updateCities(newList);
      try {
        await axios.delete('http://localhost:8080/cache/cities', { params: { city } });
        fetchRecentCities();
      } catch (err) {
        console.error('Error removing city:', err);
        fetchRecentCities();
      }
    },
    [recentCities, updateCities, fetchRecentCities]
  );

  const handleClearHistory = useCallback(async () => {
    try {
      await axios.delete('http://localhost:8080/cache/cities/clear');
      setRecentCities([]);
      updateCities([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  }, [updateCities]);

  return (
    <div className="search-section">
      <h1>Search for a Place</h1>
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          onFocus={() => setShowRecentCities(true)}
          onBlur={() => setTimeout(() => setShowRecentCities(false), 200)}
          placeholder="Enter a city name"
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      {showRecentCities && recentCities.length > 0 && (
        <div className="recent-cities">
          <ul>
            {recentCities.map((city) => (
              <li key={city} onClick={() => handleCityClick(city)}>
                <span>{city}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
  );
};

export default SearchBar;