import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelComponent.css';
import { HotelDto } from '../../../modal/Hotel';

const toTitleCase = (str: string) => {
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const HotelComponent: React.FC<{ cityName: string }> = ({ cityName }) => {
    const [hotels, setHotels] = useState<HotelDto[]>([]);
    const [hotelsLoading, setHotelsLoading] = useState(false);
    const [hotelsError, setHotelsError] = useState<string | null>(null);
    const [expandedHotelIndex, setExpandedHotelIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchHotels = async () => {
            setHotelsLoading(true);
            setHotelsError(null);
            try {
                const response = await axios.get<HotelDto[]>(
                    `http://localhost:8080/hotels/by-city-name?cityName=${cityName}`
                );
                setHotels(response.data);
            } catch (error) {
                setHotelsError('Error fetching hotels');
            } finally {
                setHotelsLoading(false);
            }
        };

        if (cityName) fetchHotels();
    }, [cityName]);

    const toggleHotelDetails = (index: number) => {
        setExpandedHotelIndex(expandedHotelIndex === index ? null : index);
    };

    return (
        <div>
            <h2 className="hotels-title">🏨 Hotels</h2>
            {hotelsLoading && <div className="loader">Loading...</div>}
            {hotelsError && <p className="error-message">{hotelsError}</p>}
            {hotels.map((hotel, index) => (
                <div
                    key={hotel.hotelId}
                    className="hotel-item"
                    onClick={() => toggleHotelDetails(index)} // Make the entire item clickable
                >
                    <div className="hotel-summary">
                        <p>{hotel.name ? toTitleCase(hotel.name) : 'Unknown Hotel'}</p>
                    </div>
                    {expandedHotelIndex === index && (
                        <div className="hotel-details">
                            <p>
                                <strong>City:</strong> {hotel.iataCode || 'Unknown'}
                            </p>
                            <p>
                                <strong>Country:</strong> {hotel.countryCode || 'Unknown'}
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default HotelComponent;
