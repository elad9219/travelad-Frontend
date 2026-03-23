import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SearchBar.css';
import globals from '../../../utils/globals';
import citiesData from './cleaned-cities.json';
import { v4 as uuidv4 } from 'uuid';
import Loader from '../Loader/Loader';

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
  
  // Loading and Waking up states
  const [isLoading, setIsLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  
  // Keyboard navigation state
  const [activeIndex, setActiveIndex] = useState(-1);

  // Timer reference for the "waking up" message
  const wakeUpTimer = useRef<NodeJS.Timeout | null>(null);

  // Popular cities array for the suggestion buttons
  const popularCities = ['London', 'Paris', 'New York', 'Tokyo', 'Rome'];

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setPlaceName(input);
    setError(null);
    setIsWakingUp(false);
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

  // Helper function to fetch data with automatic retries for Cold Starts
  const fetchWithRetry = async (url: string, params: any, retries = 4, delay = 6000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url, { params });
      } catch (err: any) {
        console.warn(`Attempt ${i + 1} failed. Retrying...`);
        // If it's the last attempt, throw the error to be handled below
        if (i === retries - 1) throw err;
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const executeSearch = async (cityToSearch: string) => {
    // Prevent multiple API calls if already loading
    if (isLoading) return;

    setError(null);
    setIsWakingUp(false);
    setIsLoading(true);

    // If search takes longer than 3 seconds, show the "waking up" message
    wakeUpTimer.current = setTimeout(() => {
        setIsWakingUp(true);
    }, 3000);

    try {
      // Using the new auto-retry fetcher to handle backend sleeping
      await fetchWithRetry(globals.api.places, { city: cityToSearch, userId });
      
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
      setIsWakingUp(false);
      setIsLoading(false);
      onSearch(cityToSearch);

      // Cache update logic (fire and forget)
      try {
        await axios.post(globals.api.cacheCities, null, {
          params: { userId, city: cityToSearch },
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
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
      setIsWakingUp(false);
      setIsLoading(false);
      
      setError(`Unable to fetch details for ${cityToSearch}. Server might be unreachable.`);
      console.error('Search error after retries:', searchError);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    executeSearch(placeName);
  };

  const handleCityClick = async (city: string) => {
    setPlaceName(city);
    executeSearch(city);
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
    <>
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

        {error && !isLoading && <p className="error-message" style={{marginTop: '15px'}}>{error}</p>}
        
        {showSuggestions && filteredCities.length > 0 && !isLoading && (
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

      {isLoading && (
        <div className="loading-container">
          <Loader /> 
          
          {isWakingUp && (
            <div className="waking-up-message">
              ⏳ Using a free server tier. The backend is waking up, this may take up to 40 seconds...
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SearchBar;