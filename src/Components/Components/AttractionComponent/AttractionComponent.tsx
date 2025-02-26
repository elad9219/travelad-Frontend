import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from '../Loader/Loader';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';

const AttractionComponent: React.FC<{ city: string }> = ({ city }) => {
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
    setExpandedAttractionId(expandedAttractionId === id ? null : id);
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
            <div className="attraction-name">{attraction.name}</div>
            {expandedAttractionId === attraction.id && (
              <div className="attraction-details">
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
                {attraction.description && (
                  <p className="attraction-description"><strong>Description:</strong> {attraction.description}</p>
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
