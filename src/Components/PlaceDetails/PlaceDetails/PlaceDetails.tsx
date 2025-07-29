import React, { useState, useEffect } from 'react';
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

const PlaceDetails: React.FC = () => {
  const [places, setPlaces] = useState<City[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [mapQuery, setMapQuery] = useState<string>('');
  const [cache, setCache] = useState<Map<string, City>>(new Map()); // Local cache

  const handleSearch = async (city: string) => {
    setSearchPerformed(true);
    setPlacesLoading(true);
    setPlacesError('');
    setPlaces([]);

    // Check local cache
    if (cache.has(city.toLowerCase())) {
      const cachedPlace = cache.get(city.toLowerCase())!;
      setPlaces([cachedPlace]);
      setMapQuery(city);
      setPlacesLoading(false);
      return;
    }

    try {
      const response = await axios.get(globals.api.places, {
        params: { city },
      });

      const place: City = {
        ...response.data,
        icon: response.data.icon && response.data.icon !== ''
          ? response.data.icon
          : 'https://via.placeholder.com/150',
        address: response.data.address || response.data.name || city, // Ensure address is not empty
      };
      setPlaces([place]);
      setMapQuery(city);
      setCache(new Map(cache.set(city.toLowerCase(), place))); // Save to cache
    } catch (err: any) {
      console.error('Error fetching place details:', err);
      setPlacesError('Unable to fetch place details. Showing limited information.');
      const fallbackPlace: City = {
        name: city,
        address: city, // Use city name as fallback address
        icon: 'https://via.placeholder.com/150',
        latitude: 0.0,
        longitude: 0.0,
        placeId: 'unknown_' + city,
        country: '',
      };
      setPlaces([fallbackPlace]);
      setMapQuery(city);
      setCache(new Map(cache.set(city.toLowerCase(), fallbackPlace))); // Save to cache
    } finally {
      setPlacesLoading(false);
    }
  };

  const handleShowAttractionOnMap = (query: string) => {
    setMapQuery(query);
  };

  const handleShowHotelOnMap = (query: string) => {
    setMapQuery(query);
  };

  return (
    <div className="place-details-container">
      <SearchBar onSearch={handleSearch} updateCities={setRecentCities} />

      {placesLoading && <Loader />}
      {searchPerformed && placesError && (
        <p className="error-message">{placesError}</p>
      )}

      {searchPerformed && !placesLoading && places.length > 0 && places[0].placeId !== 'unknown_' + places[0].name && (
        <div className="content-grid">
          <div className="left-column">
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
            <WeatherComponent city={places[0]?.name || places[0]?.address || ''} />
            <HotelComponent
              cityName={places[0]?.name || ''}
              countryName={places[0]?.country || ''}
              onShowHotelOnMap={handleShowHotelOnMap}
            />
          </div>
          <div className="right-column">
            <div className="place-map">
              <MapComponent query={mapQuery} />
            </div>
            <FlightsComponent city={places[0]?.name || ''} />
            <AttractionComponent
              city={places[0]?.name || ''}
              onShowAttractionOnMap={handleShowAttractionOnMap}
            />
          </div>
        </div>
      )}

      {searchPerformed && !placesLoading && places.length > 0 && places[0].placeId === 'unknown_' + places[0].name && (
        <p className="no-data-message">No data available for {places[0].name}. Please try another city.</p>
      )}
    </div>
  );
};

export default PlaceDetails;