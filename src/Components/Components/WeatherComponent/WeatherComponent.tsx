import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Weather } from '../../../modal/Weather';


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
            const response = await axios.get<Weather>(`/weather?city=${encodeURIComponent(city)}`);
            setWeather(response.data);
        } catch (err) {
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

    // Use optional chaining for safety, since all properties are optional in the Weather class
    const weatherIcon = weather.conditionIcon ? `http:${weather.conditionIcon}` : '';

    return (
        <div className="weather-info">
        <div className="weather-icon">
            <img src={weatherIcon} alt={weather.condition} />
        </div>
        <div className="weather-details">
            <h3>{weather.city}, {weather.country}</h3>
            <p>Current: {weather.temperatureC}°C / {weather.temperatureF}°F</p>
            <p>Condition: {weather.condition}</p>
            <p>Wind Speed: {weather.windSpeedKph} km/h</p>
            <p>Humidity: {weather.humidity}%</p>
            <p>Last Updated: {weather.lastUpdated}</p>
        </div>
        </div>
    );
};

export default WeatherComponent;