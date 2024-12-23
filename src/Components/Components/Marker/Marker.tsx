import React from 'react';

interface MarkerProps {
  lat: number;
  lng: number;
  text: string;
}

const Marker: React.FC<MarkerProps> = ({ text }) => {
  return (
    <div style={{ color: 'red', fontWeight: 'bold' }}>
      {text}
    </div>
  );
};

export default Marker;
