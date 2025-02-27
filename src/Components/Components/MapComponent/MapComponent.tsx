import React from 'react';
import './MapComponent.css';

interface MapProps {
  lat?: number;
  lng?: number;
  query?: string;
}

const MapComponent: React.FC<MapProps> = ({ lat, lng, query }) => {
  const apiKey = "AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw";
  let mapUrl = "";
  if (query) {
    // Use the "place" embed if a search query is provided.
    mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}`;
  } else if (lat !== undefined && lng !== undefined) {
    // Fallback to a fixed center view if coordinates are provided.
    mapUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=12`;
  }
  return (
    <div className="map-container">
      {mapUrl ? (
        <iframe
          title="Google Map"
          src={mapUrl}
          width="100%"
          height="250"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <div>No map available</div>
      )}
    </div>
  );
};

export default MapComponent;
