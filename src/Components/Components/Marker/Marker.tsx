import "./Marker.css";

import React from 'react';

interface MarkerProps {
  lat: number; // Define latitude
  lng: number; // Define longitude
  text: string; // Existing text property
}

const Marker: React.FC<MarkerProps> = ({ text }) => {
    return (
        <div style={{ color: 'red', fontWeight: 'bold' }}>
        {text}
        </div>
    );
};

export default Marker;


