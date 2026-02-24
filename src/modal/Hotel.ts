// Flattened and cleaned up to match the backend structure perfectly
export interface HotelDto {
    hotelId: string;
    name: string;
    iataCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    price?: number;
    imageUrl?: string; // השדה החדש לתמונה הדינמית
    rating?: number;   // הדירוג שמגיע מהבקאנד
}

// Kept for future use if we want to display specific room details
export interface RoomDto {
    bedType?: string;
    beds?: number;
    description?: string;
}

export interface HotelOffersDto {
    name?: string;
    city?: string;
    priceCurrency?: string;
    basePrice?: string;
    totalPrice?: string;
    checkInDate?: string;
    checkOutDate?: string;
    room?: RoomDto;
    latitude?: number;
    longitude?: number;
}