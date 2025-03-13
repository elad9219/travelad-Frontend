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
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchRecentCities = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      const cities = Array.isArray(response.data)
        ? Array.from(new Set(response.data)).slice(0, 8)
        : [];
      setRecentCities(cities);
      setFilteredCities(cities);
      updateCities(cities);
    } catch (err) {
      console.error('Error fetching recent cities:', err);
      setRecentCities([]);
      setFilteredCities([]);
      updateCities([]);
    }
  }, [updateCities]);

  useEffect(() => {
    fetchRecentCities();
  }, [fetchRecentCities]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setPlaceName(input);
    if (input.trim()) {
      const filtered = recentCities.filter(city =>
        city.toLowerCase().startsWith(input.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(recentCities);
    }
  };

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (placeName.trim()) {
        onSearch(placeName);
        const updatedCities = Array.from(new Set([placeName, ...recentCities])).slice(0, 8);
        setRecentCities(updatedCities);
        setFilteredCities(updatedCities);
        setShowSuggestions(false);
        updateCities(updatedCities);
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
      const updatedCities = Array.from(new Set([city, ...recentCities.filter((c) => c !== city)])).slice(0, 8);
      setRecentCities(updatedCities);
      setFilteredCities(updatedCities);
      setShowSuggestions(false);
      updateCities(updatedCities);
    },
    [onSearch, recentCities, updateCities]
  );

  const handleRemoveCity = useCallback(
    async (city: string) => {
      const newList = recentCities.filter((item) => item !== city);
      setRecentCities(newList);
      setFilteredCities(newList);
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
      setFilteredCities([]);
      updateCities([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  }, [updateCities]);

  return (
    <div className="search-section">
      <img
        src="https://i.postimg.cc/15rbQdXx/travelad-logo.png" // Your updated logo URL
        alt="Travelad Logo"
        className="logo"
      />
      <h1>Search for a Place</h1>
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          value={placeName}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter a city name"
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      {showSuggestions && filteredCities.length > 0 && (
        <div className="recent-cities">
          <ul>
            {filteredCities.map((city) => (
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