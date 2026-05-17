import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';
import globals from '../../../utils/globals';
import citiesData from './cleaned-cities.json';
import { v4 as uuidv4 } from 'uuid';

interface CityData {
  name: string;
}

interface SearchBarProps {
  onSearch: (city: string) => void;
}

const cities: CityData[] = citiesData as CityData[];

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const popularCities = ['London', 'Paris', 'New York', 'Cape Town', 'Rome'];

  const [userId] = useState<string>(() => {
    let savedUserId = localStorage.getItem('userId');
    if (!savedUserId) {
      savedUserId = uuidv4();
      localStorage.setItem('userId', savedUserId);
    }
    return savedUserId;
  });

  const removeDuplicates = (arr: string[]): string[] => {
    return arr.filter((item, index) => arr.indexOf(item) === index);
  };

  useEffect(() => {
    const fetchRecentCities = async () => {
      try {
        const response = await axios.get(globals.api.cacheCities, {
          params: { userId },
        });
        const fetchedCities = Array.isArray(response.data) ? response.data : [];
        setRecentCities(fetchedCities);
        setFilteredCities(removeDuplicates(fetchedCities.slice(0, 8)));
      } catch (err) {
        console.error('Error fetching recent cities:', err);
      }
    };
    fetchRecentCities();
  }, [userId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setPlaceName(input);
    setActiveIndex(-1); // Reset keyboard index on type
    
    if (input.trim()) {
      const filtered = cities
        .filter((city: CityData) => city.name.toLowerCase().startsWith(input.toLowerCase()))
        .map((city: CityData) => city.name);
      setFilteredCities(removeDuplicates(filtered.slice(0, 8)));
    } else {
      setFilteredCities(removeDuplicates(recentCities.slice(0, 8)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredCities.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && filteredCities[activeIndex]) {
        e.preventDefault();
        handleCityClick(filteredCities[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    setShowSuggestions(false);
    onSearch(placeName);
  };

  const handleCityClick = (city: string) => {
    setPlaceName(city);
    setShowSuggestions(false);
    onSearch(city);
  };

  const handleRemoveCity = async (city: string) => {
    try {
      await axios.delete(globals.api.cacheCities, {
        params: { userId, city },
      });
      const citiesResponse = await axios.get(globals.api.cacheCities, {
        params: { userId },
      });
      const updatedCities = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];
      setRecentCities(updatedCities);
      
      // Update suggestions if the search bar is empty
      if (!placeName.trim()) {
        setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
      }
    } catch (err) {
      console.error('Error removing city:', err);
    }
  };

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
          onKeyDown={handleKeyDown} 
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter a city name"
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {/* Popular Cities Buttons */}
      <div className="popular-cities-container">
        {popularCities.map((city) => (
          <button
            key={city}
            type="button"
            className="popular-city-btn"
            onClick={() => handleCityClick(city)}
          >
            Explore {city}
          </button>
        ))}
      </div>

      {showSuggestions && filteredCities.length > 0 && (
        <div className="recent-cities">
          <ul>
            {filteredCities.map((city, index) => (
              <li 
                key={`${city}-${index}`} 
                onClick={() => handleCityClick(city)}
                className={index === activeIndex ? 'active' : ''} 
              >
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