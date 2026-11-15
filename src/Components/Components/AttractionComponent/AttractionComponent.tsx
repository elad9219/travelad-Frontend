import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';
import globals from '../../../utils/globals';
import SkeletonCard from '../SkeletonCard/SkeletonCard';

interface AttractionComponentProps {
  city: string;
  onShowAttractionOnMap: (query: string) => void;
}

const safeUrl = (value?: string, host?: string): string | undefined => {
  try {
    const url = new URL(value || '');

    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }

    if (host && (url.protocol !== 'https:' || url.hostname !== host || url.port)) {
      return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
};

const AttractionComponent: React.FC<AttractionComponentProps> = ({
  city,
  onShowAttractionOnMap,
}) => {
  const [result, setResult] = useState<{
    city: string;
    items: Attraction[];
    error: boolean;
    loading: boolean;
  }>({
    city: '',
    items: [],
    error: false,
    loading: false,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setExpanded(null);
    setFailedImages(new Set());
    setResult({ city, items: [], error: false, loading: Boolean(city) });

    if (city) {
      axios.get<Attraction[]>(globals.api.attractions, {
        params: { city },
        signal: controller.signal,
      })
        .then(response => {
          if (!Array.isArray(response.data)) {
            throw new Error('Invalid attractions response');
          }

          if (active) {
            setResult({
              city,
              items: response.data,
              error: false,
              loading: false,
            });
          }
        })
        .catch(() => {
          if (active) {
            setResult({ city, items: [], error: true, loading: false });
          }
        });
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [city, attempt]);

  const current = result.city === city;
  const loading = Boolean(city) && (!current || result.loading);
  const items = current ? result.items : [];

  return (
    <section
      className="attractions-container"
      aria-label={`Attractions in ${city}`}
      aria-busy={loading}
    >
      <header className="attractions-header">
        <h2 className="attractions-title">🎡 Attractions in {city}</h2>

        <p className="attractions-source">
          Places:{' '}
          <a
            href="https://www.geoapify.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Geoapify
          </a>
          {' / '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>.
          {' '}Images: Wikimedia Commons.
        </p>
      </header>

      {current && result.error && (
        <div role="alert" className="attractions-message">
          <p>Attractions are temporarily unavailable.</p>
          <button
            type="button"
            onClick={() => setAttempt(value => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className="attractions-grid">
          {[0, 1, 2, 3].map(key => <SkeletonCard key={key} />)}
        </div>
      )}

      {current && !result.loading && !result.error && items.length === 0 && (
        <p className="attractions-message">
          No attractions found for this city.
        </p>
      )}

      {!loading && (
        <div className="attractions-grid">
          {items.map((attraction, index) => {
            const key = `${attraction.id ?? index}-${attraction.name}`;
            const imageKey = `${key}-${attraction.imageUrl}`;
            const image = safeUrl(attraction.imageUrl, 'upload.wikimedia.org')
              || safeUrl(attraction.imageUrl, 'thumb.wikimedia.org');
            const source = safeUrl(
              attraction.imagePageUrl,
              'commons.wikimedia.org'
            );
            const website = safeUrl(attraction.website);
            const detailsId = `attraction-details-${index}`;
            const hasVisibleImage = Boolean(
              image && source && !failedImages.has(imageKey)
            );

            const toggleDetails = () => {
              setExpanded(previous => previous === key ? null : key);
            };

            return (
              <article className="attraction-card" key={key}>
                <figure className="attraction-figure">
                  <button
                    type="button"
                    className="attraction-image-toggle"
                    aria-label={`Show details for ${attraction.name || 'Unnamed attraction'}`}
                    aria-expanded={expanded === key}
                    aria-controls={detailsId}
                    onClick={toggleDetails}
                  >
                    {hasVisibleImage ? (
                      <img
                        src={image}
                        alt={attraction.name || 'Attraction'}
                        className="attraction-image"
                        loading="lazy"
                        onError={() => setFailedImages(previous =>
                          new Set(previous).add(imageKey))}
                      />
                    ) : (
                      <span className="attraction-image-placeholder">
                        <svg
                          viewBox="0 0 48 48"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <rect
                            x="7"
                            y="10"
                            width="34"
                            height="28"
                            rx="5"
                          />
                          <circle cx="17" cy="20" r="3" />
                          <path d="M8 33l10-9 8 7 6-5 9 8" />
                        </svg>
                        <span>Photo unavailable</span>
                      </span>
                    )}
                  </button>

                  <figcaption aria-hidden={!hasVisibleImage}>
                    {hasVisibleImage && (
                      <details className="attraction-credit">
                        <summary>Photo credits</summary>
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {attraction.imageAttribution || 'Wikimedia Commons'}
                          {' · '}
                          {attraction.imageLicense || 'Image details'}
                        </a>
                      </details>
                    )}
                  </figcaption>
                </figure>

                <div className="attraction-card-content">
                  <h3 className="attraction-name">
                    <button
                      type="button"
                      className="attraction-toggle"
                      aria-expanded={expanded === key}
                      aria-controls={detailsId}
                      onClick={toggleDetails}
                    >
                      {attraction.name || 'Unnamed attraction'}
                    </button>
                  </h3>

                  <button
                    type="button"
                    className="show-on-map-btn"
                    onClick={() => {
                      const hasCoordinates =
                        Number.isFinite(attraction.latitude)
                        && Number.isFinite(attraction.longitude);

                      onShowAttractionOnMap(hasCoordinates
                        ? `${attraction.latitude},${attraction.longitude}`
                        : `${attraction.name}, ${attraction.city || city}`);

                      document.querySelector('.place-map-container')
                        ?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                        });
                    }}
                  >
                    Show on Map
                  </button>

                  <div
                    id={detailsId}
                    hidden={expanded !== key}
                    className="attraction-details"
                  >
                    {attraction.description && (
                      <p>{attraction.description}</p>
                    )}

                    {attraction.address && (
                      <p><strong>Address:</strong> {attraction.address}</p>
                    )}

                    {attraction.phone && (
                      <p><strong>Phone:</strong> {attraction.phone}</p>
                    )}

                    {attraction.openingHours && (
                      <p><strong>Hours:</strong> {attraction.openingHours}</p>
                    )}

                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit official website
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AttractionComponent;