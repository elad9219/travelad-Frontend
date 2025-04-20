import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';
import globals from '../../../utils/globals';

interface AttractionComponentProps {
  city: string;
  onShowAttractionOnMap: (query: string) => void;
}

const AttractionComponent: React.FC<AttractionComponentProps> = ({ city, onShowAttractionOnMap }) => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAttractionKey, setExpandedAttractionKey] = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;
    const fetchAttractions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get<Attraction[]>(globals.api.attractions, {
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

  const getAttractionKey = (attraction: Attraction, index: number) => {
    return attraction.id ? attraction.id.toString() : `${index}-${attraction.name}-${attraction.city}`;
  };

  const toggleAttraction = (key: string) => {
    setExpandedAttractionKey(expandedAttractionKey === key ? null : key);
  };

  const handleShowOnMap = (attraction: Attraction, e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    const query = `${attraction.name || 'Unnamed Attraction'}, ${attraction.city}`;
    onShowAttractionOnMap(query);
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="attractions-container">
      <div className="attractions-header">
        <h2 className="attractions-title">
          <span role="img" aria-label="attractions">🎡</span> Attractions
        </h2>
      </div>
      {loading && <div>Loading attractions...</div>}
      {error && <p className="error-message">{error}</p>}
      {(!loading && attractions.length === 0) && <p className="no-attractions-message">No attractions found.</p>}
      <ul className="attractions-list">
        {attractions.map((attraction, index) => {
          const uniqueKey = getAttractionKey(attraction, index);
          return (
            <li key={uniqueKey} className="attraction-item" onClick={() => toggleAttraction(uniqueKey)}>
              <div className="attraction-header">
                <span className="attraction-name">{attraction.name || 'Unnamed Attraction'}</span>
                <button className="show-on-map-btn" onClick={(e) => { e.stopPropagation(); handleShowOnMap(attraction, e); }}>
                  Show on Map
                </button>
              </div>
              {expandedAttractionKey === uniqueKey && (
                <div className="attraction-details">
                  {attraction.description && <p className="attraction-description"><strong>Description:</strong> {attraction.description}</p>}
                  {attraction.address && <p className="attraction-address"><strong>Address:</strong> {attraction.address}</p>}
                  {attraction.phone && <p className="attraction-phone"><strong>Phone:</strong> {attraction.phone}</p>}
                  {attraction.website && (
                    <p className="attraction-website">
                      <strong>Website:</strong> <a href={attraction.website} target="_blank" rel="noopener noreferrer">{attraction.website}</a>
                    </p>
                  )}
                  {attraction.openingHours && <p className="attraction-hours"><strong>Hours:</strong> {attraction.openingHours}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AttractionComponent;
