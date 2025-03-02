// modal/Hotel.ts
export interface VendorDto {
    name: string;
    price: number;
  }
  
  export interface HotelDto {
    hotelId: string;
    name: string;
    iataCode?: string;
    countryCode?: string;
    latitude?: number;      // add latitude
    longitude?: number;     // add longitude
    rating?: number; 
    price?: number; 
    vendors?: VendorDto[]; 
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
    // Optionally, offers may include geoCode info:
    latitude?: number;
    longitude?: number;
  }
  