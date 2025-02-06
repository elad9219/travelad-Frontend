import React, { useState } from 'react';
import SearchBar from '../../Components/SearchBar/SearchBar';
import MapComponent from '../../Components/MapComponent/MapComponent';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import HotelComponent from '../../Components/HotelComponent/HotelComponent';
import Loader from '../../Components/Loader/Loader';
import axios from 'axios';
import './PlaceDetails.css';
import FlightsComponent from '../../Components/FlightComponent/FlightComponent';

const PlaceDetails: React.FC = () => {
    const [places, setPlaces] = useState<any[]>([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState('');
    const [recentCities, setRecentCities] = useState<string[]>([]);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const handleSearch = async (city: string) => {
        setSearchPerformed(true);
        setPlacesLoading(true);
        setPlacesError('');
        setPlaces([]);

        try {
            const placeResponse = await axios.get('http://localhost:8080/api/places/search', { params: { city } });
            setPlaces(placeResponse.data ? [placeResponse.data] : []);
        } catch (err) {
            console.error('Error fetching place details:', err);
            setPlacesError('An error occurred while fetching place details.');
        } finally {
            setPlacesLoading(false);
        }
    };

    return (
        <div className="place-details-container">
            <SearchBar onSearch={handleSearch} updateCities={setRecentCities} />
            <div className="places-list">
                {placesLoading && <Loader />}
                {placesError && <p className="error-message">{placesError}</p>}
                {!placesLoading &&
                    !placesError &&
                    places.map((place) => (
                        <div key={place.id} className="place-details">
                            <div className="place-image" style={{ backgroundImage: `url(${place.icon || 'default_image_url'})` }}>
                                <div className="place-address">{place.address}</div>
                            </div>
                            <div className="place-map">
                                <MapComponent lat={place.latitude} lng={place.longitude} />
                                <WeatherComponent city={place.name || place.address} />
                            </div>
                        </div>
                    ))}
            </div>
            {searchPerformed && places.length > 0 && (
                <>
                    <FlightsComponent city={places[0]?.name || ''} />
                    <div className="hotels">
                        <HotelComponent cityName={places[0]?.name || ''} />
                    </div>
                </>
            )}
        </div>
    );
};

export default PlaceDetails;
