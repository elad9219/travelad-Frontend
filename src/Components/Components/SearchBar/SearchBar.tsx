import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';
import globals from '../../../utils/globals';

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
      const response = await axios.get(`${globals.api.cacheCities}/autocomplete`);
      const allCities = Array.isArray(response.data)
        ? Array.from(new Set(response.data))
        : [];
      setRecentCities(allCities);
      setFilteredCities(allCities.slice(0, 8));
      updateCities(allCities.slice(0, 8));
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
      setFilteredCities(recentCities.slice(0, 8));
    }
  };

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (placeName.trim()) {
        onSearch(placeName);
        const updatedCities = Array.from(new Set([placeName, ...recentCities.filter(c => c !== placeName)]));
        setRecentCities(updatedCities);
        setFilteredCities(updatedCities.slice(0, 8));
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8));
        try {
          await axios.post(`${globals.api.cacheCities}`, { city: placeName });
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
      setRecentCities(updatedCities);
      setFilteredCities(updatedCities.slice(0, 8));
      setShowSuggestions(false);
      updateCities(updatedCities.slice(0, 8));
    },
    [onSearch, recentCities, updateCities]
  );

  const handleRemoveCity = useCallback(
    async (city: string) => {
      const newList = recentCities.filter((item) => item !== city);
      setRecentCities(newList);
      setFilteredCities(newList.slice(0, 8));
      updateCities(newList.slice(0, 8));
      try {
        await axios.delete(`${globals.api.cacheCities}`, { params: { city } });
        fetchRecentCities();
      } catch (err) {
        console.error('Error removing city:', err);
        fetchRecentCities();
      }
    },
    [recentCities, updateCities, fetchRecentCities]
  );


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
        </div>
      )}
    </div>
  );
};

export default SearchBar;
