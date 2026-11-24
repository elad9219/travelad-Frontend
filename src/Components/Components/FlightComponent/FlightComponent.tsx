import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './FlightComponent.css';
import {
  AdvancedSearchParams,
  Flight,
  FlightSegment,
  IataMapping,
} from '../../../modal/Flight';
import globals from '../../../utils/globals';

const formatDateTime = (
  dateTime: string
): { date: string; time: string } => {
  const dateObj = new Date(dateTime);
  const formattedDate = `${dateObj
    .getDate()
    .toString()
    .padStart(2, '0')}-${(dateObj.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${dateObj.getFullYear()}`;

  const formattedTime = dateObj.toTimeString().slice(0, 5);

  return { date: formattedDate, time: formattedTime };
};

const formatDuration = (duration?: string): string => {
  if (!duration) return 'N/A';

  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return '0:00h';

  const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
  const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;

  return `${hours}:${minutes.toString().padStart(2, '0')}h`;
};

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

const getLegDuration = (
  leg: FlightSegment[],
  duration?: string
): number => {
  return duration
    ? parseDurationToMinutes(duration)
    : calculateLegDurationInMinutes(leg);
};

const getTotalDuration = (flight: Flight): number => {
  if (flight.returnSegments && flight.returnSegments.length > 0) {
    const outboundDuration = getLegDuration(
      flight.outboundSegments || [],
      flight.outboundDuration
    );

    const returnDuration = getLegDuration(
      flight.returnSegments,
      flight.returnDuration
    );

    return outboundDuration + returnDuration;
  }

  return getLegDuration(flight.segments || [], flight.outboundDuration);
};

const renderCarrierLogo = (
  carrierCode: string,
  logoUrl?: string
): JSX.Element => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={carrierCode}
        className="carrier-logo"
      />
    );
  }

  return (
    <span className="carrier-code">
      {carrierCode.toUpperCase()}
    </span>
  );
};

interface FlightSearch {
  url: string;
  params: Record<string, string>;
  advanced: boolean;
  adults: number;
}

const localDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

const defaultAdvancedParams = (city: string): AdvancedSearchParams => {
  const departure = new Date();
  departure.setDate(departure.getDate() + 10);
  const returning = new Date(departure);
  returning.setDate(returning.getDate() + 5);

  return {
    origin: 'Tel Aviv',
    destination: city.trim(),
    departDate: localDate(departure),
    returnDate: localDate(returning),
    adults: '1',
    flightType: 'roundTrip',
  };
};

const validDate = (value: string): boolean => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const validLeg = (value: unknown): value is FlightSegment[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    segment =>
      segment &&
      typeof segment.origin === 'string' &&
      segment.origin.length > 0 &&
      typeof segment.destination === 'string' &&
      segment.destination.length > 0 &&
      typeof segment.duration === 'string' &&
      [
        'carrierCode',
        'flightNumber',
        'aircraft',
        'aircraftFullName',
        'departureTerminal',
        'arrivalTerminal',
        'airlineLogoUrl',
      ].every(
        field =>
          segment[field] == null ||
          typeof segment[field] === 'string'
      ) &&
      typeof segment.departureDate === 'string' &&
      Number.isFinite(Date.parse(segment.departureDate)) &&
      typeof segment.arrivalDate === 'string' &&
      Number.isFinite(Date.parse(segment.arrivalDate))
  );

