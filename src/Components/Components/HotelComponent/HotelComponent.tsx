// src/Components/Components/HotelComponent/HotelComponent.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelComponent.css';
import { HotelDto, HotelOffersDto } from '../../../modal/Hotel';

interface HotelComponentProps {
  cityName: string;
  countryName: string; // Full country name (e.g., "Poland")
  onShowHotelOnMap: (query: string) => void;
}

// Type guard to check if a hotel is a basic HotelDto (with hotelId and geoCode)
function isHotelDto(hotel: HotelDto | HotelOffersDto): hotel is HotelDto {
  return (hotel as HotelDto).hotelId !== undefined;
}

const BATCH_SIZE = 50;

const toTitleCase = (str: string): string =>
  str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const HotelComponent: React.FC<HotelComponentProps> = ({ cityName, countryName, onShowHotelOnMap }) => {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [hotelOffers, setHotelOffers] = useState<HotelOffersDto[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
  const [expandedHotelIndex, setExpandedHotelIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchParams, setSearchParams] = useState({ checkInDate: '', checkOutDate: '', adults: '' });
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);

  useEffect(() => {
    const fetchHotels = async () => {
      setHotelsLoading(true);
      setHotelsError(null);
      try {
        const response = await axios.get<HotelDto[]>(
          `http://localhost:8080/hotels/by-city-name?cityName=${encodeURIComponent(cityName)}`
        );
        setHotels(response.data);
        setHotelOffers([]);
      } catch (error) {
        setHotelsError('Error fetching hotels');
      } finally {
        setHotelsLoading(false);
      }
    };
    if (cityName) fetchHotels();
  }, [cityName]);

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

  // "Show on Map" handler:
  // If geoCode is available, use its coordinates.
  // Otherwise, form a query using the hotel name, cityName, and countryName.
  const handleShowHotelOnMap = (hotel: HotelDto | HotelOffersDto, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    let mapQuery = "";
    if (isHotelDto(hotel) && hotel.geoCode && hotel.geoCode.latitude !== 0 && hotel.geoCode.longitude !== 0) {
      mapQuery = `${hotel.geoCode.latitude},${hotel.geoCode.longitude}`;
    } else {
      // Fallback: use a combined query.
      mapQuery = `${hotel.name}, ${cityName}, ${countryName}`;
    }
    onShowHotelOnMap(mapQuery);
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderHotelDetails = (offer: HotelOffersDto) => (
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

  const renderHotels = () => {
    const hotelList = hotelOffers.length > 0 ? hotelOffers : hotels;
    return (
      <div className="hotels-list">
        {hotelList.map((hotel, index) => {
          const key = hotelOffers.length > 0
            ? index
            : (isHotelDto(hotel) ? hotel.hotelId : index);
          const offer = hotelOffers.length > 0 ? hotel as HotelOffersDto : null;
          return (
            <div key={key} className="hotel-item" onClick={() => toggleHotelDetails(index)}>
              <div className={`hotel-summary ${hotelOffers.length > 0 ? 'has-offers' : ''}`}>
                <div className="hotel-name">
                  {hotel.name ? toTitleCase(hotel.name) : 'Unknown Hotel'}
                </div>
                {hotelOffers.length > 0 ? (
                  <>
                    <button className="show-on-map-btn" onClick={(e) => { e.stopPropagation(); handleShowHotelOnMap(offer!, e); }}>
                      Show on Map
                    </button>
                    {offer && offer.totalPrice && offer.priceCurrency && (
                      <div className="hotel-price">{offer.priceCurrency} {offer.totalPrice}</div>
                    )}
                  </>
                ) : (
                  <button className="show-on-map-btn" onClick={(e) => { e.stopPropagation(); handleShowHotelOnMap(hotel, e); }}>
                    Show on Map
                  </button>
                )}
              </div>
              {expandedHotelIndex === index && (
                offer ? renderHotelDetails(offer) : (
                  <div className="hotel-details">
                    {isHotelDto(hotel) && hotel.iataCode && <p><strong>City:</strong> {hotel.iataCode}</p>}
                    {isHotelDto(hotel) && hotel.countryCode && <p><strong>Country:</strong> {hotel.countryCode}</p>}
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
