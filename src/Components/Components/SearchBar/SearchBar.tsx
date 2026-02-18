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
  updateCities: (cities: string[]) => void;
}

const cities: CityData[] = citiesData as CityData[];

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, updateCities }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keyboard navigation state
  const [activeIndex, setActiveIndex] = useState(-1);

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
        const cities = Array.isArray(response.data) ? response.data : [];
        setRecentCities(cities);
        setFilteredCities(removeDuplicates(cities.slice(0, 8)));
        updateCities(cities.slice(0, 8));
      } catch (err) {
        console.error('Error fetching recent cities:', err);
        setRecentCities([]);
        setFilteredCities([]);
        updateCities([]);
      }
    };
    fetchRecentCities();
  }, [userId, updateCities]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setPlaceName(input);
    setError(null);
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
      } else {
        // Normal form submission handled by onSubmit
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;

    try {
      const response = await axios.get(globals.api.places, {
        params: { city: placeName, userId },
      });
      onSearch(placeName);

      try {
        await axios.post(globals.api.cacheCities, null, {
          params: { userId, city: placeName },
        });
        const citiesResponse = await axios.get(globals.api.cacheCities, {
          params: { userId },
        });
        const updatedCities = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];
        setRecentCities(updatedCities);
        setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8));
      } catch (cacheError) {
        console.warn('Warning: Failed to save city to cache:', cacheError);
      }
    } catch (searchError: any) {
      setError(`Unable to fetch details for ${placeName}. Showing limited information.`);
      console.error('Search error:', searchError);
      onSearch(placeName);
      try {
        await axios.post(globals.api.cacheCities, null, {
          params: { userId, city: placeName },
        });
        const citiesResponse = await axios.get(globals.api.cacheCities, {
          params: { userId },
        });
        const updatedCities = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];
        setRecentCities(updatedCities);
        setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8));
      } catch (cacheError) {
        console.warn('Warning: Failed to save city to cache:', cacheError);
      }
    }
  };

  const handleCityClick = async (city: string) => {
    setPlaceName(city);
    try {
      await axios.get(globals.api.places, {
        params: { city, userId },
      });
      onSearch(city);

      try {
        await axios.post(globals.api.cacheCities, null, {
          params: { userId, city },
        });
        const citiesResponse = await axios.get(globals.api.cacheCities, {
          params: { userId },
        });
        const updatedCities = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];
        setRecentCities(updatedCities);
        setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8));
      } catch (cacheError) {
        console.warn('Warning: Failed to update city cache:', cacheError);
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError(`Unable to fetch details for ${city}. Showing limited information.`);
      onSearch(city);
      try {
        await axios.post(globals.api.cacheCities, null, {
          params: { userId, city },
        });
        const citiesResponse = await axios.get(globals.api.cacheCities, {
          params: { userId },
        });
        const updatedCities = Array.isArray(citiesResponse.data) ? citiesResponse.data : [];
        setRecentCities(updatedCities);
        setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
        setShowSuggestions(false);
        updateCities(updatedCities.slice(0, 8));
      } catch (cacheError) {
        console.warn('Warning: Failed to update city cache:', cacheError);
      }
    }
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
      setFilteredCities(removeDuplicates(updatedCities.slice(0, 8)));
      updateCities(updatedCities.slice(0, 8));
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
          onKeyDown={handleKeyDown} // Trigger navigation
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter a city name"
          className="search-input"
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {showSuggestions && filteredCities.length > 0 && (
        <div className="recent-cities">
          <ul>
            {filteredCities.map((city, index) => (
              <li 
                key={`${city}-${index}`} 
                onClick={() => handleCityClick(city)}
                className={index === activeIndex ? 'active' : ''} // Apply active class
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