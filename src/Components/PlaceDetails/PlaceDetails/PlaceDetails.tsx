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
import { HotelDto, HotelOffersDto } from '../../../modal/Hotel';

const PlaceDetails: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  // State for the map query (to update the MapComponent)
  const [mapQuery, setMapQuery] = useState<string>('');

  const handleSearch = async (city: string) => {
    setSearchPerformed(true);
    setPlacesLoading(true);
    setPlacesError('');
    setPlaces([]);
    try {
      const response = await axios.get('http://localhost:8080/api/places/search', { params: { city } });
      setPlaces(response.data ? [response.data] : []);
      // Set initial map query to the city name.
      setMapQuery(city);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setPlacesError('An error occurred while fetching place details.');
    } finally {
      setPlacesLoading(false);
    }
  };

  // Update the handler to accept a hotel object and extract a query.
  const handleShowHotelOnMap = (hotel: HotelDto | HotelOffersDto) => {
    let query = '';
    // Example: if the hotel object contains latitude/longitude, use them.
    if ((hotel as any).latitude != null && (hotel as any).longitude != null) {
      query = `${(hotel as any).latitude},${(hotel as any).longitude}`;
    } else {
      // Otherwise, fallback to using hotel name (and optionally city)
      query = `${hotel.name}, ${places[0]?.name || ''}`;
    }
    setMapQuery(query);
    // Scroll to the map (assuming your MapComponent is wrapped in an element with id "map-container")
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShowAttractionOnMap = (query: string) => {
    setMapQuery(query);
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
            <HotelComponent 
              cityName={places[0]?.name || ''} 
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
