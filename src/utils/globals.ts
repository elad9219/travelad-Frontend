class Globals {}

export class DevelopmentGlobals extends Globals {
    // Dynamically detects the host from the browser's address bar
    private static host = window.location.hostname;
    private static baseUrl = `http://${DevelopmentGlobals.host}:8080`;

    public api = {
        places: `${DevelopmentGlobals.baseUrl}/api/places/search`,
        flights: `${DevelopmentGlobals.baseUrl}/flights`,
        advancedFlights: `${DevelopmentGlobals.baseUrl}/flights/advancedFlightSearch`,
        hotels: `${DevelopmentGlobals.baseUrl}/hotels/by-city-name`,
        hotelOffers: `${DevelopmentGlobals.baseUrl}/hotels/offers`,
        attractions: `${DevelopmentGlobals.baseUrl}/api/geoapify/places`,
        weather: `${DevelopmentGlobals.baseUrl}/weather`,
        iataCodes: `${DevelopmentGlobals.baseUrl}/iata-codes`,
        cacheCities: `${DevelopmentGlobals.baseUrl}/cache/cities`,
    };
}

export class ProductionGlobals extends Globals {
    // Replace this string with your actual runmydocker backend URL
    private static backendUrl = "https://YOUR-RUNMYDOCKER-URL.com"; 

    public api = {
        places: `${ProductionGlobals.backendUrl}/api/places/search`,
        flights: `${ProductionGlobals.backendUrl}/flights`,
        advancedFlights: `${ProductionGlobals.backendUrl}/flights/advancedFlightSearch`,
        hotels: `${ProductionGlobals.backendUrl}/hotels/by-city-name`,
        hotelOffers: `${ProductionGlobals.backendUrl}/hotels/offers`,
        attractions: `${ProductionGlobals.backendUrl}/api/geoapify/places`,
        weather: `${ProductionGlobals.backendUrl}/weather`,
        iataCodes: `${ProductionGlobals.backendUrl}/iata-codes`,
        cacheCities: `${ProductionGlobals.backendUrl}/cache/cities`,
    };
}

const globals = process.env.NODE_ENV === 'production'
    ? new ProductionGlobals()
    : new DevelopmentGlobals();

export default globals;