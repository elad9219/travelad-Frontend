import React, { useEffect, useState } from 'react';
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
                setError(null);
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

    const getWeatherClass = () => {
        if (!weather || !weather.condition) return 'default';
        // Convert condition to lowercase and replace spaces with hyphens for matching CSS class
        return weather.condition.toLowerCase().replace(/\s+/g, '-');
    };

    if (loading) return <p>Loading weather...</p>;

    return (
        <div className={`weather-container ${getWeatherClass()}`}>
            {error && <p className="error-message">{error}</p>}
            {!error && weather && (
                <div className="weather-info">
                    <div className="weather-icon">
                        <img src={`http:${weather.conditionIcon}`} alt={weather.condition || 'Weather condition'} />
                    </div>
                    <div className="weather-details">
                        <h3>{weather.city}, {weather.country}</h3>
                        <p><span className='temperature'>{weather.temperatureC}°C</span></p>
                        <p>Condition: {weather.condition}</p>
                        <p>Wind Speed: {weather.windSpeedKph} km/h</p>
                        <p>Humidity: {weather.humidity}%</p>
                        <p>Last Updated: {weather.lastUpdated}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherComponent;