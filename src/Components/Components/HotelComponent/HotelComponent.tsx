import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelComponent.css'; 
import { HotelDto } from '../../../modal/Hotel';
import globals from '../../../utils/globals';
import SkeletonCard from '../SkeletonCard/SkeletonCard'; // ייבוא השלד

interface HotelComponentProps {
  cityName: string;
  countryName: string;
  onShowHotelOnMap: (query: string) => void;
}

const decodeCityName = (name: string): string => {
  try {
    return decodeURIComponent(name);
  } catch (e) {
    return name;
  }
};

const toTitleCase = (str: string): string => {
  const decoded = decodeCityName(str);
  return decoded.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const HotelComponent: React.FC<HotelComponentProps> = ({ cityName, countryName, onShowHotelOnMap }) => {
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsFetchError, setHotelsFetchError] = useState<string | null>(null);
  const [expandedHotelIndex, setExpandedHotelIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [searchParams, setSearchParams] = useState({ 
      checkInDate: today, 
      checkOutDate: tomorrow, 
      adults: '1' 
  });

  const [appliedSearchParams, setAppliedSearchParams] = useState({ 
      checkInDate: today, 
      checkOutDate: tomorrow, 
      adults: '1' 
  });

  useEffect(() => {
    fetchHotels();
  }, [cityName]);

  const calculateNights = (checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const fetchHotels = async () => {
      setHotelsLoading(true);
      setHotelsFetchError(null);
      try {
        const response = await axios.get<HotelDto[]>(`${globals.api.hotels}`, {
            params: { 
                cityName: encodeURIComponent(cityName), 
                checkInDate: searchParams.checkInDate,
                checkOutDate: searchParams.checkOutDate,
                adults: searchParams.adults
            }
        });
        setHotels(response.data);
        setAppliedSearchParams({ ...searchParams });
      } catch (error) {
        setHotelsFetchError('Error loading hotels.');
      } finally {
        setHotelsLoading(false);
      }
  };

  const handleSearchParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'adults') {
        const cleanValue = value.replace(/\D/g, '');
        const numValue = parseInt(cleanValue);
        
        if (cleanValue === '') {
            setSearchParams(prev => ({ ...prev, adults: '' }));
            return;
        }
        
        if (numValue >= 1 && numValue <= 9) {
            setSearchParams(prev => ({ ...prev, adults: cleanValue }));
        }
        return;
    }

    setSearchParams(prev => {
        const next = { ...prev, [name]: value };
        if (name === 'checkInDate') {
            const minCheckout = new Date(new Date(value).getTime() + 86400000).toISOString().split('T')[0];
            if (next.checkOutDate <= value) {
                next.checkOutDate = minCheckout;
            }
        }
        return next;
    });
  };

  const handleShowHotelOnMap = (hotel: HotelDto, e: React.MouseEvent) => {
    e.stopPropagation();
    const decodedCity = decodeCityName(cityName);
    const isValid = (num?: number) => num !== undefined && num !== null && Math.abs(num) > 1;

    let query = "";
    if (isValid(hotel.latitude) && isValid(hotel.longitude)) {
        query = `${hotel.latitude},${hotel.longitude}`;
    } else {
        query = `${hotel.name}, ${decodedCity}`;
    }
    
    onShowHotelOnMap(query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nights = calculateNights(appliedSearchParams.checkInDate, appliedSearchParams.checkOutDate);
  const minCheckoutDate = searchParams.checkInDate 
    ? new Date(new Date(searchParams.checkInDate).getTime() + 86400000).toISOString().split('T')[0]
    : tomorrow;

  return (
    <div className="hotels-container">
      <div className="hotels-header">
        <h2 className="hotels-title">🏨 Hotels in {toTitleCase(cityName)}</h2>
        <button className="advanced-search-toggle" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
          {showAdvancedSearch ? 'Close Search' : 'Advanced Search'}
        </button>
      </div>

      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className="search-field">
            <label>Check-In:</label>
            <input type="date" name="checkInDate" min={today} value={searchParams.checkInDate} onChange={handleSearchParamsChange} />
          </div>
          <div className="search-field">
            <label>Check-Out:</label>
            <input type="date" name="checkOutDate" min={minCheckoutDate} value={searchParams.checkOutDate} onChange={handleSearchParamsChange} />
          </div>
          <div className="search-field">
            <label>Guests (1-9):</label>
            <input 
                type="number" 
                name="adults" 
                min="1" 
                max="9" 
                value={searchParams.adults} 
                onChange={handleSearchParamsChange} 
                onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
            />
          </div>
          <button className="advanced-search-btn" onClick={fetchHotels}>Search</button>
        </div>
      )}

      {hotelsLoading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', padding: '10px' }}>
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}
      
      {!hotelsLoading && hotels.length > 0 && (
        <div className="hotels-list">
          {hotels.map((hotel, index) => {
            const totalPrice = hotel.price || 0;

            return (
              <div key={index} className="hotel-item">
                <div 
                    className="hotel-summary has-offers" 
                    onClick={() => setExpandedHotelIndex(expandedHotelIndex === index ? null : index)}
                    style={{ cursor: 'pointer' }}
                >
                  <button className="show-on-map-btn" onClick={(e) => handleShowHotelOnMap(hotel, e)}>Show on Map</button>
                  <div className="hotel-name">{toTitleCase(hotel.name)}</div>
                  <div className="hotel-price">
                      {totalPrice > 0 ? `€${totalPrice.toFixed(0)}` : 'N/A'}
                      <div className="price-subtitle">
                        {nights} {nights === 1 ? 'night' : 'nights'}, {appliedSearchParams.adults} {parseInt(appliedSearchParams.adults) === 1 ? 'guest' : 'guests'}
                      </div>
                  </div>
                </div>
                {expandedHotelIndex === index && (
                  <div className="hotel-details" style={{ cursor: 'default' }}>
                      <p><strong>City:</strong> {decodeCityName(cityName).toUpperCase()}</p>
                      <p><strong>Dates:</strong> {formatDate(appliedSearchParams.checkInDate)} - {formatDate(appliedSearchParams.checkOutDate)} ({nights} nights)</p>
                      <p><strong>Guests:</strong> {appliedSearchParams.adults}</p>
                      <p><strong>Total Price:</strong> EUR {totalPrice.toFixed(2)}</p>
                      <p><strong>Total Price (Inc. Tax):</strong> EUR {(totalPrice * 1.15).toFixed(2)}</p>
                      <div style={{marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px'}}>
                        <p><strong>Room:</strong> Standard/Deluxe for {appliedSearchParams.adults} Guests</p>
                      </div>
                      <button 
                        className="book-now-btn" 
                        style={{
                            marginTop: '12px', 
                            backgroundColor: '#0077cc', 
                            color: 'white', 
                            border: 'none', 
                            padding: '8px 15px', 
                            borderRadius: '4px', 
                            cursor: 'pointer', 
                            width: '100%',
                            fontWeight: 'bold'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const hotelName = encodeURIComponent(hotel.name);
                          const city = encodeURIComponent(decodeCityName(cityName));
                          const bookingUrl = `https://www.booking.com/searchresults.html?ss=${hotelName}+${city}`;
                          window.open(bookingUrl, '_blank');
                        }}
                      >
                          Book on Booking.com
                      </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HotelComponent;