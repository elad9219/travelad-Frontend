import React, { useState } from 'react';
import SearchBar from '../../Components/SearchBar/SearchBar';
import MapComponent from '../../Components/MapComponent/MapComponent';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import HotelComponent from '../../Components/HotelComponent/HotelComponent';
import FlightsComponent from '../../Components/FlightComponent/FlightComponent';
import AttractionComponent from '../../Components/AttractionComponent/AttractionComponent';
import Loader from '../../Components/Loader/Loader';
import axios from 'axios';
import './PlaceDetails.css';

const PlaceDetails: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [mapQuery, setMapQuery] = useState<string>('');

  const handleSearch = async (city: string) => {
    setSearchPerformed(true);
    setPlacesLoading(true);
    setPlacesError('');
    setPlaces([]);

    try {
      const response = await axios.get('http://localhost:8080/api/places/search', {
        params: { city },
      });

      if (response.data) {
        setPlaces([response.data]); // Store the data even if it comes from APIs
        setMapQuery(city);
      } else {
        setPlacesError('No data found for this city.');
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      setPlacesError('Unable to fetch place details. Please try again later.');
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
      {placesError && <p className="error-message">{placesError}</p>}

      {!placesLoading && places.length > 0 && (
        <div className="content-grid">
          <div className="left-column">
            <div
              className="place-image"
              style={{ backgroundImage: `url(${places[0].icon || 'default_image_url'})` }}
            >
              <div className="place-address">{places[0].address}</div>
            </div>
            <WeatherComponent city={places[0].name || places[0].address} />
            <HotelComponent
              cityName={places[0].name || ''}
              countryName={places[0].country || ''}
              onShowHotelOnMap={handleShowHotelOnMap}
            />
          </div>
          <div className="right-column">
            <div className="place-map">
              <MapComponent query={mapQuery} />
            </div>
            <FlightsComponent city={places[0].name || ''} />
            <AttractionComponent
              city={places[0].name || ''}
              onShowAttractionOnMap={handleShowAttractionOnMap}
            />
          </div>
        </div>
      )}

      {!placesLoading && places.length === 0 && searchPerformed && !placesError && (
        <p className="no-data-message">No data available for this city.</p>
      )}
    </div>
  );
};

export default PlaceDetails;