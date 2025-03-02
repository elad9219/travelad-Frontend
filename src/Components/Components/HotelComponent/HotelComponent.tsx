// src/Components/Components/HotelComponent/HotelComponent.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelComponent.css';
import { HotelDto, HotelOffersDto } from '../../../modal/Hotel';

const toTitleCase = (str: string) =>
  str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const BATCH_SIZE = 50;

interface HotelComponentProps {
  cityName: string;
  onShowHotelOnMap: (hotel: HotelDto | HotelOffersDto) => void;
}

const HotelComponent: React.FC<HotelComponentProps> = ({ cityName, onShowHotelOnMap }) => {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [hotelOffers, setHotelOffers] = useState<HotelOffersDto[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
  const [expandedHotelIndex, setExpandedHotelIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchParams, setSearchParams] = useState({ checkInDate: '', checkOutDate: '', adults: '' });
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);

  // Fetch basic hotel data when cityName changes.
  useEffect(() => {
    const fetchHotels = async () => {
      setHotelsLoading(true);
      setHotelsError(null);
      try {
        const response = await axios.get<HotelDto[]>(
          `http://localhost:8080/hotels/by-city-name?cityName=${encodeURIComponent(cityName)}`
        );
        setHotels(response.data);
        setHotelOffers([]); // clear advanced offers when new city is searched
      } catch (error) {
        setHotelsError('Error fetching hotels');
      } finally {
        setHotelsLoading(false);
      }
    };
    if (cityName) fetchHotels();
  }, [cityName]);

  // Reset advanced search parameters when advanced search is opened.
  useEffect(() => {
    if (showAdvancedSearch) {
      setSearchParams({ checkInDate: '', checkOutDate: '', adults: '' });
    }
  }, [showAdvancedSearch]);

  const handleSearchParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const fetchHotelOffersInBatches = async () => {
    setIsFetchingOffers(true);
    setHotelOffers([]);
    setHotelsError(null);
    setShowAdvancedSearch(false);
    try {
      const hotelIds = hotels.map(hotel => hotel.hotelId);
      for (let i = 0; i < hotelIds.length; i += BATCH_SIZE) {
        const batch = hotelIds.slice(i, i + BATCH_SIZE).join(',');
        const result = await axios.get<HotelOffersDto[]>('http://localhost:8080/hotels/offers', {
          params: {
            hotelIds: batch,
            ...searchParams,
            adults: searchParams.adults ? parseInt(searchParams.adults, 10) : undefined
          }
        });
        setHotelOffers(prev => [...prev, ...result.data]);
      }
    } catch (error) {
      console.error('Error performing advanced search:', error);
    } finally {
      setIsFetchingOffers(false);
    }
  };

  const toggleHotelDetails = (index: number) => {
    setExpandedHotelIndex(expandedHotelIndex === index ? null : index);
  };

  // "Show on Map" handler: Build a query string from hotel data.
  const handleShowHotelOnMap = (hotel: HotelDto | HotelOffersDto, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    let mapQuery = '';
    // If hotel has latitude and longitude, use them.
    if ((hotel as HotelDto).latitude != null && (hotel as HotelDto).longitude != null) {
      mapQuery = `${(hotel as HotelDto).latitude},${(hotel as HotelDto).longitude}`;
    } else {
      // Fallback: use hotel name and cityName
      mapQuery = `${hotel.name}, ${cityName}`;
    }
    // Here you could update a global state or call a callback to update your MapComponent.
    onShowHotelOnMap(hotel);
    // Scroll to map (assumes an element with id "map-container" wraps your MapComponent)
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderHotelDetails = (offer: HotelOffersDto) => {
    return (
      <div className="hotel-details">
        {offer.city && <p><strong>City:</strong> {offer.city}</p>}
        {offer.checkInDate && <p><strong>Check-In:</strong> {formatDate(offer.checkInDate)}</p>}
        {offer.checkOutDate && <p><strong>Check-Out:</strong> {formatDate(offer.checkOutDate)}</p>}
        {offer.basePrice && offer.priceCurrency && (
          <p><strong>Base Price:</strong> {offer.priceCurrency} {offer.basePrice}</p>
        )}
        {offer.totalPrice && offer.priceCurrency && (
          <p><strong>Total Price:</strong> {offer.priceCurrency} {offer.totalPrice}</p>
        )}
        {offer.room && (
          <>
            {offer.room.description && <p><strong>Room:</strong> {offer.room.description}</p>}
            {offer.room.bedType && <p><strong>Bed Type:</strong> {offer.room.bedType}</p>}
            {(offer.room.beds || offer.room.beds === 0) && <p><strong>Beds:</strong> {offer.room.beds}</p>}
          </>
        )}
        <button className="show-on-map-btn" onClick={(e) => { e.stopPropagation(); handleShowHotelOnMap(offer, e); }}>
          Show on Map
        </button>
      </div>
    );
  };

  const renderHotels = () => {
    // Use advanced offers if available; otherwise, use basic hotel data.
    const hotelList = hotelOffers.length > 0 ? hotelOffers : hotels;
    return (
      <div className="hotels-list">
        {hotelList.map((hotel, index) => {
          const key = hotelOffers.length > 0 ? index : (hotel as HotelDto).hotelId;
          const offer = hotelOffers.length > 0 ? hotel as HotelOffersDto : null;
          return (
            <div key={key} className="hotel-item" onClick={() => toggleHotelDetails(index)}>
              <div className="hotel-summary">
                <p>{hotel.name ? toTitleCase(hotel.name) : 'Unknown Hotel'}</p>
                {offer && offer.totalPrice && offer.priceCurrency && (
                  <p>{offer.priceCurrency} {offer.totalPrice}</p>
                )}
                {hotelOffers.length === 0 && (
                  <button className="show-on-map-btn" onClick={(e) => { e.stopPropagation(); handleShowHotelOnMap(hotel, e); }}>
                    Show on Map
                  </button>
                )}
                {hotelOffers.length > 0 && (
                  <button className="show-on-map-btn center-btn" onClick={(e) => { e.stopPropagation(); handleShowHotelOnMap(offer!, e); }}>
                    Show on Map
                  </button>
                )}
              </div>
              {expandedHotelIndex === index && (
                offer ? renderHotelDetails(offer) : (
                  <div className="hotel-details">
                    {(hotel as HotelDto).iataCode && <p><strong>City:</strong> {(hotel as HotelDto).iataCode}</p>}
                    {(hotel as HotelDto).countryCode && <p><strong>Country:</strong> {(hotel as HotelDto).countryCode}</p>}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="hotels-container">
      <div className="hotels-header">
        <h2 className="hotels-title">🏨 Hotels</h2>
        <button className="advanced-search-toggle" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
          Advanced Search
        </button>
      </div>
      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className="search-field">
            <label>Check-In:</label>
            <input
              type="date"
              name="checkInDate"
              value={searchParams.checkInDate}
              onChange={handleSearchParamsChange}
              min={new Date().toISOString().split('T')[0]}
              max={searchParams.checkOutDate ? new Date(new Date(searchParams.checkOutDate).getTime() - 86400000).toISOString().split('T')[0] : undefined}
            />
          </div>
          <div className="search-field">
            <label>Check-Out:</label>
            <input
              type="date"
              name="checkOutDate"
              value={searchParams.checkOutDate}
              onChange={handleSearchParamsChange}
              min={searchParams.checkInDate ? new Date(new Date(searchParams.checkInDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="search-field">
            <label>Adults:</label>
            <input
              type="number"
              name="adults"
              value={searchParams.adults}
              onChange={handleSearchParamsChange}
              style={{ maxWidth: '80px' }}
            />
          </div>
          <button className="advanced-search-btn" onClick={fetchHotelOffersInBatches}>Search</button>
        </div>
      )}
      {hotelsLoading && <div className="loader">Loading hotels...</div>}
      {hotelsError && <p className="error-message">{hotelsError}</p>}
      {isFetchingOffers ? (
        <div className="loader">Loading offers...</div>
      ) : (
        renderHotels()
      )}
    </div>
  );
};

export default HotelComponent;
