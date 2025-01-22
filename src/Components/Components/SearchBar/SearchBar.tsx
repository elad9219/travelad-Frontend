import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './SearchBar.css';
import IataFetcher from '../IataFetcher/IataFetcher';

interface SearchBarProps {
  onSearch: (city: string, iataCode: string | null) => void;
  updateCities: (cities: string[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, updateCities }) => {
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [showRecentCities, setShowRecentCities] = useState(false);
  const [iataCode, setIataCode] = useState<string | null>(null);

  const fetchRecentCities = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/cache/cities/autocomplete');
      const cities = Array.isArray(response.data) ? Array.from(new Set(response.data)).slice(0, 8) : [];
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

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (placeName.trim()) {
        // Here, before calling onSearch, fetch the IATA code or city code
        try {
            const response = await axios.get('http://localhost:8080/locations', {
                params: { keyword: placeName },
            });
            const fetchedIataCode = response.data && response.data.length > 0 ? response.data[0].iataCode : null;
            
            // Call onSearch with both city name and IATA code
            onSearch(placeName, fetchedIataCode);

            // Add to search history
            setRecentCities((prevCities) => 
                Array.from(new Set([placeName, ...prevCities])).slice(0, 8)
            );
            setShowRecentCities(false);
            updateCities([placeName, ...recentCities.filter((c) => c !== placeName)].slice(0, 8));

            // Save to backend cache
            try {
                await axios.post('http://localhost:8080/cache/cities', { city: placeName });
            } catch (err) {
                console.error('Error saving city to cache:', err);
            }

        } catch (err) {
            console.error('Error fetching IATA code for new search:', err);
            // Even if fetching IATA code fails, we still want to search and add to history
            onSearch(placeName, null);
            setRecentCities((prevCities) => 
                Array.from(new Set([placeName, ...prevCities])).slice(0, 8)
            );
            setShowRecentCities(false);
            updateCities([placeName, ...recentCities.filter((c) => c !== placeName)].slice(0, 8));

            // Still try to save to cache, even if IATA fetch failed
            try {
                await axios.post('http://localhost:8080/cache/cities', { city: placeName });
            } catch (cacheErr) {
                console.error('Error saving city to cache after IATA fetch failed:', cacheErr);
            }
        }
    }
}, [onSearch, placeName, recentCities, updateCities]);

  // Modify handleCityClick to fetch IATA code before calling onSearch
  const handleCityClick = useCallback(async (city: string) => {
    setPlaceName(city);
    try {
        const response = await axios.get('http://localhost:8080/locations', {
            params: { keyword: city },
        });
        const fetchedIataCode = response.data && response.data.length > 0 ? response.data[0].iataCode : null;
        onSearch(city, fetchedIataCode); // Pass both city name and fetched IATA code

        // Update recent cities, moving the clicked city to the top
        setRecentCities((prevCities) => 
            Array.from(new Set([city, ...prevCities.filter(c => c !== city)])).slice(0, 8)
        );
        setShowRecentCities(false);
        updateCities([city, ...recentCities.filter((c) => c !== city)].slice(0, 8));

        // Save to backend cache
        try {
            await axios.post('http://localhost:8080/cache/cities', { city: city });
        } catch (err) {
            console.error('Error saving city to cache:', err);
        }

    } catch (err) {
        console.error('Error fetching IATA code for city from history:', err);
        onSearch(city, null); // If fetching fails, search with just the city name
        // Still update the list, but keep the city at the top
        setRecentCities((prevCities) => 
            Array.from(new Set([city, ...prevCities.filter(c => c !== city)])).slice(0, 8)
        );
        setShowRecentCities(false);
        updateCities([city, ...recentCities.filter((c) => c !== city)].slice(0, 8));

        // Try to save to cache even if fetching failed
        try {
            await axios.post('http://localhost:8080/cache/cities', { city: city });
        } catch (cacheErr) {
            console.error('Error saving city to cache after IATA fetch failed:', cacheErr);
        }
    }
}, [onSearch, recentCities, updateCities]);

  const handleRemoveCity = useCallback(async (city: string) => {
    try {
      const newList = recentCities.filter((item) => item !== city);
      setRecentCities(newList);
      updateCities(newList);

      await axios.delete('http://localhost:8080/cache/cities', { params: { city } });
      await fetchRecentCities();
    } catch (err) {
      console.error('Error removing city:', err);
      fetchRecentCities();
    }
  }, [recentCities, fetchRecentCities, updateCities]);

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

      {placeName && (
        <IataFetcher
          cityName={placeName}
          onIataFetched={(code) => setIataCode(code)}
        />
      )}

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