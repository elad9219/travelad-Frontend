import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './FlightComponent.css';
import { AdvancedSearchParams, Flight, FlightSegment, IataMapping } from '../../../modal/Flight';

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

  useEffect(() => {
    const fetchIataMapping = async () => {
      try {
        const response = await axios.get('http://localhost:8080/iata-codes');
        const mapping: IataMapping = {};
        response.data.forEach((entry: any) => {
          if (entry["AIRPORT CODE"] && entry["FULL NAME"]) {
            mapping[entry["AIRPORT CODE"].toUpperCase()] = entry["FULL NAME"];
          }
        });
        setIataMapping(mapping);
      } catch (err: any) {
        console.error('Error fetching IATA mapping:', err);
      }
    };
    fetchIataMapping();
  }, []);

  useEffect(() => {
    setAdvancedMode(false);
  }, [city]);

  useEffect(() => {
    if (!city) return;
    if (advancedMode) return;
    const fetchFlights = async () => {
      setLoading(true);
      setError('');
      setFlights([]);
      try {
        const origin = 'TLV';
        const departDateObj = new Date();
        departDateObj.setDate(departDateObj.getDate() + 10);
        const returnDateObj = new Date();
        returnDateObj.setDate(returnDateObj.getDate() + 15);
        const adults = '1';
        const departDate = departDateObj.toISOString().split('T')[0];
        const returnDate = returnDateObj.toISOString().split('T')[0];
        const response = await axios.get('http://localhost:8080/flights', {
          params: { city, origin, departureDate: departDate, returnDate, adults },
        });
        setFlights(response.data || []);
      } catch (err: any) {
        console.error('Error fetching flights:', err);
        if (err.response && err.response.data && typeof err.response.data === 'string') {
          setError(err.response.data);
        } else {
          setError('An error occurred while fetching flights.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, [city, advancedMode]);

  const toggleDetails = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleAdvancedParamsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAdvancedParams(prev => ({ ...prev, [name]: value }));
    if (invalidFields.includes(name)) {
      setInvalidFields(prev => prev.filter(field => field !== name));
    }
  };

  const handleFlightAdultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value, 10);
    if (value === '' || (Number.isInteger(numValue) && numValue >= 1 && numValue <= 9)) {
      setAdvancedParams(prev => ({ ...prev, adults: value }));
      if (invalidFields.includes('adults')) {
        setInvalidFields(prev => prev.filter(field => field !== 'adults'));
      }
    } else {
      setAdvancedParams(prev => ({
        ...prev,
        adults: numValue < 1 ? '1' : '9'
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'ArrowUp', 'ArrowDown', 'Backspace', 'Tab'
    ];
    if (!allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleBlur = () => {
    const numValue = parseInt(advancedParams.adults, 10);
    if (isNaN(numValue) || numValue < 1) {
      setAdvancedParams(prev => ({ ...prev, adults: '1' }));
    } else if (numValue > 9) {
      setAdvancedParams(prev => ({ ...prev, adults: '9' }));
    }
  };

  const validateForm = (): string[] => {
    const { origin, destination, departDate, returnDate, adults, flightType } = advancedParams;
    const adultsNum = parseInt(adults, 10);
    const isAdultsValid = adults.trim() !== '' && !isNaN(adultsNum) && adultsNum >= 1 && adultsNum <= 9;

    const requiredFields = flightType === 'roundTrip'
      ? ['origin', 'destination', 'departDate', 'returnDate']
      : ['origin', 'destination', 'departDate'];

    const invalid: string[] = requiredFields.filter(field => !advancedParams[field as keyof AdvancedSearchParams].trim());
    if (!isAdultsValid) invalid.push('adults');

    return invalid;
  };

  const handleAdvancedSearch = async () => {
    const invalid = validateForm();
    if (invalid.length > 0) {
      setInvalidFields(invalid);
      return;
    }
    setInvalidFields([]);
    setShowAdvancedSearch(false);
    setAdvancedMode(true);
    const count = parseInt(advancedParams.adults, 10) || 1;
    setAdultCount(count);
    const params = {
      origin: advancedParams.origin,
      destination: advancedParams.destination,
      departDate: advancedParams.departDate,
      returnDate: advancedParams.flightType === 'roundTrip' ? advancedParams.returnDate : '',
      adults: advancedParams.adults,
    };
    setLoading(true);
    setError('');
    setFlights([]);
    try {
      const response = await axios.get('http://localhost:8080/flights/advancedFlightSearch', {
        params,
      });
      setFlights(response.data || []);
    } catch (err: any) {
      console.error('Error fetching advanced flights:', err);
      if (err.response && err.response.data && typeof err.response.data === 'string') {
        setError(err.response.data);
      } else {
        setError('An error occurred while fetching flights.');
      }
    } finally {
      setLoading(false);
      setAdvancedParams({
        origin: 'Tel Aviv',
        destination: '',
        departDate: '',
        returnDate: '',
        adults: '1',
        flightType: 'roundTrip',
      });
    }
  };

  const renderIataCode = (code: string): JSX.Element => {
    const key = code.trim().toUpperCase();
    const fullName = iataMapping[key] || code;
    return <span className="iata-tooltip" title={fullName}>{code}</span>;
  };

  const renderSummaryRow = (
    leg: FlightSegment[],
    itineraryDuration?: string
  ): JSX.Element => {
    const origin = renderIataCode(leg[0].origin);
    const destination = renderIataCode(leg[leg.length - 1].destination);
    const stopsCount = leg.length - 1;
    const stopsText = stopsCount === 0 ? 'Direct Flight' : `${stopsCount} Stop${stopsCount > 1 ? 's' : ''}`;
    const legDuration = itineraryDuration ? formatDuration(itineraryDuration) : calculateTotalDuration(leg);
    const { date, time } = formatDateTime(leg[0].departureDate);
    return (
      <div className="summary-row">
        <div className="summary-left">
          <div className="carrier-logo-container">
            {leg[0].carrierCode && renderCarrierLogo(leg[0].carrierCode, leg[0].airlineLogoUrl)}
          </div>
          <div className="route-container">
            <div className="route">
              {origin} <span className="arrow">→</span> {destination}
            </div>
            <div className="details-container">
              <div className="duration">{legDuration}</div>
              <div className={`stops ${stopsCount === 0 ? 'direct-flight' : 'with-stops'}`}>
                {stopsText}
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

  const renderLegDetails = (leg: FlightSegment[], label: string): JSX.Element => {
    return (
      <div className="leg-details">
        <h4>{label}</h4>
        {leg.map((seg, idx) => {
          const departure = formatDateTime(seg.departureDate);
          const arrival = formatDateTime(seg.arrivalDate);
          return (
            <div key={idx} className="segment-detail">
              <div className="segment-route">
                <p>
                  <strong>
                    {renderIataCode(seg.origin)} → {renderIataCode(seg.destination)}
                  </strong>
                </p>
                <p className="segment-duration">{formatDuration(seg.duration)}</p>
              </div>
              <p>
                <strong>Departure:</strong> {departure.time} {departure.date}{' '}
                {seg.departureTerminal && `(Terminal ${seg.departureTerminal})`}
              </p>
              <p>
                <strong>Arrival:</strong> {arrival.time} {arrival.date}{' '}
                {seg.arrivalTerminal && `(Terminal ${seg.arrivalTerminal})`}
              </p>
              <p>
                <strong>Flight:</strong> {seg.carrierCode} {seg.flightNumber}
              </p>
              <p>
                <strong>Aircraft:</strong> {seg.aircraftFullName}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPrice = (flight: Flight): JSX.Element => {
    if (advancedMode && adultCount > 1 && flight.price !== undefined) {
      const perPerson = flight.price / adultCount;
      return (
        <div className="flight-price">
          <div className="price-per-person">
            <span className="per-person">per person: </span>€{perPerson.toFixed(2)}
          </div>
          <div className="total-price">Total: €{flight.price.toFixed(2)}</div>
        </div>
      );
    } else {
      return (
        <div className="flight-price">
          {flight.price ? `€${flight.price.toFixed(2)}` : 'N/A'}
        </div>
      );
    }
  };

  const renderFlightItem = (flight: Flight, index: number): JSX.Element => {
    const isRoundTrip = flight.returnSegments && flight.returnSegments.length > 0;
    return (
      <div
        key={index}
        className={`flight-item ${isRoundTrip ? 'return-flight' : ''}`}
        onClick={() => toggleDetails(index)}
      >
        <div className="flight-summary">
          <div className="flight-summary-details">
            {isRoundTrip ? (
              <>
                {renderSummaryRow(flight.outboundSegments!, flight.outboundDuration)}
                {renderSummaryRow(flight.returnSegments!, flight.returnDuration)}
              </>
            ) : (
              flight.segments && renderSummaryRow(flight.segments, flight.outboundDuration)
            )}
          </div>
          {renderPrice(flight)}
        </div>
        {expandedIndex === index && (
          <div className="flight-details">
            {isRoundTrip ? (
              <>
                {renderLegDetails(flight.outboundSegments!, 'Outbound')}
                {renderLegDetails(flight.returnSegments!, 'Return')}
              </>
            ) : (
              flight.segments && renderLegDetails(flight.segments, 'Flight')
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredFlights = directFlightsOnly
    ? flights.filter(flight => {
        if (flight.returnSegments && flight.returnSegments.length > 0 && flight.outboundSegments) {
          return flight.outboundSegments.length === 1 || flight.returnSegments.length === 1;
        } else if (flight.segments) {
          return flight.segments.length === 1;
        }
        return false;
      })
    : flights;

  const sortedFlights = sortBy
    ? [...filteredFlights].sort((a, b) => {
        if (sortBy === 'price') {
          return (a.price || Infinity) - (b.price || Infinity);
        } else if (sortBy === 'duration') {
          return getTotalDuration(a) - getTotalDuration(b);
        }
        return 0;
      })
    : filteredFlights;

  return (
    <div className="flights-container">
      <div className="flights-header">
        <h2 className="flights-title">✈ Flights</h2>
        <div className="header-controls">
          <button
            className={`direct-flights-btn ${directFlightsOnly ? 'checked' : ''}`}
            onClick={() => setDirectFlightsOnly(prev => !prev)}
          >
            Direct Flights Only
          </button>
          <button
            className="advanced-search-toggle"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            Advanced Search
          </button>
        </div>
        <div className="sort-controls">
          <label>
            <input
              type="radio"
              name="sort"
              value="price"
              checked={sortBy === 'price'}
              onChange={() => setSortBy('price')}
            />
            Show Lowest Price
          </label>
          <label>
            <input
              type="radio"
              name="sort"
              value="duration"
              checked={sortBy === 'duration'}
              onChange={() => setSortBy('duration')}
            />
            Show Fastest Flights
          </label>
        </div>
      </div>
      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className={`search-field ${invalidFields.includes('origin') ? 'invalid' : ''}`}>
            <label>Origin:</label>
            <input
              type="text"
              name="origin"
              value={advancedParams.origin}
              onChange={handleAdvancedParamsChange}
              placeholder="Origin (default Tel Aviv)"
            />
          </div>
          <div className={`search-field ${invalidFields.includes('destination') ? 'invalid' : ''}`}>
            <label>Destination:</label>
            <input
              type="text"
              name="destination"
              value={advancedParams.destination}
              onChange={handleAdvancedParamsChange}
              placeholder="Destination"
            />
          </div>
          <div className={`search-field ${invalidFields.includes('departDate') ? 'invalid' : ''}`}>
            <label>Depart Date:</label>
            <input
              type="date"
              name="departDate"
              value={advancedParams.departDate}
              onChange={handleAdvancedParamsChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          {advancedParams.flightType === 'roundTrip' && (
            <div className={`search-field ${invalidFields.includes('returnDate') ? 'invalid' : ''}`}>
              <label>Return Date:</label>
              <input
                type="date"
                name="returnDate"
                value={advancedParams.returnDate}
                onChange={handleAdvancedParamsChange}
                min={advancedParams.departDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
          <div className={`search-field ${invalidFields.includes('adults') ? 'invalid' : ''}`}>
            <label>Adults:</label>
            <input
              type="number"
              name="adults"
              value={advancedParams.adults}
              onChange={handleFlightAdultsChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{ maxWidth: '80px' }}
              min="1"
              max="9"
              step="1"
            />
          </div>
          <div className="search-field radio-field">
            <label>Flight Type:</label>
            <div>
              <label>
                <input
                  type="radio"
                  name="flightType"
                  value="roundTrip"
                  checked={advancedParams.flightType === 'roundTrip'}
                  onChange={handleAdvancedParamsChange}
                />
                Round Trip
              </label>
              <label style={{ marginLeft: '10px' }}>
                <input
                  type="radio"
                  name="flightType"
                  value="oneWay"
                  checked={advancedParams.flightType === 'oneWay'}
                  onChange={handleAdvancedParamsChange}
                />
                One-Way
              </label>
            </div>
          </div>
          <button
            className="advanced-search-btn"
            onClick={handleAdvancedSearch}
          >
            Search
          </button>
        </div>
      )}
      {loading && <Loader />}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && filteredFlights.length === 0 && (
        flights.length === 0 ? (
          <p className="no-flights-message">No flights found.</p>
        ) : (
          <p className="no-flights-message">No direct flights found.</p>
        )
      )}
      {!loading && !error && sortedFlights.map((flight, index) => renderFlightItem(flight, index))}
    </div>
  );
};

export default FlightsComponent;