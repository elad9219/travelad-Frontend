import "./MapComponent.css";
import React, { useState, useEffect } from 'react';
import GoogleMapReact from 'google-map-react';

interface MapProps {
    lat: number;
    lng: number;
    viewport: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
    };
}

const MapComponent: React.FC<MapProps> = ({ lat, lng, viewport }) => {
    const [zoom, setZoom] = useState(12); // Default zoom

    useEffect(() => {
        // Calculate latitude and longitude differences
        const latDiff = Math.abs(viewport.northeast.lat - viewport.southwest.lat);
        const lngDiff = Math.abs(viewport.northeast.lng - viewport.southwest.lng);

        // Calculate the overall distance for a better zoom adjustment
        const overallDistance = Math.max(latDiff, lngDiff);

        // Adjust zoom based on the size of the city
        if (overallDistance < 0.01) {
            setZoom(17); // Zoom in for very small areas (e.g., very localized areas)
        } else if (overallDistance < 0.1) {
            setZoom(13); // Zoom in for small cities
        } else if (overallDistance < 0.5) {
            setZoom(12); // Default zoom for medium-sized cities
        } else if (overallDistance < 0.75) {
            setZoom(9); 
        } else if (overallDistance < 1) {
            setZoom(8); // Slightly zoomed out for larger cities
        } else {
            setZoom(7); // More zoomed out for very large cities
        }
    }, [viewport]);

    return (
        <div style={{ height: '400px', width: '100%' }}>
            <GoogleMapReact
                bootstrapURLKeys={{ key: 'AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw' }} // Replace with your actual API key
                defaultCenter={{ lat, lng }}
                center={{ lat, lng }} // Update center with new location
                zoom={zoom} // Set the zoom level
            >
                {/* Add markers or other components here if needed */}
            </GoogleMapReact>
        </div>
    );
};

export default MapComponent;
