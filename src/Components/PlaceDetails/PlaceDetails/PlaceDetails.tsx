import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchBar from '../../Components/SearchBar/SearchBar';
import MapComponent from '../../Components/MapComponent/MapComponent';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import HotelComponent from '../../Components/HotelComponent/HotelComponent';
import AttractionComponent from '../../Components/AttractionComponent/AttractionComponent';
import FlightsComponent from '../../Components/FlightComponent/FlightComponent';
import Loader from '../../Components/Loader/Loader';
import axios from 'axios';
import './PlaceDetails.css';
import globals from '../../../utils/globals';
import { City } from '../../../modal/City';
import { v4 as uuidv4 } from 'uuid';

const PlaceDetails: React.FC = () => {
  const { cityName } = useParams<{ cityName: string }>();
  const navigate = useNavigate();

  const [places, setPlaces] = useState<City[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [mapQuery, setMapQuery] = useState<string>('');
  const [cache, setCache] = useState<Map<string, City>>(new Map());

  // Loading and Waking up states
  const [isWakingUp, setIsWakingUp] = useState(false);
  const wakeUpTimer = useRef<NodeJS.Timeout | null>(null);

  const [userId] = useState<string>(() => {
    let savedUserId = localStorage.getItem('userId');
    if (!savedUserId) {
      savedUserId = uuidv4();
      localStorage.setItem('userId', savedUserId);
    }
    return savedUserId;
  });

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
    };
  }, []);

  // Trigger search when the URL changes
  useEffect(() => {
    if (cityName) {
      const decodedCity = decodeURIComponent(cityName);
      performSearch(decodedCity);
    } else {
      // If user navigates to root "/", reset the view
      setSearchPerformed(false);
      setPlaces([]);
    }
  }, [cityName]);

  // Helper function to fetch data with automatic retries for Cold Starts
  const fetchWithRetry = async (url: string, params: any, retries = 4, delay = 6000): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios.get(url, { params });
      } catch (err: any) {
        console.warn(`Attempt ${i + 1} failed. Retrying...`);
        // If it's the last attempt, throw the error
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    // Fallback to satisfy TypeScript compiler that a value is always returned or thrown
    throw new Error('Unreachable state');
  };

  const performSearch = async (city: string) => {
    setSearchPerformed(true);
    setPlacesLoading(true);
    setPlacesError('');
    setIsWakingUp(false);
    setPlaces([]);

    // Check frontend cache first
    if (cache.has(city.toLowerCase())) {
      const cachedPlace = cache.get(city.toLowerCase())!;
      setPlaces([cachedPlace]);
      setMapQuery(city);
      setPlacesLoading(false);
      return;
    }

    // If search takes longer than 3 seconds, show the "waking up" message
    wakeUpTimer.current = setTimeout(() => {
        setIsWakingUp(true);
    }, 3000);

    try {
      const response = await fetchWithRetry(globals.api.places, { city, userId });

      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
      setIsWakingUp(false);

      const place: City = {
        ...response.data,
        icon: response.data.icon && response.data.icon !== ''
          ? response.data.icon
          : 'https://via.placeholder.com/150',
        address: response.data.address || response.data.name || city,
      };
      
      setPlaces([place]);
      setMapQuery(city);
      setCache(new Map(cache.set(city.toLowerCase(), place)));

      // Silent call to update the backend cache for the user's history
      axios.post(globals.api.cacheCities, null, { params: { userId, city } }).catch(() => {});

    } catch (err: any) {
      console.error('Error fetching place details:', err);
      if (wakeUpTimer.current) clearTimeout(wakeUpTimer.current);
      setIsWakingUp(false);

      setPlacesError(`Unable to fetch details for ${city}. Server might be unreachable.`);
      
      // Fallback place setup
      const fallbackPlace: City = {
        name: city,
        address: city,
        icon: 'https://via.placeholder.com/150',
        latitude: 0.0,
        longitude: 0.0,
        placeId: 'unknown_' + city,
        country: '',
      };
      setPlaces([fallbackPlace]);
      setMapQuery(city);
      setCache(new Map(cache.set(city.toLowerCase(), fallbackPlace)));
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleSearchSubmit = (city: string) => {
    // Navigate to the new URL. The useEffect will detect this and trigger performSearch.
    navigate(`/${encodeURIComponent(city)}`);
  };

  const handleShowAttractionOnMap = (query: string) => {
    setMapQuery(query);
  };

  const handleShowHotelOnMap = (query: string) => {
    setMapQuery(query);
  };

  return (
    <div className="place-details-container">
      <SearchBar onSearch={handleSearchSubmit} />

      {/* Loading & Waking up message now handled by PlaceDetails */}
      {placesLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <Loader />
          {isWakingUp && (
            <div className="waking-up-message" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px 20px', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
              ⏳ Initializing free server tier. The backend needs about <b>10 seconds</b> to wake up for the <b>first search</b>. 
              After that, everything will be <b>instant</b>!
            </div>
          )}
        </div>
      )}

      {searchPerformed && placesError && (
        <p className="error-message" style={{marginTop: '20px', fontSize: '1.1rem'}}>{placesError}</p>
      )}

      {searchPerformed && !placesLoading && places.length > 0 && places[0].placeId !== 'unknown_' + places[0].name && (
        <div className="main-grid">
            {/* 1. Image Component */}
            <div className="grid-item place-image-container">
                <div
                className="place-image"
                style={{
                    backgroundImage: `url(${places[0]?.icon || 'https://via.placeholder.com/150'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
                >
                    <div className="place-address">{places[0]?.address || places[0]?.name || 'Unknown address'}</div>
                </div>
            </div>

            {/* 2. Map Component */}
            <div className="grid-item place-map-container">
                <MapComponent query={mapQuery} />
            </div>

            {/* 3. Weather Component */}
            <div className="grid-item weather-component-container">
                <WeatherComponent city={places[0]?.name || places[0]?.address || ''} />
            </div>

            {/* 4. Flights Component */}
            <div className="grid-item flights-component-container">
                <FlightsComponent city={places[0]?.name || ''} />
            </div>

            {/* 5. Hotels Component */}
            <div className="grid-item hotels-component-container">
                <HotelComponent
                    cityName={places[0]?.name || ''}
                    countryName={places[0]?.country || ''}
                    onShowHotelOnMap={handleShowHotelOnMap}
                />
            </div>

             {/* 6. Attractions Component */}
            <div className="grid-item attractions-component-container">
                 <AttractionComponent
                    city={places[0]?.name || ''}
                    onShowAttractionOnMap={handleShowAttractionOnMap}
                />
            </div>
        </div>
      )}

      {searchPerformed && !placesLoading && places.length > 0 && places[0].placeId === 'unknown_' + places[0].name && (
        <p className="no-data-message" style={{marginTop: '20px'}}>No data available for {places[0].name}. Please try another city.</p>
      )}
    </div>
  );
};

export default PlaceDetails;