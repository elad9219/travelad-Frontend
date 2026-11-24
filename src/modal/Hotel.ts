export interface HotelPhotoAttribution {
    title: string;
    author: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
    modifications: string;
}

export interface HotelDto {
    hotelId: string;
    name: string;
    iataCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    price?: number;
    imageUrl?: string;
    rating?: number;
    photoAttribution?: HotelPhotoAttribution;
}

// Kept for future use if we want to display specific room details.
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