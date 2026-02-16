class Globals {}

export class DevelopmentGlobals extends Globals {
    // הכתובת החדשה שמצאת ב-Mac
    private static ip = "192.168.1.17"; 

    public api = {
        places: `http://${DevelopmentGlobals.ip}:8080/api/places/search`,
        flights: `http://${DevelopmentGlobals.ip}:8080/flights`,
        advancedFlights: `http://${DevelopmentGlobals.ip}:8080/flights/advancedFlightSearch`,
        hotels: `http://${DevelopmentGlobals.ip}:8080/hotels/by-city-name`,
        hotelOffers: `http://${DevelopmentGlobals.ip}:8080/hotels/offers`,
        attractions: `http://${DevelopmentGlobals.ip}:8080/api/geoapify/places`,
        weather: `http://${DevelopmentGlobals.ip}:8080/weather`,
        iataCodes: `http://${DevelopmentGlobals.ip}:8080/iata-codes`,
        cacheCities: `http://${DevelopmentGlobals.ip}:8080/cache/cities`,
    };
}

export class ProductionGlobals extends Globals {
    public api = {
        places: '/api/places/search',
        flights: '/flights',
        advancedFlights: '/flights/advancedFlightSearch',
        hotels: '/hotels/by-city-name',
        hotelOffers: '/hotels/offers',
        attractions: '/api/geoapify/places',
        weather: '/weather',
        iataCodes: '/iata-codes',
        cacheCities: '/cache/cities',
    };
}

const globals = process.env.NODE_ENV === 'production'
    ? new ProductionGlobals()
    : new DevelopmentGlobals();

export default globals;