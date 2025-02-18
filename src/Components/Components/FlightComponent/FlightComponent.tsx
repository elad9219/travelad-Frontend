import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './FlightComponent.css';

const formatDateTime = (dateTime: string): { date: string; time: string } => {
  const dateObj = new Date(dateTime);
  const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1)
    .toString().padStart(2, '0')}-${dateObj.getFullYear()}`;
  const formattedTime = dateObj.toTimeString().slice(0, 5);
  return { date: formattedDate, time: formattedTime };
};

interface FlightSegment {
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
}

interface Flight {
  segments?: FlightSegment[];
  outboundSegments?: FlightSegment[];
  returnSegments?: FlightSegment[];
  price?: number;
}

interface FlightsComponentProps {
  city: string;
}

interface AdvancedSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  adults: string;
  flightType: 'roundTrip' | 'oneWay';
}

// Mapping: key = AIRPORT CODE, value = FULL NAME
interface IataMapping {
  [iataCode: string]: string;
}

const FlightsComponent: React.FC<FlightsComponentProps> = ({ city }) => {
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
    flightType: 'roundTrip'
  });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [iataMapping, setIataMapping] = useState<IataMapping>({});

  // Load IATA mapping from backend on mount.
  useEffect(() => {
    const fetchIataMapping = async () => {
      try {
        const response = await axios.get('http://localhost:8080/iata-codes');
        const mapping: IataMapping = {};
        // Build mapping: key = AIRPORT CODE, value = FULL NAME.
        response.data.forEach((entry: any) => {
          if (entry["AIRPORT CODE"] && entry["FULL NAME"]) {
            mapping[entry["AIRPORT CODE"].toUpperCase()] = entry["FULL NAME"];
          }
        });
        setIataMapping(mapping);
        console.log("IATA Mapping:", mapping);
      } catch (err) {
        console.error('Error fetching IATA mapping:', err);
      }
    };
    fetchIataMapping();
  }, []);

  useEffect(() => {
    setAdvancedMode(false);
  }, [city]);

  // Default search.
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
      } catch (err) {
        console.error('Error fetching flights:', err);
        setError('An error occurred while fetching flights.');
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, [city, advancedMode]);

  const toggleDetails = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Generic handler for text/select inputs.
  const handleAdvancedParamsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdvancedParams(prev => ({ ...prev, [name]: value }));
  };

  // New handler for "adults" that allows only a single digit between 1 and 9.
  const handleAdultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Allow empty value (to let the user delete) or a single digit between 1 and 9.
    if (value === '' || /^[1-9]$/.test(value)) {
      setAdvancedParams(prev => ({ ...prev, adults: value }));
    }
  };

  const handleAdvancedSearch = async () => {
    setShowAdvancedSearch(false);
    setAdvancedMode(true);
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
      const response = await axios.get('http://localhost:8080/flights/advancedFlightSearch', { params });
      setFlights(response.data || []);
    } catch (err) {
      console.error('Error fetching advanced flights:', err);
      setError('An error occurred while fetching flights.');
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

  // Helper: Render IATA code with tooltip.
  const renderIataCode = (code: string): JSX.Element => {
    const key = code.trim().toUpperCase();
    const fullName = iataMapping[key] || code;
    console.log("Rendering IATA Code:", key, "->", fullName);
    return <span className="iata-tooltip" title={fullName}>{code}</span>;
  };

  const renderSummaryRow = (leg: FlightSegment[]): JSX.Element => {
    const origin = renderIataCode(leg[0].origin);
    const destination = renderIataCode(leg[leg.length - 1].destination);
    const stopsCount = leg.length - 1;
    const stopsText = stopsCount === 0 ? 'Direct Flight' : `${stopsCount} Stop${stopsCount > 1 ? 's' : ''}`;
    const stopsClass = stopsCount === 0 ? 'direct-flight' : 'with-stops';
    const { date, time } = formatDateTime(leg[0].departureDate);
    return (
      <div className="summary-row">
        <div className="summary-left">
          <span className="route">{origin} → {destination}</span>
          <span className={`stops ${stopsClass}`}> {stopsText}</span>
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
              <p>{renderIataCode(seg.origin)} → {renderIataCode(seg.destination)}</p>
              <p>Departure: {departure.time} {departure.date}</p>
              <p>Arrival: {arrival.time} {arrival.date}</p>
            </div>
          );
        })}
      </div>
    );
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
                {renderSummaryRow(flight.outboundSegments!)}
                {renderSummaryRow(flight.returnSegments!)}
              </>
            ) : (
              flight.segments && renderSummaryRow(flight.segments)
            )}
          </div>
          <div className="flight-price">{flight.price ? `$${flight.price.toFixed(2)}` : 'N/A'}</div>
        </div>
        {expandedIndex === index && (
          <div className="flight-details">
            {isRoundTrip ? (
              <>
                {renderLegDetails(flight.outboundSegments!, 'Outbound')}
                {renderLegDetails(flight.returnSegments!, 'Return')}
              </>
            ) : (
              flight.segments && flight.segments.map((seg, idx) => {
                const departure = formatDateTime(seg.departureDate);
                const arrival = formatDateTime(seg.arrivalDate);
                return (
                  <div key={idx} className="segment-detail">
                    <p>{renderIataCode(seg.origin)} → {renderIataCode(seg.destination)}</p>
                    <p>Departure: {departure.time} {departure.date}</p>
                    <p>Arrival: {arrival.time} {arrival.date}</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flights-container">
      <div className="flights-header">
        <h2 className="flights-title">✈ Flights</h2>
        <button
          className="advanced-search-toggle"
          onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
        >
          Advanced Search
        </button>
      </div>
      {showAdvancedSearch && (
        <div className="advanced-search-form">
          <div className="search-field">
            <label>Origin:</label>
            <input
              type="text"
              name="origin"
              value={advancedParams.origin}
              onChange={handleAdvancedParamsChange}
              placeholder="Origin (default Tel Aviv)"
            />
          </div>
          <div className="search-field">
            <label>Destination:</label>
            <input
              type="text"
              name="destination"
              value={advancedParams.destination}
              onChange={handleAdvancedParamsChange}
              placeholder="Destination"
            />
          </div>
          <div className="search-field">
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
            <div className="search-field">
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
          <div className="search-field">
            <label>Adults:</label>
            <input
              type="number"
              name="adults"
              value={advancedParams.adults}
              onChange={handleAdultsChange}
              style={{ maxWidth: '80px' }}
              min="1"
              max="9"
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
          <button className="advanced-search-btn" onClick={handleAdvancedSearch}>
            Search
          </button>
        </div>
      )}
      {loading && <Loader />}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && flights.length === 0 && (
        <p className="no-flights-message">No flights found.</p>
      )}
      {!loading && !error && flights.map((flight, index) => renderFlightItem(flight, index))}
    </div>
  );
};

export default FlightsComponent;
