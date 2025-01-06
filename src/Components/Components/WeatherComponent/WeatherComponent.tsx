import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Weather } from '../../../modal/Weather';
import './WeatherComponent.css';

interface WeatherProps {
    city: string;
}

const WeatherComponent: React.FC<WeatherProps> = ({ city }) => {
    const [weather, setWeather] = useState<Weather | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            try {
                const response = await axios.get<Weather>(`http://localhost:8080/weather?city=${encodeURIComponent(city)}`);
                setWeather(response.data);
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    console.error('Axios error:', err.message);
                    console.error('Response data:', err.response?.data);
                    console.error('Status:', err.response?.status);
                } else {
                    console.error('Unexpected error:', err);
                }
                setError('Failed to fetch weather data');
            } finally {
                setLoading(false);
            }
        };

        if (city) {
            fetchWeather();
        }
    }, [city]);

    if (loading) return <p>Loading weather...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!weather) return <p>No weather data available</p>;

    const weatherIcon = weather.conditionIcon ? `http:${weather.conditionIcon}` : '';
    const conditionClass = weather.condition
        ? weather.condition.toLowerCase().replace(/\s+/g, '-') // Convert to lowercase and replace spaces with hyphens
        : 'default';

    return (
        <div className={`weather-container ${conditionClass}`}>
            <div className="weather-info">
                <div className="weather-icon">
                    <img src={weatherIcon} alt={weather.condition || 'Weather condition'} />
                </div>
                <div className="weather-details">
                    <h3>{weather.city}, {weather.country}</h3>
                    <p><span>{weather.temperatureC}°C</span></p>
                    <p>Condition: {weather.condition}</p>
                    <p>Wind Speed: {weather.windSpeedKph} km/h</p>
                    <p>Humidity: {weather.humidity}%</p>
                    <p>Last Updated: {weather.lastUpdated}</p>
                </div>
            </div>
        </div>
    );
};

export default WeatherComponent;
