# Travelad - Travel Planning Platform

Travelad is a full-stack travel planning application that allows users to search for cities worldwide, view detailed information including maps, weather, flights, hotels, and attractions, and access a personalized search history. Built from scratch with Java 11 and Spring Boot for the backend, React TypeScript for the frontend, and deployed using Docker.

## Quick Links

- **Live Demo**: [https://traveladd.runmydocker-app.com/](https://traveladd.runmydocker-app.com/)
- **API Documentation (Swagger)**: [https://traveladd.runmydocker-app.com/swagger-ui.html](https://traveladd.runmydocker-app.com/swagger-ui.html)
- **Backend Repository**: [https://github.com/elad9219/travelad-backend](https://github.com/elad9219/travelad-backend)
- **Frontend Repository**: [https://github.com/elad9219/travelad-frontend](https://github.com/elad9219/travelad-frontend)

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **City Search**: Search any city with autocomplete based on past searches.
- **Personalized Search History**: View and remove the last 8 searched cities (stored in Redis per user).
- **Six Information Tiles**: Image, map, weather, flights, hotels, and attractions.
- **Advanced Search**: Customize flights (origin, dates, passengers) and hotels (pricing, parameters).
- **IATA Code Conversion**: Converts city names to IATA codes using a JSON file.
- **Carrier Logos**: Displays airline logos from GitHub.
- **Tooltip Details**: Shows full names on IATA code hover.
- **Database Optimization**: Uses PostgreSQL for static data and Redis for history.

## Technologies

- **Backend**: Java 11, Spring Boot, Maven
- **Frontend**: React, TypeScript
- **Databases**: PostgreSQL, Redis
- **APIs**: Google Places, Amadeus, Geoapify, WeatherAPI
- **Containerization**: Docker
- **Documentation**: Swagger
- **Version Control**: Git, GitHub

## Installation

### Prerequisites

- Java 11
- Docker
- Git

### Backend Setup

1. Clone the backend:

   ```bash
   git clone https://github.com/elad9219/travelad-backend.git
   cd travelad-backend
   ```

2. Configure environment variables (e.g., in .env):

   ```bash
   google.places.api.key=${GOOGLE_PLACES_API_KEY}
   amadeus.api.key=${AMADEUS_API_KEY}
   amadeus.api.secret=${AMADEUS_API_SECRET}
   geoapify.api.key=${GEOAPIFY_API_KEY}
   weatherapi.api.key=${WEATHERAPI_API_KEY}
   spring.redis.host=localhost
   spring.redis.port=6379
   spring.datasource.url=jdbc:postgresql://localhost:5432/travelad
   ```

3. Build and run:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

### Frontend Setup

1. Clone the frontend:
   ```bash
   git clone https://github.com/elad9219/travelad-frontend.git
   cd travelad-frontend
   ```
2. Install and run:

   ```bash
   npm install
   npm start
   ```

### Docker Setup

1. Build the image:
   ```bash
   cd travelad-backend
   docker build --platform linux/amd64 -t elad9219/travelad-jul:002 .
   ```
2. Run the container:
   ```bash
   docker run --platform linux/amd64 -p 8080:8080 elad9219/travelad-jul:002
   ```
3. Access at http://localhost:8080.

## Usage

- Search a city (e.g., "Paris") to see 6 tiles.
- Manage history by removing cities.
- Use advanced search for flights and hotels.
- View flight details (e.g., TLV → LCA).

## Screenshots

- Homepage:

    <img width="1460" height="1201" alt="image" src="https://github.com/user-attachments/assets/d860462a-aa0d-4668-b38f-4b5fe811ee06" />

- Search Bar with History:

   <img width="577" height="370" alt="image" src="https://github.com/user-attachments/assets/4c5fcce2-743d-4ee8-82c3-d22dca2cfea4" />
   
- Search Bar with Autocomplete:

   <img width="575" height="321" alt="image" src="https://github.com/user-attachments/assets/257b0f2a-667f-457b-9ae3-096df62c4945" />

- Flight Details:

   <img width="1200" height="571" alt="image" src="https://github.com/user-attachments/assets/e94c380f-349b-4761-b615-83871bdb845c" />
   
- Advanced Flight Search:

   <img width="1200" height="605" alt="image" src="https://github.com/user-attachments/assets/66a63c8f-3a63-40bd-8832-e01f98a36a36" />

- Attractions Details:

   <img width="1198" height="599" alt="image" src="https://github.com/user-attachments/assets/b4e25309-879b-47d8-8ffa-f80f44720b6a" />

-  Hotels Offers Details:

   <img width="1201" height="601" alt="image" src="https://github.com/user-attachments/assets/b8f56944-b1d2-48f1-9c3b-22613e79cfd8" />


   

## Project Structure

### Backend (`elad9219/travelad-backend`)

```
travelad-backend/
├── src/
│   ├── main/
│   │   ├── java/com/travelad/
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   ├── model/
│   │   │   ├── repository/
│   │   │   ├── service/
│   │   │   ├── util/
│   │   ├── resources/
│   │   │   ├── static/
│   │   │   ├── application.properties
├── pom.xml
├── Dockerfile
```

### Frontend (`elad9219/travelad-frontend`)

```
travelad-frontend/
├── src/
│   ├── components/
│   ├── utils/
│   │   ├── globals.ts
│   ├── App.tsx
├── public/
├── package.json
├── tsconfig.json
```

## Contributing

1. Fork the repository.
2. Create a branch: git checkout -b feature-name.
3. Commit: git commit -m 'Add feature'.
4. Push: git push origin feature-name.
5. Open a pull request.

## License

MIT License - see LICENSE file.

## Contact

- **Author**: Elad Tennenboim
- **GitHub**: [elad9219](https://github.com/elad9219)
- **Email**: elad9219@gmail.com
- **LinkedIn**: https://www.linkedin.com/in/elad-tennenboim/
