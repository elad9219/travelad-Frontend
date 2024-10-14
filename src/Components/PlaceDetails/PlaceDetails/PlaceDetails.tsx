import React, { useState } from 'react';
import axios from 'axios';
import './PlaceDetails.css'; // Import a CSS file for custom styles

const PlaceDetails: React.FC = () => {
  const [placeName, setPlaceName] = useState(''); // For input value
  const [placeDetails, setPlaceDetails] = useState<any>(null); // For API response
  const [loading, setLoading] = useState(false); // For loading state
  const [error, setError] = useState('');

  // Function to handle the search action
  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:8080/api/places/search`, {
        params: { query: placeName }, // Send placeName as query parameter
      });
      console.log(response.data.results[0]); // Log the first result
      setPlaceDetails(response.data.results[0]); // Store the first result
    } catch (error) {
      console.error('Error fetching place details:', error);
      setError('Error fetching place details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="place-details-container">
      <h1>Search for a Place</h1>
      <input
        type="text"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        placeholder="Enter a place name"
        className="search-input"
      />
      <button onClick={handleSearch} className="search-button">Search</button>

      {loading && <p>Loading...</p>}
      {error && <p className="error-message">{error}</p>}
      {placeDetails && (
        <div className="details-container">
          <h2>{placeDetails.formatted_address}</h2> {/* Use formatted_address here */}
          <div className="map-photo-container">
            <div className="map-container">
              <iframe
                title="Google Map"
                src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw&center=${placeDetails.geometry.location.lat},${placeDetails.geometry.location.lng}&zoom=11`}
                width="600" // Adjust width
                height="400" // Adjust height
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
            <div className="photo-container">
              {placeDetails.photos && placeDetails.photos.length > 0 ? (
                <img
                  src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${placeDetails.photos[0].photo_reference}&key=AIzaSyAGgVzFnyAu6Na2G2-wu5yAmLDpoptgCJw`}
                  alt={placeDetails.name}
                  className="place-photo"
                />
              ) : (
                <p>No photos available for this place.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceDetails;
