export class FlightSegmentDto {
    origin?: string;
    destination?: string;
    departureDate?: string;
    arrivalDate?: string;
}

export class FlightOfferDto {
    segments?: FlightSegmentDto[];
    price?: number;
}  