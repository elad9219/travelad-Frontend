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
    geoCode?: {
      latitude: number;
      longitude: number;
    };
  }
  
  
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
  