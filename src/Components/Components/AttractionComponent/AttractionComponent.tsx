import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';

interface AttractionComponentProps {
  city: string;
  onShowAttractionOnMap: (query: string) => void;
}

const AttractionComponent: React.FC<AttractionComponentProps> = ({ city, onShowAttractionOnMap }) => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAttractionId, setExpandedAttractionId] = useState<number | null>(null);

  useEffect(() => {
    if (!city) return;
    const fetchAttractions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get<Attraction[]>(`http://localhost:8080/api/geoapify/places`, {
          params: { city }
        });
        setAttractions(response.data || []);
      } catch (err) {
        console.error('Error fetching attractions:', err);
        setError('Error fetching attractions.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttractions();
  }, [city]);

  const toggleAttraction = (id: number) => {
    // Toggle details when clicking anywhere on the attraction item.
    setExpandedAttractionId(expandedAttractionId === id ? null : id);
  };

  const handleShowOnMap = (attraction: Attraction, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    // Prevent toggling the details when clicking the button.
    e.stopPropagation();
    const query = `${attraction.name}, ${attraction.city}`;
    onShowAttractionOnMap(query);
    // Scroll to the map container (assumes it has an id="map-container")
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="attractions-container">
      <h2 className="attractions-title">
        <span role="img" aria-label="attractions">🎡</span> Attractions
      </h2>
      {loading && <Loader />}
      {error && <p className="error-message">{error}</p>}
      {(!loading && attractions.length === 0) && <p className="no-attractions-message">No attractions found.</p>}
      <ul className="attractions-list">
        {attractions.map((attraction) => (
          <li
            key={attraction.id}
            className="attraction-item"
            onClick={() => toggleAttraction(attraction.id!)}
          >
            <div className="attraction-header">
              <span className="attraction-name">{attraction.name}</span>
              <button
                className="show-on-map-btn"
                onClick={(e) => handleShowOnMap(attraction, e)}
              >
                Show on Map
              </button>
            </div>
            {expandedAttractionId === attraction.id && (
              <div className="attraction-details">
                {attraction.description && (
                  <p className="attraction-description"><strong>Description:</strong> {attraction.description}</p>
                )}
                {attraction.address && (
                  <p className="attraction-address"><strong>Address:</strong> {attraction.address}</p>
                )}
                {attraction.phone && (
                  <p className="attraction-phone"><strong>Phone:</strong> {attraction.phone}</p>
                )}
                {attraction.website && (
                  <p className="attraction-website">
                    <strong>Website:</strong>{' '}
                    <a href={attraction.website} target="_blank" rel="noopener noreferrer">
                      {attraction.website}
                    </a>
                  </p>
                )}
                {attraction.openingHours && (
                  <p className="attraction-hours"><strong>Hours:</strong> {attraction.openingHours}</p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AttractionComponent;
