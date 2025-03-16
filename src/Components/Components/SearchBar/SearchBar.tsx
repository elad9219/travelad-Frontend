import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (city: string) => void;
  updateCities: (cities: string[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, updateCities }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]); // Full list for autocomplete
  const [filteredCities, setFilteredCities] = useState<string[]>([]); // Filtered suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchRecentCities = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      const allCities = Array.isArray(response.data)
        ? Array.from(new Set(response.data)) // Remove duplicates, keep all cities
        : [];
      setRecentCities(allCities); // Store full list for autocomplete
      setFilteredCities(allCities.slice(0, 8)); // Show only last 8 by default
      updateCities(allCities.slice(0, 8)); // Pass last 8 to parent
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
      setFilteredCities(filtered); // Filter from full list
    } else {
      setFilteredCities(recentCities.slice(0, 8)); // Show last 8 when input is empty
    }
  };

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (placeName.trim()) {
        onSearch(placeName);
        const updatedCities = Array.from(new Set([placeName, ...recentCities.filter(c => c !== placeName)]));
        setRecentCities(updatedCities); // Update full list
        setFilteredCities(updatedCities.slice(0, 8)); // Show last 8
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8)); // Pass last 8 to parent
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
      const updatedCities = Array.from(new Set([city, ...recentCities.filter(c => c !== city)]));
      setRecentCities(updatedCities); // Update full list
      setFilteredCities(updatedCities.slice(0, 8)); // Show last 8
      setShowSuggestions(false);
      updateCities(updatedCities.slice(0, 8)); // Pass last 8 to parent
    },
    [onSearch, recentCities, updateCities]
  );

  const handleRemoveCity = useCallback(
    async (city: string) => {
      const newList = recentCities.filter((item) => item !== city);
      setRecentCities(newList); // Update full list
      setFilteredCities(newList.slice(0, 8)); // Show last 8
      updateCities(newList.slice(0, 8)); // Pass last 8 to parent
      try {
        await axios.delete('http://localhost:8080/cache/cities', { params: { city } });
        fetchRecentCities(); // Refresh full list from Redis
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
        src="https://i.postimg.cc/15rbQdXx/travelad-logo.png"
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