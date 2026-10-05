# Travelad — Comprehensive Travel Planning Platform

Travelad is a full-stack travel planning application that brings together maps, weather, flights, hotels, and local attractions in one interactive dashboard. The project focuses on external API integration, resilient data handling, caching, and a responsive React/TypeScript user experience.

## Quick Links

- **Live Demo:** [travelad.vercel.app](https://travelad.vercel.app/)
- **System Architecture & Technical Demo:** [YouTube](https://www.youtube.com/watch?v=bHFkiX9EYZc)
- **API Documentation (Swagger):** [traveladd.runmydocker-app.com/swagger-ui.html](https://traveladd.runmydocker-app.com/swagger-ui.html)
- **Backend Repository:** [github.com/elad9219/travelad-backend](https://github.com/elad9219/travelad-backend)
- **Frontend Repository:** [github.com/elad9219/travelad-frontend](https://github.com/elad9219/travelad-frontend)

## Highlights

- **Unified travel dashboard:** Combines flights, hotels, attractions, weather, maps, and place details in a single-page interface.
- **Smart city search:** Supports worldwide city search with autocomplete based on IATA/city mappings.
- **Multi-layer caching:** Uses Redis for fast volatile caching and PostgreSQL for persistent cached data.
- **Resilient data flow:** Re-fetches external data when cached records are missing or incomplete and provides UI fallbacks when external services return partial data.
- **Attractions aggregation:** Combines Geoapify place discovery with Wikipedia enrichment to return more useful destination content.
- **Search history:** Tracks recently searched destinations for a smoother user experience.
- **Error handling:** Centralized exception handling prevents noisy failures when third-party services time out or return invalid responses.

> **Public demo note:** The public demo uses a structured simulation layer for flight and hotel data, designed around real-world GDS-style response shapes. The project architecture is built so live providers can be integrated behind the same application flow.

## Architecture & Technical Highlights

### Backend

- Java 11 and Spring Boot
- REST API with controller/service/repository separation
- Spring Data JPA and Hibernate
- PostgreSQL persistent storage
- Redis caching
- External API integrations for places, maps, geocoding, weather, and media enrichment
- Swagger / SpringFox API documentation
- Dockerized deployment

### Frontend

- React with TypeScript
- Axios for HTTP communication
- Responsive CSS using Grid and Flexbox
- Reusable components for flights, hotels, attractions, weather, maps, search, and place details

### External Services

- Google Places API
- Google Maps
- Geoapify API
- WeatherAPI
- Wikipedia API

## Screenshots

### Homepage

<img width="1374" height="1185" alt="Travelad homepage" src="https://github.com/user-attachments/assets/38366063-ccb5-40d1-9d50-e3edcc0f572d" />

### Flights Advanced Search

<img width="1232" height="622" alt="Flights advanced search" src="https://github.com/user-attachments/assets/b6fdc2ae-4c09-4cf2-8acc-6fab6d9efc44" />

### Flight Details

<img width="1229" height="620" alt="Flight details" src="https://github.com/user-attachments/assets/69086a19-9fba-4e45-946b-c336c80fbe22" />

### Hotels Advanced Search and Details

<img width="1218" height="618" alt="Hotels advanced search and details" src="https://github.com/user-attachments/assets/6f126897-c647-4324-96bc-2bc3b8b06461" />

### Attraction Details

<img width="1217" height="604" alt="Attraction details" src="https://github.com/user-attachments/assets/5c0995f8-b320-48bc-b4cc-2aa916b2f51c" />

### Image, Map, Weather and Flights

<img width="2559" height="1270" alt="Travelad dashboard tiles" src="https://github.com/user-attachments/assets/9c82c82a-8f3c-4f86-8452-a7cd68b281a6" />

## Local Setup

### Prerequisites

- Java 11
- Maven
- Node.js 14+
- PostgreSQL
- Redis
- Docker (optional)

### Backend

```bash
git clone https://github.com/elad9219/travelad-backend.git
cd travelad-backend
mvn clean install
mvn spring-boot:run
```

Before starting the backend, create your local `application.properties` from the provided example and supply your own database credentials and API keys. Do not commit real secrets.

### Frontend

```bash
git clone https://github.com/elad9219/travelad-frontend.git
cd travelad-frontend
npm install
npm start
```

## Project Structure

### Backend

```text
src/main/java/com/example/travelad/
├── advice/
├── beans/
├── config/
├── controller/
├── dto/
├── exceptions/
├── repositories/
├── service/
└── utils/
```

### Frontend

```text
src/
├── Components/
├── modal/
├── utils/
├── App.tsx
└── index.tsx
```

## Contact

- **Elad Tennenboim**
- **GitHub:** [elad9219](https://github.com/elad9219)
- **LinkedIn:** [linkedin.com/in/elad-tennenboim](https://www.linkedin.com/in/elad-tennenboim/)
- **Email:** elad9219@gmail.com
