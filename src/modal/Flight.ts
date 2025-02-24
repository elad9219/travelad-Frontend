export interface FlightSegment {
    origin: string;
    destination: string;
    departureDate: string;
    arrivalDate: string;
    duration: string;
    carrierCode: string;
    flightNumber: string;
    aircraft: string;
    departureTerminal?: string;
    arrivalTerminal?: string;
    airlineLogoUrl?: string; // New field for the logo URL
}

export interface Flight {
    segments?: FlightSegment[];
    outboundSegments?: FlightSegment[];
    returnSegments?: FlightSegment[];
    price?: number;
    outboundDuration?: string;
    returnDuration?: string;
}

export interface AdvancedSearchParams {
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string;
    adults: string;
    flightType: 'roundTrip' | 'oneWay';
}

export interface IataMapping {
    [iataCode: string]: string;
}