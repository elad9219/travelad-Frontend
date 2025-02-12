export class FlightSegmentDto {
    origin?: string;
    destination?: string;
    departureDate?: string;
    arrivalDate?: string;
}

export class FlightOfferDto {
    outboundSegments?: FlightSegmentDto[];
    returnSegments?: FlightSegmentDto[];
    price?: number;
}  

