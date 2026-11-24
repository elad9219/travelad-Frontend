import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Weather } from '../../../modal/Weather';
import './WeatherComponent.css';
import globals from '../../../utils/globals';
import { weatherAppearance } from './weatherAppearance';

interface WeatherProps {
  city: string;
  displayName?: string;
}

type WeatherReadings = Required<Pick<Weather,
  'city' | 'country' | 'temperatureC' | 'condition' | 'conditionIcon' |
  'windSpeedKph' | 'humidity' | 'lastUpdated'
>>;

const safeIcon = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '';

  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.hostname !== 'cdn.weatherapi.com' ||
      url.username ||
      url.password ||
      url.port
    ) {
      return '';
    }

    url.protocol = 'https:';
    return url.href;
  } catch {
    return '';
  }
};

const readWeather = (data: unknown): WeatherReadings => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid weather');
  }

  const body = data as Record<string, unknown>;

  const text = (field: string): string => {
    const value = body[field];

    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Invalid weather');
    }

    return value;
  };

  const number = (field: string): number => {
    const value = body[field];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Invalid weather');
    }

    return value;
  };

  const humidity = number('humidity');
  const wind = number('windSpeedKph');

  if (
    !Number.isInteger(humidity) ||
    humidity < 0 ||
    humidity > 100 ||
    wind < 0
  ) {
    throw new Error('Invalid weather');
  }

  return {
    city: text('city'),
    country: text('country'),
    condition: text('condition'),
    temperatureC: number('temperatureC'),
    humidity,
    windSpeedKph: wind,
    conditionIcon: safeIcon(body.conditionIcon),
    lastUpdated:
      typeof body.lastUpdated === 'string' && body.lastUpdated.trim()
        ? body.lastUpdated
        : 'Unavailable',
  };
};

const WeatherComponent: React.FC<WeatherProps> = ({ city, displayName }) => {
  const [weather, setWeather] = useState<WeatherReadings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedIcon, setFailedIcon] = useState('');

  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  const fetchWeather = useCallback((query: string) => {
    const id = ++requestId.current;
    requestController.current?.abort();

    const controller = new AbortController();
    requestController.current = controller;

    setLoading(true);
    setError('');
    setWeather(null);
    setFailedIcon('');

    // Discarded Strict Mode effects do not dispatch requests.
    Promise.resolve().then(async () => {
      if (id !== requestId.current) return;

      try {
        const response = await axios.get<unknown>(globals.api.weather, {
          params: { city: query },
          signal: controller.signal,
          timeout: 30000,
        });

        if (id !== requestId.current) return;

        setWeather(readWeather(response.data));
      } catch (failure: any) {
        if (id !== requestId.current) return;

        const status = failure?.response?.status;

        setError(
          status === 404
            ? 'Weather is unavailable for this location.'
            : status === 400
              ? 'Enter a valid city and try again.'
              : 'Unable to load weather. Please try again.'
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const query = city.trim();

    if (query) {
      fetchWeather(query);
    } else {
      setWeather(null);
      setLoading(false);
      setError('');
      setFailedIcon('');
    }

    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [city, fetchWeather]);

  const weatherClass = weather
    ? weatherAppearance(weather.condition, weather.conditionIcon)
    : 'weather-theme-default weather-period-unknown';

  return (
    <div
      role="region"
      aria-label="Weather"
      className={`weather-container ${weatherClass}`}
    >
      <div className="weather-info">
        {loading ? (
          <p role="status">Loading weather...</p>
        ) : error ? (
          <div className="weather-details" role="alert">
            <p style={{ whiteSpace: 'normal' }}>{error}</p>
            <button
              type="button"
              onClick={() => fetchWeather(city.trim())}
            >
              Try again
            </button>
          </div>
        ) : weather ? (
          <>
            {weather.conditionIcon && weather.conditionIcon !== failedIcon && (
              <div className="weather-icon">
                <img
                  src={weather.conditionIcon}
                  alt={weather.condition}
                  onError={() => setFailedIcon(weather.conditionIcon)}
                />
              </div>
            )}

            <div className="weather-details">
              <h3>{displayName || `${weather.city}, ${weather.country}`}</h3>
              <p>
                <span className="temperature">
                  {weather.temperatureC}°C
                </span>
              </p>
              <p>Condition: {weather.condition}</p>
              <p>Wind Speed: {weather.windSpeedKph} km/h</p>
              <p>Humidity: {weather.humidity}%</p>
              <p>Last Updated: {weather.lastUpdated}</p>
            </div>
          </>
        ) : (
          <p style={{ whiteSpace: 'normal' }}>
            Search for a city to see the weather.
          </p>
        )}
      </div>
    </div>
  );
};

export default WeatherComponent;