const readFlights = (data: unknown): Flight[] => {
  // Compatibility with the public backend until its pending Docker replacement.
  if (data === 'No IATA code found for the specified city.') return [];

  if (!Array.isArray(data)) {
    throw new Error('Invalid flight response');
  }

  return data.map(flight => {
    if (!flight || typeof flight !== 'object') {
      throw new Error('Invalid flight');
    }

    const outbound = flight.outboundSegments?.length
      ? flight.outboundSegments
      : flight.segments;

    const returning = flight.returnSegments;

    if (
      !validLeg(outbound) ||
      (flight.outboundDuration != null &&
        typeof flight.outboundDuration !== 'string') ||
      (flight.returnDuration != null &&
        typeof flight.returnDuration !== 'string') ||
      (returning != null &&
        (!Array.isArray(returning) ||
          (returning.length > 0 && !validLeg(returning)))) ||
      (flight.price !== undefined &&
        (typeof flight.price !== 'number' ||
          !Number.isFinite(flight.price) ||
          flight.price < 0))
    ) {
      throw new Error('Invalid flight');
    }

    return {
      ...flight,
      segments: outbound,
      outboundSegments: outbound,
      returnSegments: returning || [],
    };
  });
};

const FlightsComponent: React.FC<{ city: string }> = ({ city }) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedParams, setAdvancedParams] =
    useState<AdvancedSearchParams>(() => defaultAdvancedParams(city));

  const [advancedMode, setAdvancedMode] = useState(false);
  const [adultCount, setAdultCount] = useState(1);
  const [iataMapping, setIataMapping] = useState<IataMapping>({});
  const [directFlightsOnly, setDirectFlightsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | ''>('');
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const formId = useId();
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const lastSearch = useRef<FlightSearch | null>(null);

  const loadFlights = useCallback((search: FlightSearch) => {
    const id = ++requestId.current;

    requestController.current?.abort();

    const controller = new AbortController();
    requestController.current = controller;
    lastSearch.current = search;

    setLoading(true);
    setError('');
    setFlights([]);
    setExpandedIndex(null);
    setAdvancedMode(search.advanced);
    setAdultCount(search.adults);

    // A discarded Strict Mode effect must not dispatch a request.
    Promise.resolve().then(async () => {
      if (id !== requestId.current) return;

      try {
        const response = await axios.get<unknown>(search.url, {
          params: search.params,
          signal: controller.signal,
          timeout: 30000,
        });

        if (id !== requestId.current) return;

        setFlights(readFlights(response.data));
      } catch (failure: any) {
        if (id !== requestId.current) return;

        setError(
          failure?.response?.status === 400
            ? 'Check the cities, dates and number of passengers, then try again.'
            : 'Unable to load flights. Please try again.'
        );

        if (search.advanced) setShowAdvancedSearch(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.resolve().then(async () => {
      if (!active) return;

      try {
        const response = await axios.get(globals.api.iataCodes, {
          signal: controller.signal,
          timeout: 10000,
        });

        if (!active) return;

        const mapping: IataMapping = {};

        if (Array.isArray(response.data)) {
          response.data.forEach(entry => {
            if (
              typeof entry?.['AIRPORT CODE'] === 'string' &&
              typeof entry?.['FULL NAME'] === 'string'
            ) {
              mapping[entry['AIRPORT CODE'].toUpperCase()] =
                entry['FULL NAME'];
            }
          });
        }

        setIataMapping(mapping);
      } catch {
        // Airport codes remain usable when optional tooltip metadata is unavailable.
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const defaults = defaultAdvancedParams(city);
    setAdvancedParams(defaults);
    setInvalidFields([]);
    setShowAdvancedSearch(false);

    if (city.trim()) {
      loadFlights({
        url: globals.api.flights,
        advanced: false,
        adults: 1,
        params: {
          city: city.trim(),
          origin: 'TLV',
          departureDate: defaults.departDate,
          returnDate: defaults.returnDate,
          adults: defaults.adults,
        },
      });
    } else {
      lastSearch.current = null;
      setFlights([]);
      setError('');
      setLoading(false);
      setExpandedIndex(null);
      setAdvancedMode(false);
      setAdultCount(1);
    }

    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [city, loadFlights]);

  const toggleDetails = (index: number) => {
    setExpandedIndex(previous => (previous === index ? null : index));
  };

  const handleAdvancedParamsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setAdvancedParams(previous => ({ ...previous, [name]: value }));
    setInvalidFields(previous => previous.filter(field => field !== name));
  };

  const handleFlightAdultsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (value === '' || /^[1-9]$/.test(value)) {
      setAdvancedParams(previous => ({ ...previous, adults: value }));
      setInvalidFields(previous =>
        previous.filter(field => field !== 'adults')
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ['e', 'E', '+', '-', '.'].includes(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
    }
  };

  const handleBlur = () => {
    if (!/^[1-9]$/.test(advancedParams.adults)) {
      setAdvancedParams(previous => ({ ...previous, adults: '1' }));
    }
  };

  const validateForm = (): string[] => {
    const invalid: string[] = [];

    if (!advancedParams.origin.trim()) invalid.push('origin');
    if (!advancedParams.destination.trim()) invalid.push('destination');

    if (
      advancedParams.origin.trim().toLowerCase() ===
      advancedParams.destination.trim().toLowerCase()
    ) {
      invalid.push('origin', 'destination');
    }

    if (
      !validDate(advancedParams.departDate) ||
      advancedParams.departDate < localDate()
    ) {
      invalid.push('departDate');
    }

    if (
      advancedParams.flightType === 'roundTrip' &&
      (!validDate(advancedParams.returnDate) ||
        advancedParams.returnDate < advancedParams.departDate)
    ) {
      invalid.push('returnDate');
    }

    if (!/^[1-9]$/.test(advancedParams.adults)) invalid.push('adults');

    return Array.from(new Set(invalid));
  };

  const handleAdvancedSearch = () => {
    const invalid = validateForm();
    setInvalidFields(invalid);

    if (invalid.length) return;

    setShowAdvancedSearch(false);

    loadFlights({
      url: globals.api.advancedFlights,
      advanced: true,
      adults: Number(advancedParams.adults),
      params: {
        origin: advancedParams.origin.trim(),
        destination: advancedParams.destination.trim(),
        departDate: advancedParams.departDate,
        returnDate:
          advancedParams.flightType === 'roundTrip'
            ? advancedParams.returnDate
            : '',
        adults: advancedParams.adults,
      },
    });
  };

  const renderIataCode = (code: string): JSX.Element => {
    const full = iataMapping[code.toUpperCase()] || code;

    return (
      <span className="iata-tooltip" title={full}>
        {code}
      </span>
    );
  };

  const renderSummaryRow = (
    leg: FlightSegment[],
    dur?: string
  ): JSX.Element => {
    const origin = renderIataCode(leg[0].origin);
    const dest = renderIataCode(leg[leg.length - 1].destination);
    const stops = leg.length - 1;
    const duration = dur
      ? formatDuration(dur)
      : calculateTotalDuration(leg);

    const { date, time } = formatDateTime(leg[0].departureDate);

    return (
      <div className="summary-row">
        <div className="summary-left">
          <div className="carrier-logo-container">
            {leg[0].carrierCode &&
              renderCarrierLogo(
                leg[0].carrierCode,
                leg[0].airlineLogoUrl
              )}
          </div>

          <div className="route-container">
            <div className="route">
              {origin} <span className="arrow">→</span> {dest}
            </div>

            <div className="details-container">
              <div className="duration">{duration}</div>

              <div
                className={`stops ${
                  stops === 0 ? 'direct-flight' : 'with-stops'
                }`}
              >
                {stops === 0
                  ? 'Direct Flight'
                  : `${stops} Stop${stops > 1 ? 's' : ''}`}
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

  const renderLegDetails = (
    leg: FlightSegment[],
    label: string
  ): JSX.Element => (
    <div className="leg-details">
      <h4>{label}</h4>

      {leg.map((seg, idx) => {
        const dep = formatDateTime(seg.departureDate);
        const arr = formatDateTime(seg.arrivalDate);

        return (
          <div key={idx} className="segment-detail">
            <div className="segment-route">
              <p>
                <strong>
                  {renderIataCode(seg.origin)} →{' '}
                  {renderIataCode(seg.destination)}
                </strong>
              </p>

              <p className="segment-duration">
                {formatDuration(seg.duration)}
              </p>
            </div>

            <p>
              <strong>Departure:</strong> {dep.time} {dep.date}{' '}
              {seg.departureTerminal &&
                `(Terminal ${seg.departureTerminal})`}
            </p>

            <p>
              <strong>Arrival:</strong> {arr.time} {arr.date}{' '}
              {seg.arrivalTerminal &&
                `(Terminal ${seg.arrivalTerminal})`}
            </p>

            <p>
              <strong>Flight:</strong> {seg.carrierCode}{' '}
              {seg.flightNumber}
            </p>

            <p>
              <strong>Aircraft:</strong> {seg.aircraftFullName}
            </p>
          </div>
        );
      })}
    </div>
  );

  const renderPrice = (flight: Flight): JSX.Element => {
    if (
      advancedMode &&
      adultCount > 1 &&
      flight.price !== undefined
    ) {
      const per = flight.price / adultCount;

      return (
        <div className="flight-price">
          <div className="price-per-person">
            <span className="per-person">per person: </span>
            €{per.toFixed(2)}
          </div>

          <div className="total-price">
            Total: €{flight.price.toFixed(2)}
          </div>
        </div>
      );
    }

    return (
      <div className="flight-price">
        {flight.price !== undefined
          ? `€${flight.price.toFixed(2)}`
          : 'N/A'}
      </div>
    );
  };

  const renderFlightItem = (
    flight: Flight,
    idx: number
  ): JSX.Element => {
    const isRound = !!flight.returnSegments?.length;

    return (
      <div
        key={idx}
        className={`flight-item ${isRound ? 'return-flight' : ''}`}
      >
        <div
          className="flight-summary"
          role="button"
          tabIndex={0}
          aria-label={`Flight ${idx + 1} details`}
          aria-expanded={expandedIndex === idx}
          aria-controls={`${formId}-details-${idx}`}
          onClick={() => toggleDetails(idx)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleDetails(idx);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="flight-summary-details">
            {isRound ? (
              <>
                {renderSummaryRow(
                  flight.outboundSegments!,
                  flight.outboundDuration
                )}
                {renderSummaryRow(
                  flight.returnSegments!,
                  flight.returnDuration
                )}
              </>
            ) : (
              flight.segments &&
              renderSummaryRow(
                flight.segments,
                flight.outboundDuration
              )
            )}
          </div>

          {renderPrice(flight)}
        </div>

        {expandedIndex === idx && (
          <div
            id={`${formId}-details-${idx}`}
            className="flight-details"
            style={{ cursor: 'default' }}
          >
            {isRound ? (
              <>
                {renderLegDetails(flight.outboundSegments!, 'Outbound')}
                {renderLegDetails(flight.returnSegments!, 'Return')}
              </>
            ) : (
              flight.segments &&
              renderLegDetails(flight.segments, 'Flight')
            )}
          </div>
        )}
      </div>
    );
  };

  const safeFlights = Array.isArray(flights) ? flights : [];

  const filteredFlights = directFlightsOnly
    ? safeFlights.filter(flight => {
        if (flight.returnSegments?.length) {
          return (
            flight.outboundSegments!.length === 1 &&
            flight.returnSegments.length === 1
          );
        }

        return flight.segments!.length === 1;
      })
    : safeFlights;

  const sortedFlights =
    sortBy === 'price'
      ? [...filteredFlights].sort(
          (first, second) => (first.price || 0) - (second.price || 0)
        )
      : sortBy === 'duration'
        ? [...filteredFlights].sort(
            (first, second) =>
              getTotalDuration(first) - getTotalDuration(second)
          )
        : filteredFlights;

  const renderErrorMessage = () => {
    if (error) {
      return (
        <div role="alert">
          <p className="error-message">{error}</p>

          <button
            type="button"
            onClick={() =>
              lastSearch.current && loadFlights(lastSearch.current)
            }
          >
            Try again
          </button>
        </div>
      );
    }

    if (!loading && sortedFlights.length === 0) {
      return (
        <p className="no-flights-message">
          No flights found.
        </p>
      );
    }

    return null;
  };

  return (
    <div className="flights-container">
      <div className="flights-header">
        <h2 className="flights-title">✈ Flights</h2>

        <div className="header-controls">
          <button
            className={`direct-flights-btn ${
              directFlightsOnly ? 'checked' : ''
            }`}
            aria-pressed={directFlightsOnly}
            onClick={() => setDirectFlightsOnly(previous => !previous)}
          >
            Direct Flights Only
          </button>

          <button
            className="advanced-search-toggle"
            aria-expanded={showAdvancedSearch}
            onClick={() => setShowAdvancedSearch(previous => !previous)}
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
        <form className="advanced-search-form" noValidate onSubmit={event => {
          event.preventDefault();
          handleAdvancedSearch();
        }}>
          <div
            className={`search-field ${
              invalidFields.includes('origin') ? 'invalid' : ''
            }`}
          >
            <label htmlFor={`${formId}-origin`}>Origin:</label>
            <input
              type="text"
              id={`${formId}-origin`}
              aria-invalid={invalidFields.includes('origin')}
              name="origin"
              value={advancedParams.origin}
              onChange={handleAdvancedParamsChange}
            />
          </div>

          <div
            className={`search-field ${
              invalidFields.includes('destination') ? 'invalid' : ''
            }`}
          >
            <label htmlFor={`${formId}-destination`}>Destination:</label>
            <input
              type="text"
              id={`${formId}-destination`}
              aria-invalid={invalidFields.includes('destination')}
              name="destination"
              value={advancedParams.destination}
              onChange={handleAdvancedParamsChange}
            />
          </div>

          <div
            className={`search-field ${
              invalidFields.includes('departDate') ? 'invalid' : ''
            }`}
          >
            <label htmlFor={`${formId}-departDate`}>Depart Date:</label>
            <input
              type="date"
              id={`${formId}-departDate`}
              aria-invalid={invalidFields.includes('departDate')}
              name="departDate"
              min={localDate()}
              value={advancedParams.departDate}
              onChange={handleAdvancedParamsChange}
            />
          </div>

          {advancedParams.flightType === 'roundTrip' && (
            <div
              className={`search-field ${
                invalidFields.includes('returnDate') ? 'invalid' : ''
              }`}
            >
              <label htmlFor={`${formId}-returnDate`}>Return Date:</label>
              <input
                type="date"
                id={`${formId}-returnDate`}
                aria-invalid={invalidFields.includes('returnDate')}
                name="returnDate"
                value={advancedParams.returnDate}
                onChange={handleAdvancedParamsChange}
                min={advancedParams.departDate || localDate()}
              />
            </div>
          )}

          <div
            className={`search-field ${
              invalidFields.includes('adults') ? 'invalid' : ''
            }`}
          >
            <label htmlFor={`${formId}-adults`}>Adults:</label>
            <input
              type="number"
              id={`${formId}-adults`}
              aria-invalid={invalidFields.includes('adults')}
              name="adults"
              min="1"
              max="9"
              value={advancedParams.adults}
              onChange={handleFlightAdultsChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          </div>

          <div className="search-field radio-field">
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

          <button
            className="advanced-search-btn"
            type="submit"
          >
            Search
          </button>
        </form>
      )}

      {invalidFields.length > 0 && showAdvancedSearch && (
        <p role="alert">
          Check the highlighted cities, dates and passenger count.
        </p>
      )}

      {loading ? (
        <div role="status" aria-label="Loading flights">
          <Loader />
        </div>
      ) : (
        renderErrorMessage()
      )}

      {!loading &&
        sortedFlights.map((flight, index) =>
          renderFlightItem(flight, index)
        )}
    </div>
  );
};

export default FlightsComponent;
