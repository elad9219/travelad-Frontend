import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './FlightComponent.css';
import { AdvancedSearchParams, Flight, FlightSegment, IataMapping } from '../../../modal/Flight';
import globals from '../../../utils/globals';

// ... (כל פונקציות העזר נשארות אותו דבר, חסכתי מקום כאן כדי לא להעמיס, תעתיק את הכל כרגיל, השינוי הוא רק ב-renderFlightItem למטה)

// Format a date-time string.
const formatDateTime = (dateTime: string): { date: string; time: string } => {
  const dateObj = new Date(dateTime);
  const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1)
    .toString().padStart(2, '0')}-${dateObj.getFullYear()}`;
  const formattedTime = dateObj.toTimeString().slice(0, 5);
  return { date: formattedDate, time: formattedTime };
};

// Convert ISO-8601 duration to "H:MMh" format.
const formatDuration = (duration?: string): string => {
  if (!duration) return 'N/A';
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return '0:00h';
  const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
  const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
  return `${hours}:${minutes.toString().padStart(2, '0')}h`;
};

// Calculate total duration from segments (fallback if duration is not provided).
const calculateTotalDuration = (segments: FlightSegment[]): string => {
  let totalMinutes = 0;
  segments.forEach(segment => {
    const match = segment.duration.match(/PT(\d+H)?(\d+M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
      const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
      totalMinutes += hours * 60 + minutes;
    }
  });
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${totalHours}:${remainingMinutes.toString().padStart(2, '0')}h`;
};

// Helper functions for sorting by duration
const parseDurationToMinutes = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
  const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
  return hours * 60 + minutes;
};

