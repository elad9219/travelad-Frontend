import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';
import globals from '../../../utils/globals';
import SkeletonCard from '../SkeletonCard/SkeletonCard';

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
          <span role="img" aria-label="attractions">🎡</span> Attractions in {city}
        </h2>
      </div>

      {error && <p className="error-message">{error}</p>}
      
      {loading && (
        <div className="attractions-grid">
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {(!loading && attractions.length === 0) && !error && (
        <p className="no-attractions-message">No attractions found for this city.</p>
      )}
      
      {!loading && attractions.length > 0 && (
        <div className="attractions-grid">
          {attractions.map((attraction, index) => {
            const uniqueKey = getAttractionKey(attraction, index);
            const isExpanded = expandedAttractionKey === uniqueKey;

            return (
              <div key={uniqueKey} className={`attraction-card ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleAttraction(uniqueKey)}>
                <div className="attraction-image-container">
                  {/* מציג תמונה רק אם יש URL. אחרת מציג חללית אפורה נקייה */}
                  {attraction.imageUrl ? (
                    <img src={attraction.imageUrl} alt={attraction.name || 'Attraction'} className="attraction-image" />
                  ) : (
                    <div className="no-image-placeholder">
                      <span className="no-image-icon">📷</span>
                    </div>
                  )}
                </div>
                
                <div className="attraction-card-content">
                  <div className="attraction-card-header">
                    <h3 className="attraction-name">{attraction.name || 'Unnamed Attraction'}</h3>
                  </div>
                  
                  <div className="attraction-card-actions">
                    <button className="show-on-map-btn" onClick={(e) => handleShowOnMap(attraction, e)}>
                      Show on Map
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="attraction-details" onClick={(e) => e.stopPropagation()}>
                      {attraction.description && <p><strong>Description:</strong> {attraction.description}</p>}
                      {attraction.address && <p><strong>Address:</strong> {attraction.address}</p>}
                      {attraction.phone && <p><strong>Phone:</strong> {attraction.phone}</p>}
                      {attraction.openingHours && <p><strong>Hours:</strong> {attraction.openingHours}</p>}
                      {attraction.website && (
                        <div className="attraction-details-separator">
                          <a href={attraction.website} target="_blank" rel="noopener noreferrer" className="website-link">
                            Visit Official Website
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttractionComponent;