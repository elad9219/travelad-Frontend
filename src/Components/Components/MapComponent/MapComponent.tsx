import React from 'react';
import './MapComponent.css';

interface MapProps {
  lat?: number;
  lng?: number;
  query?: string;
}

const validCoordinates = (lat: unknown, lng: unknown): boolean =>
  typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
  typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;

const MapComponent: React.FC<MapProps> = ({ lat, lng, query }) => {
  const apiKey = 'AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw';
  const search = query?.trim() || '';
  const pair = search.split(',').map(value => value.trim());
  const numericPair = pair.length === 2 && pair.every(value => value !== '' && !Number.isNaN(Number(value)));
  let mapUrl = '';

  if (search && (!numericPair || validCoordinates(Number(pair[0]), Number(pair[1])))) {
    const params = new URLSearchParams({ key: apiKey, q: search });
    mapUrl = `https://www.google.com/maps/embed/v1/place?${params}`;
  } else if (!search && validCoordinates(lat, lng)) {
    const params = new URLSearchParams({ key: apiKey, center: `${lat},${lng}`, zoom: '12' });
    mapUrl = `https://www.google.com/maps/embed/v1/view?${params}`;
  }

  return (
    <div className="map-container">
      {mapUrl ? (
        <iframe
          title="Google Map"
          src={mapUrl}
          style={{ border: 0, width: '100%', height: '100%' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="map-unavailable">No map available</div>
      )}
    </div>
  );
};

export default MapComponent;