const calculateLegDurationInMinutes = (leg: FlightSegment[]): number => {
  let totalMinutes = 0;
  leg.forEach(segment => {
    const match = segment.duration.match(/PT(\d+H)?(\d+M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
      const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
      totalMinutes += hours * 60 + minutes;
    }
  });
  return totalMinutes;
};

const getLegDuration = (leg: FlightSegment[], duration?: string): number => {
  if (duration) {
    return parseDurationToMinutes(duration);
  } else {
    return calculateLegDurationInMinutes(leg);
  }
};

const getTotalDuration = (flight: Flight): number => {
  if (flight.returnSegments && flight.returnSegments.length > 0) {
    const outboundDuration = getLegDuration(flight.outboundSegments || [], flight.outboundDuration);
    const returnDuration = getLegDuration(flight.returnSegments, flight.returnDuration);
    return outboundDuration + returnDuration;
  } else {
    return getLegDuration(flight.segments || [], flight.outboundDuration);
  }
};

// Helper: Render carrier logo.
const renderCarrierLogo = (carrierCode: string, logoUrl?: string): JSX.Element => {
  if (logoUrl) {
    return <img src={logoUrl} alt={carrierCode} className="carrier-logo" />;
  }
  return <span className="carrier-code">{carrierCode.toUpperCase()}</span>;
};

const FlightsComponent: React.FC<{ city: string }> = ({ city }) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedParams, setAdvancedParams] = useState<AdvancedSearchParams>({
    origin: 'Tel Aviv',
    destination: '',
    departDate: '',
    returnDate: '',
    adults: '1',
    flightType: 'roundTrip',
  });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [adultCount, setAdultCount] = useState<number>(1);
  const [iataMapping, setIataMapping] = useState<IataMapping>({});
  const [directFlightsOnly, setDirectFlightsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | ''>('');
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // load IATA codes
  useEffect(() => {
    axios.get(globals.api.iataCodes)
      .then(res => {
        const mapping: IataMapping = {};
        res.data.forEach((entry: any) => {
          if (entry["AIRPORT CODE"] && entry["FULL NAME"]) {
            mapping[entry["AIRPORT CODE"].toUpperCase()] = entry["FULL NAME"];
          }
        });
        setIataMapping(mapping);
      })
      .catch(err => console.error('Error fetching IATA mapping:', err));
  }, []);

  // reset advanced mode on city change
  useEffect(() => {
    setAdvancedMode(false);
  }, [city]);

  // fetch regular flights
  useEffect(() => {
    if (!city || advancedMode) return;
    setLoading(true);
    setError('');
    setFlights([]);

    const departDateObj = new Date();
    departDateObj.setDate(departDateObj.getDate() + 10);
    const returnDateObj = new Date();
    returnDateObj.setDate(returnDateObj.getDate() + 15);

    axios.get<Flight[]>(globals.api.flights, {
      params: {
        city,
        origin: 'TLV',
        departureDate: departDateObj.toISOString().split('T')[0],
        returnDate: returnDateObj.toISOString().split('T')[0],
        adults: '1'
      },
      timeout: 30000
    })
      .then(res => {
        setFlights(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Error fetching flights:', err);
        setError(typeof err.response?.data === 'string' ? err.response.data : 'An error occurred while fetching flights.');
      })
      .finally(() => setLoading(false));
  }, [city, advancedMode]);

  const toggleDetails = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleAdvancedParamsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdvancedParams(prev => ({ ...prev, [name]: value }));
    setInvalidFields(prev => prev.filter(f => f !== name));
  };

  const handleFlightAdultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const num = parseInt(value, 10);
    if (value === '' || (Number.isInteger(num) && num >= 1 && num <= 9)) {
      setAdvancedParams(prev => ({ ...prev, adults: value }));
      setInvalidFields(prev => prev.filter(f => f !== 'adults'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['1','2','3','4','5','6','7','8','9','ArrowUp','ArrowDown','Backspace','Tab'];
    if (!allowed.includes(e.key)) e.preventDefault();
  };

  const handleBlur = () => {
    const num = parseInt(advancedParams.adults, 10);
    if (isNaN(num) || num < 1) setAdvancedParams(prev => ({ ...prev, adults: '1' }));
    else if (num > 9) setAdvancedParams(prev => ({ ...prev, adults: '9' }));
  };

  const validateForm = (): string[] => {
    const fields = advancedParams.flightType === 'roundTrip'
      ? ['origin','destination','departDate','returnDate']
      : ['origin','destination','departDate'];
    const invalid = fields.filter(f => !advancedParams[f as keyof AdvancedSearchParams].trim());
    if (!advancedParams.adults.trim()) invalid.push('adults');
    return invalid;
  };

  const handleAdvancedSearch = async () => {
    const inv = validateForm();
    if (inv.length) {
      setInvalidFields(inv);
      return;
    }
    setInvalidFields([]);
    setShowAdvancedSearch(false);
    setAdvancedMode(true);
    setLoading(true);

    const params = {
      origin: advancedParams.origin,
      destination: advancedParams.destination,
      departDate: advancedParams.departDate,
      returnDate: advancedParams.flightType === 'roundTrip' ? advancedParams.returnDate : '',
      adults: advancedParams.adults
    };

    try {
      const res = await axios.get<Flight[]>(globals.api.advancedFlights, { params });
      setFlights(Array.isArray(res.data) ? res.data : []);
      setAdultCount(parseInt(advancedParams.adults, 10) || 1);
    } catch (err: any) {
      console.error('Error fetching advanced flights:', err);
      setError(typeof err.response?.data === 'string' ? err.response.data : 'An error occurred while fetching flights.');
    } finally {
      setLoading(false);
      setAdvancedParams({
        origin: 'Tel Aviv',
        destination: '',
        departDate: '',
        returnDate: '',
        adults: '1',
        flightType: 'roundTrip'
      });
    }
  };

  const renderIataCode = (code: string): JSX.Element => {
    const full = iataMapping[code.toUpperCase()] || code;
    return <span className="iata-tooltip" title={full}>{code}</span>;
  };

  const renderSummaryRow = (leg: FlightSegment[], dur?: string): JSX.Element => {
    const origin = renderIataCode(leg[0].origin);
    const dest = renderIataCode(leg[leg.length - 1].destination);
    const stops = leg.length - 1;
    const duration = dur ? formatDuration(dur) : calculateTotalDuration(leg);
    const { date, time } = formatDateTime(leg[0].departureDate);
    return (
      <div className="summary-row">
        <div className="summary-left">
          <div className="carrier-logo-container">
            {leg[0].carrierCode && renderCarrierLogo(leg[0].carrierCode, leg[0].airlineLogoUrl)}
          </div>
          <div className="route-container">
            <div className="route">{origin} <span className="arrow">→</span> {dest}</div>
            <div className="details-container">
              <div className="duration">{duration}</div>
              <div className={`stops ${stops===0?'direct-flight':'with-stops'}`}>
                {stops===0?'Direct Flight':`${stops} Stop${stops>1?'s':''}`}
              </div>
            </div>
          </div>
        </div>
        <div className="summary-center">
          <span className="flight-time">{time}</span> {date}
        </div>
      </div>
    );
  };

  const renderLegDetails = (leg: FlightSegment[], label: string): JSX.Element => (
    <div className="leg-details">
      <h4>{label}</h4>
      {leg.map((seg, idx) => {
        const dep = formatDateTime(seg.departureDate);
        const arr = formatDateTime(seg.arrivalDate);
        return (
          <div key={idx} className="segment-detail">
            <div className="segment-route">
              <p><strong>{renderIataCode(seg.origin)} → {renderIataCode(seg.destination)}</strong></p>
              <p className="segment-duration">{formatDuration(seg.duration)}</p>
            </div>
            <p><strong>Departure:</strong> {dep.time} {dep.date} {seg.departureTerminal && `(Terminal ${seg.departureTerminal})`}</p>
            <p><strong>Arrival:</strong> {arr.time} {arr.date} {seg.arrivalTerminal && `(Terminal ${seg.arrivalTerminal})`}</p>
            <p><strong>Flight:</strong> {seg.carrierCode} {seg.flightNumber}</p>
            <p><strong>Aircraft:</strong> {seg.aircraftFullName}</p>
          </div>
        );
      })}
    </div>
  );

  const renderPrice = (flight: Flight): JSX.Element => {
    if (advancedMode && adultCount > 1 && flight.price !== undefined) {
      const per = flight.price / adultCount;
      return (
        <div className="flight-price">
          <div className="price-per-person"><span className="per-person">per person: </span>€{per.toFixed(2)}</div>
          <div className="total-price">Total: €{flight.price.toFixed(2)}</div>
        </div>
      );
    }
    return <div className="flight-price">{flight.price ? `€${flight.price.toFixed(2)}` : 'N/A'}</div>;
  };

  // --------------- שינוי עיקרי כאן: ה-onClick עבר ל-summary ----------------
  const renderFlightItem = (flight: Flight, idx: number): JSX.Element => {
    const isRound = !!flight.returnSegments?.length;
    return (
      <div key={idx} className={`flight-item ${isRound?'return-flight':''}`}>
        <div 
            className="flight-summary" 
            onClick={()=>toggleDetails(idx)}
            style={{ cursor: 'pointer' }}
        >
          <div className="flight-summary-details">
            {isRound
              ? <>
                  {renderSummaryRow(flight.outboundSegments!, flight.outboundDuration)}
                  {renderSummaryRow(flight.returnSegments!, flight.returnDuration)}
                </>
              : flight.segments && renderSummaryRow(flight.segments, flight.outboundDuration)
            }
          </div>
          {renderPrice(flight)}
        </div>
        {expandedIndex===idx && (
          <div className="flight-details" style={{ cursor: 'default' }}>
            {isRound
              ? <>
                  {renderLegDetails(flight.outboundSegments!, 'Outbound')}
                  {renderLegDetails(flight.returnSegments!, 'Return')}
                </>
              : flight.segments && renderLegDetails(flight.segments, 'Flight')
            }
          </div>
        )}
      </div>
    );
  };

  // apply filters & sorting
  const safeFlights = Array.isArray(flights) ? flights : [];
  const filteredFlights = directFlightsOnly
    ? safeFlights.filter(f => {
        if (f.returnSegments?.length) {
          return f.outboundSegments!.length===1 && f.returnSegments!.length===1;
        } else {
          return f.segments!.length===1;
        }
      })
    : safeFlights;
  const sortedFlights = sortBy==='price'
    ? [...filteredFlights].sort((a,b)=>(a.price||0)-(b.price||0))
    : sortBy==='duration'
      ? [...filteredFlights].sort((a,b)=>getTotalDuration(a)-getTotalDuration(b))
      : filteredFlights;

  const renderErrorMessage = () => {
    if (error) return <p className="error-message">{error}</p>;
    if (!loading && sortedFlights.length===0) return <p className="no-flights-message">No flights found.</p>;
    return null;
  };

  return (
    <div className="flights-container">
      <div className="flights-header">
        <h2 className="flights-title">✈ Flights</h2>
        <div className="header-controls">
          <button
            className={`direct-flights-btn ${directFlightsOnly?'checked':''}`}
            onClick={()=>setDirectFlightsOnly(d=>!d)}
          >Direct Flights Only</button>
          <button
            className="advanced-search-toggle"
            onClick={()=>setShowAdvancedSearch(s=>!s)}
          >Advanced Search</button>
        </div>
        <div className="sort-controls">
          <label>
            <input type="radio" name="sort" value="price" checked={sortBy==='price'} onChange={()=>setSortBy('price')} />
            Show Lowest Price
          </label>
          <label>
            <input type="radio" name="sort" value="duration" checked={sortBy==='duration'} onChange={()=>setSortBy('duration')} />
            Show Fastest Flights
          </label>
        </div>
      </div>

      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className={`search-field ${invalidFields.includes('origin')?'invalid':''}`}>
            <label>Origin:</label>
            <input type="text" name="origin" value={advancedParams.origin} onChange={handleAdvancedParamsChange} />
          </div>
          <div className={`search-field ${invalidFields.includes('destination')?'invalid':''}`}>
            <label>Destination:</label>
            <input type="text" name="destination" value={advancedParams.destination} onChange={handleAdvancedParamsChange} />
          </div>
          <div className={`search-field ${invalidFields.includes('departDate')?'invalid':''}`}>
            <label>Depart Date:</label>
            <input type="date" name="departDate" value={advancedParams.departDate} onChange={handleAdvancedParamsChange} />
          </div>
          {advancedParams.flightType==='roundTrip' && (
            <div className={`search-field ${invalidFields.includes('returnDate')?'invalid':''}`}>
              <label>Return Date:</label>
              <input type="date" name="returnDate" value={advancedParams.returnDate} onChange={handleAdvancedParamsChange} min={advancedParams.departDate ? advancedParams.departDate : new Date().toISOString().split('T')[0]} />
            </div>
          )}
          <div className={`search-field ${invalidFields.includes('adults')?'invalid':''}`}>
            <label>Adults:</label>
            <input type="number" name="adults" min="1" max="9" value={advancedParams.adults}
                    onChange={handleFlightAdultsChange} onKeyDown={handleKeyDown} onBlur={handleBlur} />
          </div>
          <div className="search-field radio-field">
            <label>
              <input type="radio" name="flightType" value="roundTrip"
                      checked={advancedParams.flightType==='roundTrip'}
                      onChange={handleAdvancedParamsChange} />
                Round Trip
              </label>
              <label style={{marginLeft:'10px'}}>
                <input type="radio" name="flightType" value="oneWay"
                      checked={advancedParams.flightType==='oneWay'}
                      onChange={handleAdvancedParamsChange} />
              One-Way
            </label>
          </div>
          <button className="advanced-search-btn" onClick={handleAdvancedSearch}>Search</button>
        </div>
      )}

      {loading ? <Loader /> : renderErrorMessage()}
      {!loading && sortedFlights.map((f,i)=>renderFlightItem(f,i))}
    </div>
  );
};

export default FlightsComponent;