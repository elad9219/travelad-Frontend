// src/Components/PlaceDetails/PlaceDetails/PlaceDetails.tsx
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
  // State to store the current map query (updated when a "show on map" button is clicked)
  const [mapQuery, setMapQuery] = useState<string>('');

  const handleSearch = async (city: string) => {
    setSearchPerformed(true);
    setPlacesLoading(true);
    setPlacesError('');
    setPlaces([]);
    try {
      const response = await axios.get('http://localhost:8080/api/places/search', { params: { city } });
      // Assume response.data returns an object with properties: id, name, address, icon, latitude, longitude, country, etc.
      setPlaces(response.data ? [response.data] : []);
      // Set the initial map query to the city name
      setMapQuery(city);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setPlacesError('An error occurred while fetching place details.');
    } finally {
      setPlacesLoading(false);
    }
  };

  // Callback passed to AttractionComponent so that when a user clicks "Show on Map" on an attraction, the map updates.
  const handleShowAttractionOnMap = (query: string) => {
    setMapQuery(query);
  };

  // Callback passed to HotelComponent so that when a user clicks "Show on Map" on a hotel, the map updates.
  const handleShowHotelOnMap = (query: string) => {
    setMapQuery(query);
  };

  return (
    <div className="place-details-container">
      <SearchBar onSearch={handleSearch} updateCities={setRecentCities} />
      <div className="places-list">
        {placesLoading && <Loader />}
        {placesError && <p className="error-message">{placesError}</p>}
        {!placesLoading &&
          places.map((place) => (
            <div key={place.id} className="place-details">
              <div
                className="place-image"
                style={{ backgroundImage: `url(${place.icon || 'default_image_url'})` }}
              >
                <div className="place-address">{place.address}</div>
              </div>
              <div className="place-map">
                <MapComponent query={mapQuery} />
                <WeatherComponent city={place.name || place.address} />
              </div>
            </div>
          ))}
      </div>
      {searchPerformed && places.length > 0 && (
        <>
          <FlightsComponent city={places[0]?.name || ''} />
          <div className="hotels">
            {/* Pass both cityName and countryName to HotelComponent */}
            <HotelComponent 
              cityName={places[0]?.name || ''} 
              countryName={places[0]?.country || ''}
              onShowHotelOnMap={handleShowHotelOnMap}
            />
          </div>
          <div className="attractions-section">
            <AttractionComponent
              city={places[0]?.name || ''}
              onShowAttractionOnMap={handleShowAttractionOnMap}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PlaceDetails;
