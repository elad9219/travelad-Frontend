import React, { useState } from 'react';
import SearchBar from '../../Components/SearchBar/SearchBar';
import MapComponent from '../../Components/MapComponent/MapComponent';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import Loader from '../../Components/Loader/Loader';
import './PlaceDetails.css';
import axios from 'axios';
import HotelComponent from '../../Components/HotelComponent/HotelComponent';

const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date.getFullYear()}`;
    const formattedTime = date.toTimeString().slice(0, 5);
    return { date: formattedDate, time: formattedTime };
};

const PlaceDetails: React.FC = () => {
    const [places, setPlaces] = useState<any[]>([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState('');
    const [recentCities, setRecentCities] = useState<string[]>([]);
    const [flights, setFlights] = useState<any[]>([]);
    const [flightsLoading, setFlightsLoading] = useState(false);
    const [flightsError, setFlightsError] = useState('');
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [expandedFlight, setExpandedFlight] = useState<number | null>(null);
    const [iataCode, setIataCode] = useState<string | null>(null);

    const toggleFlightDetails = (index: number) => {
        setExpandedFlight(expandedFlight === index ? null : index);
    };

    const handleSearch = async (city: string, iataCode: string | null) => {
        setSearchPerformed(true);
        setPlacesLoading(true);
        setPlacesError('');
        setPlaces([]);
        setFlightsLoading(true);
        setFlightsError('');
        setFlights([]);
        setIataCode(iataCode);

        try {
            const placeResponse = await axios.get('http://localhost:8080/api/places/search', {
                params: { city },
            });
            setPlaces(placeResponse.data ? [placeResponse.data] : []);
        } catch (err) {
            console.error('Error fetching place details:', err);
            setPlacesError('An error occurred while fetching place details.');
        } finally {
            setPlacesLoading(false);
        }

        try {
            const flightResponse = await axios.get('http://localhost:8080/flights', {
                params: { city, iataCode },
            });
            setFlights(flightResponse.data || []);
        } catch (err) {
            console.error('Error fetching flights:', err);
            setFlightsError('An error occurred while fetching flights.');
        } finally {
            setFlightsLoading(false);
        }
    };

    return (
        <div className="place-details-container">
            <SearchBar onSearch={handleSearch} updateCities={setRecentCities} />
            <div className="places-list">
                {placesLoading && <Loader />}
                {!placesLoading && placesError && <p className="error-message">{placesError}</p>}
                {!placesLoading &&
                    !placesError &&
                    places.map((place) => (
                        <div key={place.id} className="place-details">
                            <div
                                className="place-image"
                                style={{ backgroundImage: `url(${place.icon || 'default_image_url'})` }}
                            >
                                <div className="place-address">{place.address}</div>
                            </div>
                            <div className="place-map">
                                <MapComponent lat={place.latitude!} lng={place.longitude!} />
                                <WeatherComponent city={place.name || place.address} />
                            </div>
                        </div>
                    ))}
            </div>
            {searchPerformed && (
                <>
                    <div className="flights-container">
                        <h2 className="flights-title">✈ Flights</h2>
                        {flightsLoading && <Loader />}
                        {!flightsLoading && flightsError && <p className="error-message">{flightsError}</p>}
                        {!flightsLoading && !flightsError && flights.length === 0 && (
                            <p className="no-flights-message">No flights for this place.</p>
                        )}
                        {!flightsLoading &&
                            !flightsError &&
                            flights.map((flight, index) => {
                                const firstSegment = flight.segments?.[0];
                                const lastSegment = flight.segments?.[flight.segments.length - 1];
                                const stopCount = flight.segments.length - 1;
                                const isDirect = stopCount === 0;

                                return (
                                    <div
                                        key={index}
                                        className={`flight-item ${isDirect ? 'direct' : 'with-stops'}`}
                                        onClick={() => toggleFlightDetails(index)}
                                    >
                                        <div className="flight-summary">
                                            <p>
                                                {firstSegment?.origin} → {lastSegment?.destination}
                                                <span
                                                    className={`stop-indicator ${
                                                        isDirect ? 'direct-flight' : 'with-stops'
                                                    }`}
                                                >
                                                    {isDirect
                                                        ? 'Direct Flight'
                                                        : `${stopCount} Stop${stopCount > 1 ? 's' : ''}`}
                                                </span>
                                            </p>
                                            <p>
                                                Departure: {formatDateTime(firstSegment?.departureDate).date}{' '}
                                                {formatDateTime(firstSegment?.departureDate).time}
                                            </p>
                                            <p>Price: ${flight.price?.toFixed(2) || 'N/A'}</p>
                                        </div>
                                        {expandedFlight === index && (
                                            <div className="flight-details">
                                                {flight.segments.map((segment: any, segIndex: number) => (
                                                    <div key={segIndex}>
                                                        <p>
                                                            <b>
                                                                Flight {segIndex + 1}: {segment.origin} →{' '}
                                                                {segment.destination}
                                                            </b>
                                                        </p>
                                                        <p>
                                                            Departure:{' '}
                                                            {formatDateTime(segment.departureDate).date}{' '}
                                                            {formatDateTime(segment.departureDate).time}
                                                        </p>
                                                        <p>
                                                            Arrival:{' '}
                                                            {formatDateTime(segment.arrivalDate).date}{' '}
                                                            {formatDateTime(segment.arrivalDate).time}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                    <div className="hotels-container">
                        <HotelComponent cityName={places[0]?.name || ''} />
                    </div>
                </>
            )}
        </div>
    );
};

export default PlaceDetails;