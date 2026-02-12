import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HotelComponent.css'; 
import { HotelDto } from '../../../modal/Hotel';
import globals from '../../../utils/globals';

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

// Original date formatter from your first version
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

  useEffect(() => {
    fetchHotels();
  }, [cityName]);

  const fetchHotels = async () => {
      setHotelsLoading(true);
      setHotelsFetchError(null);
      try {
        const response = await axios.get<HotelDto[]>(`${globals.api.hotels}`, {
            params: { cityName: encodeURIComponent(cityName), ...searchParams }
        });
        setHotels(response.data);
      } catch (error) {
        setHotelsFetchError('Error loading hotels.');
      } finally {
        setHotelsLoading(false);
      }
  };

  const handleSearchParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => {
        const next = { ...prev, [name]: value };
        if (name === 'checkInDate' && next.checkOutDate <= value) {
            next.checkOutDate = new Date(new Date(value).getTime() + 86400000).toISOString().split('T')[0];
        }
        return next;
    });
  };

  const handleShowHotelOnMap = (hotel: HotelDto, e: React.MouseEvent) => {
    e.stopPropagation();
    const decodedCity = decodeCityName(cityName);
    const query = hotel.latitude && hotel.longitude ? `${hotel.latitude},${hotel.longitude}` : `${hotel.name}, ${decodedCity}`;
    onShowHotelOnMap(query);
  };

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
            <input type="date" name="checkOutDate" min={searchParams.checkInDate} value={searchParams.checkOutDate} onChange={handleSearchParamsChange} />
          </div>
          <div className="search-field">
            <label>Guests:</label>
            <input type="number" name="adults" min="1" value={searchParams.adults} onChange={handleSearchParamsChange} />
          </div>
          <button className="advanced-search-btn" onClick={fetchHotels}>Search</button>
        </div>
      )}

      {hotelsLoading && <div className="loader">Loading...</div>}
      
      {!hotelsLoading && hotels.length > 0 && (
        <div className="hotels-list">
          {hotels.map((hotel, index) => (
            <div key={index} className="hotel-item" onClick={() => setExpandedHotelIndex(expandedHotelIndex === index ? null : index)}>
              <div className="hotel-summary has-offers">
                <button className="show-on-map-btn" onClick={(e) => handleShowHotelOnMap(hotel, e)}>Map</button>
                <div className="hotel-name">{toTitleCase(hotel.name)}</div>
                <div className="hotel-price">
                    {hotel.price ? `€${hotel.price.toFixed(0)}` : 'N/A'}
                </div>
              </div>
              {expandedHotelIndex === index && (
                <div className="hotel-details">
                    <p><strong>City:</strong> {decodeCityName(cityName).toUpperCase()}</p>
                    <p><strong>Check-In:</strong> {formatDate(searchParams.checkInDate)}</p>
                    <p><strong>Check-Out:</strong> {formatDate(searchParams.checkOutDate)}</p>
                    <p><strong>Base Price:</strong> EUR {hotel.price ? hotel.price.toFixed(2) : 'N/A'}</p>
                    <p><strong>Total Price:</strong> EUR {hotel.price ? (hotel.price * 1.15).toFixed(2) : 'N/A'} (Inc. Tax)</p>
                    <div style={{marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px'}}>
                      <p><strong>Room:</strong> Flexible Rate, Mock Room Description for {searchParams.adults} Guests</p>
                      <p><strong>Bed Type:</strong> KING/QUEEN</p>
                      <p><strong>Beds:</strong> 1</p>
                    </div>
                    <button className="book-now-btn" style={{marginTop: '12px', backgroundColor: '#0077cc', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', width: '100%'}}>
                        Book via Affiliate Link
                    </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotelComponent;