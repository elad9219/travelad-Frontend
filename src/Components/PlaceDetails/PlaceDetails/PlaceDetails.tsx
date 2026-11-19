import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SearchBar from '../../Components/SearchBar/SearchBar';
import WeatherComponent from '../../Components/WeatherComponent/WeatherComponent';
import MapComponent from '../../Components/MapComponent/MapComponent';
import HotelComponent from '../../Components/HotelComponent/HotelComponent';
import AttractionComponent from '../../Components/AttractionComponent/AttractionComponent';
import FlightsComponent from '../../Components/FlightComponent/FlightComponent';
import Loader from '../../Components/Loader/Loader';
import PhotoAttributions from '../../Components/PhotoAttributions/PhotoAttributions';
import axios from 'axios';
import './PlaceDetails.css';
import globals from '../../../utils/globals';
import { City } from '../../../modal/City';
import { getUserId } from '../../../utils/userIdentity';
import { cityLabel } from '../../../utils/cityPresentation';
import {
  warmBackend,
  waitForBackend,
} from '../../../utils/backendReadiness';

const PlaceDetails: React.FC = () => {
  const { cityName } = useParams<{ cityName: string }>();
  const navigate = useNavigate();

  const [place, setPlace] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slowSearch, setSlowSearch] = useState(false);
  const [waitingForBackend, setWaitingForBackend] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mapQuery, setMapQuery] = useState('');

  const cache = useRef(new Map<string, City>());
  const [userId] = useState(getUserId);
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    // A failed background probe stays silent until the user needs the server.
    warmBackend().catch(() => {});
  }, []);

  useEffect(() => {
    // React Router already decodes route parameters.
    const city = cityName?.trim() || '';
    const cacheKey = city.toLowerCase();

    let active = true;
    const controller = new AbortController();

    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    setPlace(null);
    setError('');
    setSlowSearch(false);
    setMapQuery(city);
    setLoading(Boolean(city));
    setWaitingForBackend(Boolean(city));

    if (!city) {
      return () => controller.abort();
    }

    const cached = cache.current.get(cacheKey);

    if (cached) {
      setPlace(cached);
      if (city.includes(',') && cached.placeId) {
        setMapQuery(`place_id:${cached.placeId}`);
      }
      setLoading(false);
      setWaitingForBackend(false);

      return () => controller.abort();
    }

    slowTimer = setTimeout(() => {
      if (active) {
        setSlowSearch(true);
      }
    }, 3000);

    // Defer dispatch so Strict Mode's discarded effect does not send a search.
    // Search also writes history on the server, so never replay it automatically.
    Promise.resolve().then(async () => {
      if (!active) {
        return;
      }

      try {
        await waitForBackend(controller.signal);

        if (!active) {
          return;
        }

        setWaitingForBackend(false);

        const response = await axios.get<City>(globals.api.places, {
          params: { city, userId },
          signal: controller.signal,
          timeout: 60000,
        });

        if (!active) {
          return;
        }

        const data = response.data;

        if (
          !data ||
          typeof data.placeId !== 'string' ||
          !data.placeId.trim() ||
          data.placeId.startsWith('unknown_') ||
          typeof data.name !== 'string' ||
          !data.name.trim()
        ) {
          throw new Error('Place details are unavailable');
        }

        const result: City = {
          ...data,
          address: data.address || data.name,
        };

        // Keep only successful results and bound the in-memory cache.
        if (cache.current.size >= 20) {
          const oldestKey = cache.current.keys().next().value;

          if (oldestKey !== undefined) {
            cache.current.delete(oldestKey);
          }
        }

        cache.current.set(cacheKey, result);
        setPlace(result);
        if (city.includes(',')) {
          setMapQuery(`place_id:${data.placeId}`);
        }
        setHistoryRevision(previous => previous + 1);
      } catch {
        if (active) {
          setError(
            `Unable to load details for ${city}. Please try again or choose another city.`
          );
        }
      } finally {
        if (active) {
          clearTimeout(slowTimer);
          setSlowSearch(false);
          setLoading(false);
          setWaitingForBackend(false);
        }
      }
    });

    return () => {
      active = false;
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [cityName, userId, attempt]);

  const handleSearchSubmit = (value: string) => {
    const city = value.trim();

    if (!city) {
      return;
    }

    if (city === cityName?.trim()) {
      setAttempt(previous => previous + 1);
    } else {
      navigate(`/${encodeURIComponent(city)}`);
    }
  };

  const requestedCity = cityName?.trim() || '';

  const destination = requestedCity.includes(',')
    ? requestedCity
    : place?.name || requestedCity;

  const weatherDestination =
    requestedCity.includes(',') &&
    typeof place?.latitude === 'number' &&
    Number.isFinite(place.latitude) &&
    Math.abs(place.latitude) <= 90 &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.longitude) &&
    Math.abs(place.longitude) <= 180
      ? `${place.latitude},${place.longitude}`
      : destination;

  return (
    <div className="place-details-container">
      <SearchBar
        onSearch={handleSearchSubmit}
        historyRevision={historyRevision}
      />

      {loading && (
        <div role="status" style={{ marginTop: '20px' }}>
          <Loader />
          <p>
            {slowSearch && waitingForBackend
              ? 'Waiting for the demo server to become available. This may take up to a minute.'
              : slowSearch
                ? 'This search is taking longer than usual. Please wait.'
                : 'Loading place details...'}
          </p>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: '20px' }}>
          <p className="error-message">{error}</p>

          <button
            type="button"
            onClick={() => setAttempt(previous => previous + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && place && (
        <div className="main-grid">
          <div className="grid-item place-image-container">
            <div
              className="place-image"
              style={{
                backgroundImage: place.icon
                  ? `url(${place.icon})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {place.icon && (
                <PhotoAttributions values={place.photoAttributions} />
              )}

              <div className="place-address">
                {place.address || place.name || 'Unknown address'}
              </div>
            </div>
          </div>

          <div className="grid-item place-map-container">
            <MapComponent query={mapQuery} />
          </div>

          <div className="grid-item weather-component-container">
            <WeatherComponent
              city={weatherDestination}
              displayName={
                requestedCity.includes(',')
                  ? cityLabel(requestedCity)
                  : undefined
              }
            />
          </div>

          <div className="grid-item flights-component-container">
            <FlightsComponent city={destination} />
          </div>

          <div className="grid-item hotels-component-container">
            <HotelComponent
              cityName={destination}
              countryName={place.country || ''}
              onShowHotelOnMap={setMapQuery}
            />
          </div>

          <div className="grid-item attractions-component-container">
            <AttractionComponent
              city={destination}
              onShowAttractionOnMap={setMapQuery}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceDetails;