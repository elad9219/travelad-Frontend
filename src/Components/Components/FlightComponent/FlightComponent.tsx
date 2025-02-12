import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './FlightComponent.css';

const formatDateTime = (dateTime: string): string => {
  const date = new Date(dateTime);
  const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1)
    .toString().padStart(2, '0')}-${date.getFullYear()}`;
  const formattedTime = date.toTimeString().slice(0, 5);
  return `${formattedDate} ${formattedTime}`;
};

interface FlightSegment {
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
}

interface Flight {
  outboundSegments: FlightSegment[];
  returnSegments: FlightSegment[];
  price?: number;
}

interface FlightsComponentProps {
  city: string;
}

const FlightsComponent: React.FC<FlightsComponentProps> = ({ city }) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!city) return;
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
          params: {
            city,
            origin,
            departureDate: departDate,
            returnDate: returnDate,
            adults,
          },
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
  }, [city]);

  const toggleDetails = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Render a summary row for a leg (either outbound or return).
  const renderSummaryRow = (leg: FlightSegment[]): JSX.Element => {
    const origin = leg[0].origin;
    const destination = leg[leg.length - 1].destination;
    const stopsCount = leg.length - 1;
    const stopsText =
      stopsCount === 0 ? 'Direct Flight' : `${stopsCount} Stop${stopsCount > 1 ? 's' : ''}`;
    const stopsClass = stopsCount === 0 ? 'direct-flight' : 'with-stops';
    return (
      <div className="summary-row">
        <div className="summary-left">
          <span className="route">
            {origin} → {destination}
          </span>
          <span className={`stops ${stopsClass}`}> {stopsText}</span>
        </div>
        <div className="summary-center">{formatDateTime(leg[0].departureDate)}</div>
      </div>
    );
  };

  // Render detailed information for a leg.
  const renderLegDetails = (leg: FlightSegment[], label: string): JSX.Element => {
    return (
      <div className="leg-details">
        <h4>{label}</h4>
        {leg.map((seg, idx) => (
          <div key={idx} className="segment-detail">
            <p>
              {seg.origin} → {seg.destination}
            </p>
            <p>Departure: {formatDateTime(seg.departureDate)}</p>
            <p>Arrival: {formatDateTime(seg.arrivalDate)}</p>
          </div>
        ))}
      </div>
    );
  };

  // Render a single flight item.
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
                {renderSummaryRow(flight.outboundSegments)}
                {renderSummaryRow(flight.returnSegments)}
              </>
            ) : (
              renderSummaryRow(flight.outboundSegments)
            )}
          </div>
          <div className="flight-price">
            {flight.price ? `$${flight.price.toFixed(2)}` : 'N/A'}
          </div>
        </div>
        {expandedIndex === index && (
          <div className="flight-details">
            {isRoundTrip ? (
              <>
                {renderLegDetails(flight.outboundSegments, 'Outbound')}
                {renderLegDetails(flight.returnSegments, 'Return')}
              </>
            ) : (
              flight.outboundSegments.map((seg, idx) => (
                <div key={idx} className="segment-detail">
                  <p>
                    {seg.origin} → {seg.destination}
                  </p>
                  <p>Departure: {formatDateTime(seg.departureDate)}</p>
                  <p>Arrival: {formatDateTime(seg.arrivalDate)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flights-container">
      <h2 className="flights-title">✈ Flights</h2>
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
