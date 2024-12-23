import React from 'react';
import './MapComponent.css';

interface MapProps {
    lat: number;
    lng: number;
    }

    const MapComponent: React.FC<MapProps> = ({ lat, lng }) => {
    const mapUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw&center=${lat},${lng}&zoom=12`;

    return (
        <div className="map-container">
        <iframe
            title="Google Map"
            src={mapUrl}
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
        />
        </div>
    );
};

export default MapComponent;
