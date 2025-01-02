import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (city: string) => void;
  updateCities: (cities: string[]) => void; // New prop to update cities in parent
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, updateCities }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [showRecentCities, setShowRecentCities] = useState(false);

  const fetchRecentCities = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      const cities = Array.isArray(response.data) ? Array.from(new Set(response.data)).slice(0, 8) : [];
      setRecentCities(cities);
      updateCities(cities); // Update cities in parent
    } catch (err) {
      console.error('Error fetching recent cities:', err);
      setRecentCities([]);
      updateCities([]); // Update parent with empty array if there's an error
    }
  }, [updateCities]);

  useEffect(() => {
    fetchRecentCities();
  }, [fetchRecentCities]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (placeName.trim()) {
      onSearch(placeName);
      setRecentCities(prevCities => Array.from(new Set([placeName, ...prevCities])).slice(0, 8));
      setShowRecentCities(false);
      updateCities([placeName, ...recentCities.filter(c => c !== placeName)].slice(0, 8)); // Update parent

      try {
        await axios.post('http://localhost:8080/cache/cities', { city: placeName });
      } catch (err) {
        console.error('Failed to update server with new city:', err);
      }
    }
  }, [onSearch, placeName, recentCities, updateCities]);

  const handleCityClick = useCallback((city: string) => {
    setPlaceName(city);
    onSearch(city);
    setShowRecentCities(false);
  }, [onSearch]);

  const handleRemoveCity = useCallback(async (city: string) => {
    try {
      const newList = recentCities.filter(item => item !== city);
      setRecentCities(newList);
      updateCities(newList); // Update parent with new list

      await axios.delete('http://localhost:8080/cache/cities', { params: { city } });
      // After successful removal, refetch to ensure we have the latest state
      await fetchRecentCities();
    } catch (err) {
      console.error('Error removing city:', err);
      // If removal fails, revert the change
      fetchRecentCities(); // Refetch to revert or update based on server's state
    }
  }, [recentCities, fetchRecentCities, updateCities]);

  const handleClearHistory = useCallback(async () => {
    try {
      await axios.delete('http://localhost:8080/cache/cities/clear');
      setRecentCities([]);
      updateCities([]); // Update parent with empty array
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