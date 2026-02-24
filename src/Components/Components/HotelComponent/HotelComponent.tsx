import React, { useState, useEffect } from 'react';
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

      {hotelsFetchError && <div className="error-message">{hotelsFetchError}</div>}

      {hotelsLoading && (
        <div className="hotels-grid">
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}
      
      {!hotelsLoading && hotels.length > 0 && (
        <div className="hotels-grid">
          {hotels.map((hotel, index) => {
            const totalPrice = hotel.price || 0;
            const isExpanded = expandedHotelIndex === index;
            
            // שאיבת הנתונים האמיתיים מהבקאנד במקום המערכים שהיו כאן!
            const rating = hotel.rating ? hotel.rating.toFixed(1) : '8.0';
            const imageUrl = hotel.imageUrl || 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg';

            return (
              <div key={index} className={`hotel-card ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedHotelIndex(isExpanded ? null : index)}>
                <div className="hotel-image-container">
                  <img src={imageUrl} alt={hotel.name} className="hotel-image" />
                  <div className="hotel-rating">⭐ {rating}</div>
                </div>
                
                <div className="hotel-card-content">
                  <div className="hotel-card-header">
                    <h3 className="hotel-name">{toTitleCase(hotel.name)}</h3>
                  </div>
                  
                  <div className="hotel-card-price-row">
                    <button className="show-on-map-btn" onClick={(e) => handleShowHotelOnMap(hotel, e)}>Show on Map</button>
                    <div className="hotel-price">
                        {totalPrice > 0 ? `€${totalPrice.toFixed(0)}` : 'N/A'}
                        <span className="price-subtitle">
                          {nights} {nights === 1 ? 'night' : 'nights'}
                        </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="hotel-details" onClick={(e) => e.stopPropagation()}>
                        <p><strong>City:</strong> {decodeCityName(cityName).toUpperCase()}</p>
                        <p><strong>Dates:</strong> {formatDate(appliedSearchParams.checkInDate)} - {formatDate(appliedSearchParams.checkOutDate)}</p>
                        <p><strong>Guests:</strong> {appliedSearchParams.adults}</p>
                        <p><strong>Total Price:</strong> EUR {totalPrice.toFixed(2)}</p>
                        <p><strong>Total (Inc. Tax):</strong> EUR {(totalPrice * 1.15).toFixed(2)}</p>
                        <div className="hotel-details-separator">
                          <p>Standard/Deluxe Room</p>
                        </div>
                        <button 
                          className="book-now-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            const hotelNameEncoded = encodeURIComponent(hotel.name);
                            const cityEncoded = encodeURIComponent(decodeCityName(cityName));
                            const bookingUrl = `https://www.booking.com/searchresults.html?ss=${hotelNameEncoded}+${cityEncoded}`;
                            window.open(bookingUrl, '_blank');
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