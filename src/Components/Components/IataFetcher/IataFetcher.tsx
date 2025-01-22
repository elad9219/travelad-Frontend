import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface IataFetcherProps {
    cityName: string;
    onIataFetched: (iataCode: string | null) => void;
}

const IataFetcher: React.FC<IataFetcherProps> = ({ cityName, onIataFetched }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIataCode = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await axios.get('http://localhost:8080/flights', {
                    params: { city: cityName },
                });

                if (response.data && response.data.length > 0) {
                    const iataCode = response.data[0].iataCode || null;
                    onIataFetched(iataCode);
                } else {
                    onIataFetched(null);
                }
            } catch (err) {
                console.error('Error fetching IATA code:', err);
                onIataFetched(null);
            } finally {
                setLoading(false);
            }
        };

        fetchIataCode();
    }, [cityName, onIataFetched]);

    // No longer rendering error messages
    return null; // Or return an empty div if needed: <div></div>
};

export default IataFetcher;