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
    if (input.trim()) {
      const filtered = cities
        .filter((city: CityData) => city.name.toLowerCase().startsWith(input.toLowerCase()))
        .map((city: CityData) => city.name);
      setFilteredCities(removeDuplicates(filtered.slice(0, 8)));
    } else {
      setFilteredCities(removeDuplicates(recentCities.slice(0, 8)));
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

      // Save to cache even if API call fails
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
      onSearch(placeName); // Proceed with search to show fallback data
      // Save to cache despite error
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
      const placeResponse = await axios.get(globals.api.places, {
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
      onSearch(city); // Proceed with search to show fallback data
      // Save to cache despite error
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
              <li key={`${city}-${index}`} onClick={() => handleCityClick(city)}>
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