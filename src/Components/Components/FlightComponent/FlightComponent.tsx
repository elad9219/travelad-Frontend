import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../../Components/Loader/Loader';
import './FlightComponent.css';

const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1)
        .toString().padStart(2, '0')}-${date.getFullYear()}`;
    const formattedTime = date.toTimeString().slice(0, 5);
    return { date: formattedDate, time: formattedTime };
};

interface FlightsComponentProps {
    city: string;
}

const FlightsComponent: React.FC<FlightsComponentProps> = ({ city }) => {
    const [flights, setFlights] = useState<any[]>([]);
    const [flightsLoading, setFlightsLoading] = useState(false);
    const [flightsError, setFlightsError] = useState('');
    const [expandedFlight, setExpandedFlight] = useState<number | null>(null);

    useEffect(() => {
        if (!city) return;  // Prevent fetching if city is empty

        const fetchFlights = async () => {
            setFlightsLoading(true);
            setFlightsError('');
            setFlights([]);

            try {
                const origin = 'TLV';
                const departDate = new Date();
                departDate.setDate(departDate.getDate() + 10);
                const returnDate = new Date();
                returnDate.setDate(returnDate.getDate() + 15);
                const adults = '1';

                const departStr = departDate.toISOString().split('T')[0];
                const returnStr = returnDate.toISOString().split('T')[0];

                const response = await axios.get('http://localhost:8080/flights', {
                    params: { city, iataCode: city, originLocationCode: origin, departureDate: departStr, returnDate: returnStr, adults },
                });

                setFlights(response.data || []);
            } catch (err) {
                console.error('Error fetching flights:', err);
                setFlightsError('An error occurred while fetching flights.');
            } finally {
                setFlightsLoading(false);
            }
        };

        fetchFlights();
    }, [city]);  // Fetch flights automatically when the city changes

    const toggleFlightDetails = (index: number) => {
        setExpandedFlight(expandedFlight === index ? null : index);
    };

    return (
        <div className="flights-container">
            <h2 className="flights-title">✈ Flights</h2>
            {flightsLoading && <Loader />}
            {flightsError && <p className="error-message">{flightsError}</p>}
            {!flightsLoading && !flightsError && flights.length === 0 && (
                <p className="no-flights-message">No flights found.</p>
            )}
            {!flightsLoading &&
                !flightsError &&
                flights.map((flight, index) => {
                    const firstSegment = flight.segments?.[0];
                    const lastSegment = flight.segments?.[flight.segments.length - 1];
                    const stopCount = flight.segments.length - 1;
                    const isDirect = stopCount === 0;

                    return (
                        <div key={index} className={`flight-item ${isDirect ? 'direct' : 'with-stops'}`} onClick={() => toggleFlightDetails(index)}>
                            <div className="flight-summary">
                                <p>
                                    {firstSegment?.origin} → {lastSegment?.destination}
                                    <span className={`stop-indicator ${isDirect ? 'direct-flight' : 'with-stops'}`}>
                                        {isDirect ? 'Direct Flight' : `${stopCount} Stop${stopCount > 1 ? 's' : ''}`}
                                    </span>
                                </p>
                                <p>Departure: {formatDateTime(firstSegment?.departureDate).date} {formatDateTime(firstSegment?.departureDate).time}</p>
                                <p>Price: ${flight.price?.toFixed(2) || 'N/A'}</p>
                            </div>
                            {expandedFlight === index && (
                                <div className="flight-details">
                                    {flight.segments.map((segment: any, segIndex: number) => (
                                        <div key={segIndex}>
                                            <p><b>Flight {segIndex + 1}: {segment.origin} → {segment.destination}</b></p>
                                            <p>Departure: {formatDateTime(segment.departureDate).date} {formatDateTime(segment.departureDate).time}</p>
                                            <p>Arrival: {formatDateTime(segment.arrivalDate).date} {formatDateTime(segment.arrivalDate).time}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

export default FlightsComponent;
