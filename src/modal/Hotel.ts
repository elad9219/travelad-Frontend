export interface VendorDto {
    name: string;
    price: number;
}

export interface HotelDto {
    hotelId: string;
    name: string;
    iataCode?: string;
    countryCode?: string;
    rating?: number; 
    price?: number; 
    vendors?: VendorDto[]; 
}


export class HotelOffersDto {
    name?: string;
    city?: string;
    priceCurrency?: string;
    basePrice?: string;
    totalPrice?: string;
    checkInDate?: string;
    checkOutDate?: string;
    room?: RoomDto;
}

export class RoomDto {
    bedType?: string;
    beds?: number;
    description?: string;
}
