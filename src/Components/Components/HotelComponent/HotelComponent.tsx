import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import axios from 'axios';
import './HotelComponent.css';
import { HotelDto } from '../../../modal/Hotel';
import globals from '../../../utils/globals';
import SkeletonCard from '../SkeletonCard/SkeletonCard';

interface HotelComponentProps {
  cityName: string;
  countryName: string;
  onShowHotelOnMap: (query: string) => void;
}

interface SearchParams {
  checkInDate: string;
  checkOutDate: string;
  adults: string;
}

interface HotelSearch {
  city: string;
  params: SearchParams;
  advanced: boolean;
}

const toTitleCase = (value: string): string =>
  value.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

const localDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const validDate = (value: string): boolean => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const nextDay = (value: string): string => {
  if (!validDate(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const defaultParams = (): SearchParams => {
  const today = localDate();
  return { checkInDate: today, checkOutDate: nextDay(today), adults: '1' };
};

const formatDate = (value: string): string => value.split('-').reverse().join('/');

const readHotels = (data: unknown): HotelDto[] => {
  if (!Array.isArray(data) || !data.every(hotel =>
    hotel && typeof hotel.name === 'string' && hotel.name.trim() &&
    typeof hotel.hotelId === 'string' &&
    ['price', 'rating'].every(field => hotel[field] == null ||
      (typeof hotel[field] === 'number' && Number.isFinite(hotel[field]) && hotel[field] >= 0)) &&
    ['latitude', 'longitude'].every(field => hotel[field] == null ||
      (typeof hotel[field] === 'number' && Number.isFinite(hotel[field]))) &&
    (hotel.imageUrl == null || typeof hotel.imageUrl === 'string')
  )) throw new Error('Invalid hotel response');
  return data;
};

const hasHotelCoordinates = (hotel: HotelDto): boolean =>
  typeof hotel.latitude === 'number' && Number.isFinite(hotel.latitude) && Math.abs(hotel.latitude) <= 90 &&
  typeof hotel.longitude === 'number' && Number.isFinite(hotel.longitude) && Math.abs(hotel.longitude) <= 180;

const HotelComponent: React.FC<HotelComponentProps> = ({ cityName, onShowHotelOnMap }) => {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsFetchError, setHotelsFetchError] = useState('');
  const [expandedHotelIndex, setExpandedHotelIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>(defaultParams);
  const [appliedSearchParams, setAppliedSearchParams] = useState<SearchParams>(defaultParams);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const lastSearch = useRef<HotelSearch | null>(null);
  const formId = useId();

  const fetchHotels = useCallback((search: HotelSearch) => {
    const id = ++requestId.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    lastSearch.current = search;
    setHotelsLoading(true);
    setHotelsFetchError('');
    setHotels([]);
    setExpandedHotelIndex(null);

    // Discarded Strict Mode effects do not dispatch requests.
    Promise.resolve().then(async () => {
      if (id !== requestId.current) return;
      try {
        const response = await axios.get<unknown>(globals.api.hotels, {
          params: { cityName: search.city, ...search.params },
          signal: controller.signal,
          timeout: 30000,
        });
        if (id !== requestId.current) return;
        setHotels(readHotels(response.data));
        setAppliedSearchParams({ ...search.params });
      } catch (failure: any) {
        if (id !== requestId.current) return;
        // The old public backend uses HTTP 404 for an empty hotel search.
        if (failure?.response?.status === 404) {
          setHotels([]);
        } else {
          setHotelsFetchError(failure?.response?.status === 400
            ? 'Check the dates and number of guests, then try again.'
            : 'Unable to load hotels. Please try again.');
          if (search.advanced) setShowAdvancedSearch(true);
        }
      } finally {
        if (id === requestId.current) setHotelsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const defaults = defaultParams();
    setSearchParams(defaults);
    setInvalidFields([]);
    setShowAdvancedSearch(false);
    if (cityName.trim()) {
      fetchHotels({ city: cityName.trim(), params: defaults, advanced: false });
    } else {
      lastSearch.current = null;
      setHotels([]);
      setHotelsLoading(false);
      setHotelsFetchError('');
      setExpandedHotelIndex(null);
    }
    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [cityName, fetchHotels]);

  const handleSearchParamsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'adults' && value !== '' && !/^[1-9]$/.test(value)) return;
    setInvalidFields(previous => previous.filter(field => field !== name));
    setSearchParams(previous => {
      const next = { ...previous, [name]: value };
      if (name === 'checkInDate' && validDate(value) && next.checkOutDate <= value) {
        next.checkOutDate = nextDay(value);
      }
      return next;
    });
  };

  const handleAdvancedSearch = () => {
    const invalid: string[] = [];
    if (!validDate(searchParams.checkInDate) || searchParams.checkInDate < localDate()) {
      invalid.push('checkInDate');
    }
    if (!validDate(searchParams.checkOutDate) || searchParams.checkOutDate <= searchParams.checkInDate) {
      invalid.push('checkOutDate');
    }
    if (!/^[1-9]$/.test(searchParams.adults)) invalid.push('adults');
    setInvalidFields(invalid);
    if (invalid.length || !cityName.trim()) return;
    fetchHotels({ city: cityName.trim(), params: { ...searchParams }, advanced: true });
  };

  const toggleDetails = (index: number) => {
    setExpandedHotelIndex(previous => previous === index ? null : index);
  };

  const handleShowHotelOnMap = (hotel: HotelDto, event: React.MouseEvent) => {
    event.stopPropagation();
    const query = hasHotelCoordinates(hotel)
      ? `${hotel.latitude},${hotel.longitude}`
      : hotel.hotelId.startsWith('MOCK_') ? cityName : `${hotel.name}, ${cityName}`;
    onShowHotelOnMap(query);
    document.querySelector('.place-map-container')?.scrollIntoView({
      behavior: 'smooth', block: 'nearest',
    });
  };

  const nights = Math.max(1, Math.round((
    Date.parse(`${appliedSearchParams.checkOutDate}T00:00:00Z`) -
    Date.parse(`${appliedSearchParams.checkInDate}T00:00:00Z`)
  ) / 86400000));
  const minCheckoutDate = nextDay(searchParams.checkInDate) || nextDay(localDate());

  return (
    <div className="hotels-container">
      <div className="hotels-header">
        <h2 className="hotels-title">🏨 Hotels in {toTitleCase(cityName)}</h2>
        <button
          className="advanced-search-toggle"
          aria-expanded={showAdvancedSearch}
          onClick={() => setShowAdvancedSearch(previous => !previous)}
        >
          {showAdvancedSearch ? 'Close Search' : 'Advanced Search'}
        </button>
      </div>

      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className="search-field">
            <label htmlFor={`${formId}-checkInDate`}>Check-In:</label>
            <input
              type="date" id={`${formId}-checkInDate`} name="checkInDate"
              min={localDate()} value={searchParams.checkInDate}
              aria-invalid={invalidFields.includes('checkInDate')}
              onChange={handleSearchParamsChange}
            />
          </div>
          <div className="search-field">
            <label htmlFor={`${formId}-checkOutDate`}>Check-Out:</label>
            <input
              type="date" id={`${formId}-checkOutDate`} name="checkOutDate"
              min={minCheckoutDate} value={searchParams.checkOutDate}
              aria-invalid={invalidFields.includes('checkOutDate')}
              onChange={handleSearchParamsChange}
            />
          </div>
          <div className="search-field">
            <label htmlFor={`${formId}-adults`}>Guests (1-9):</label>
            <input
              type="number" id={`${formId}-adults`} name="adults" min="1" max="9"
              value={searchParams.adults} aria-invalid={invalidFields.includes('adults')}
              onChange={handleSearchParamsChange}
              onKeyDown={event => {
                if (['e', 'E', '+', '-', '.'].includes(event.key) && !event.ctrlKey && !event.metaKey) {
                  event.preventDefault();
                }
              }}
            />
          </div>
          <button className="advanced-search-btn" onClick={handleAdvancedSearch}>Search</button>
          {invalidFields.length > 0 && (
            <p role="alert">Enter valid dates and between 1 and 9 guests. Check-out must follow check-in.</p>
          )}
        </div>
      )}

      {hotelsFetchError && (
        <div role="alert" className="error-message">
          <p>{hotelsFetchError}</p>
          <button type="button" onClick={() => lastSearch.current && fetchHotels(lastSearch.current)}>
            Try again
          </button>
        </div>
      )}

      {hotelsLoading && (
        <div className="hotels-grid" role="status" aria-label="Loading hotels">
          {[...Array(4)].map((_, index) => <SkeletonCard key={index} />)}
        </div>
      )}

      {!hotelsLoading && !hotelsFetchError && cityName.trim() && hotels.length === 0 && (
        <p>No hotels found.</p>
      )}

      {!hotelsLoading && hotels.length > 0 && (
        <div className="hotels-grid">
          {hotels.map((hotel, index) => {
            const totalPrice = hotel.price || 0;
            const isExpanded = expandedHotelIndex === index;
            const showCity = hotel.hotelId.startsWith('MOCK_') && !hasHotelCoordinates(hotel);
            const rating = hotel.rating ? hotel.rating.toFixed(1) : '8.0';
            const imageUrl = hotel.imageUrl || 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg';
            return (
              <div
                key={`${hotel.hotelId}-${index}`}
                className={`hotel-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleDetails(index)}
              >
                <div className="hotel-image-container">
                  <img src={imageUrl} alt={hotel.name} className="hotel-image" />
                  <div className="hotel-rating">⭐ {rating}</div>
                </div>
                <div className="hotel-card-content">
                  <div className="hotel-card-header">
                    <h3 className="hotel-name">
                      <button
                        type="button" aria-label={`Details for ${hotel.name}`}
                        aria-expanded={isExpanded} aria-controls={`${formId}-details-${index}`}
                        style={{ background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', textAlign: 'inherit', cursor: 'pointer' }}
                        onClick={event => { event.stopPropagation(); toggleDetails(index); }}
                      >
                        {toTitleCase(hotel.name)}
                      </button>
                    </h3>
                  </div>
                  <div className="hotel-card-price-row">
                    <button className="show-on-map-btn" onClick={event => handleShowHotelOnMap(hotel, event)}>
                      {showCity ? 'Show City on Map' : 'Show on Map'}
                    </button>
                    <div className="hotel-price">
                      {totalPrice > 0 ? `€${totalPrice.toFixed(0)}` : 'N/A'}
                      <span className="price-subtitle">{nights} {nights === 1 ? 'night' : 'nights'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div id={`${formId}-details-${index}`} className="hotel-details" onClick={event => event.stopPropagation()}>
                      <p><strong>City:</strong> {cityName.toUpperCase()}</p>
                      <p><strong>Dates:</strong> {formatDate(appliedSearchParams.checkInDate)} - {formatDate(appliedSearchParams.checkOutDate)}</p>
                      <p><strong>Guests:</strong> {appliedSearchParams.adults}</p>
                      <p><strong>Total Price:</strong> EUR {totalPrice.toFixed(2)}</p>
                      <p><strong>Total (Inc. Tax):</strong> EUR {(totalPrice * 1.15).toFixed(2)}</p>
                      <div className="hotel-details-separator"><p>Standard/Deluxe Room</p></div>
                      <button
                        className="book-now-btn"
                        onClick={event => {
                          event.stopPropagation();
                          const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}+${encodeURIComponent(cityName)}`;
                          window.open(bookingUrl, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        Book on Booking.com
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HotelComponent;