import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import './AttractionComponent.css';
import { Attraction } from '../../../modal/Attraction';
import globals from '../../../utils/globals';
import SkeletonCard from '../SkeletonCard/SkeletonCard';

interface AttractionComponentProps {
  city: string;
  onShowAttractionOnMap: (query: string) => void;
}

const REQUEST_TIMEOUT_MS = 125000;

const textFields = [
  'name',
  'city',
  'country',
  'description',
  'address',
  'phone',
  'website',
  'openingHours',
  'imageUrl',
  'imagePageUrl',
  'imageAttribution',
  'imageLicense',
];

const readAttractions = (data: unknown): Attraction[] => {
  if (
    !Array.isArray(data) ||
    !data.every(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }

      const record = item as Record<string, unknown>;

      return (
        textFields.every(
          field =>
            record[field] == null || typeof record[field] === 'string'
        ) &&
        ['latitude', 'longitude'].every(
          field =>
            record[field] == null ||
            (
              typeof record[field] === 'number' &&
              Number.isFinite(record[field])
            )
        ) &&
        (
          record.id == null ||
          (
            typeof record.id === 'number' &&
            Number.isSafeInteger(record.id)
          )
        ) &&
        (
          typeof record.name === 'string' ||
          (
            typeof record.latitude === 'number' &&
            typeof record.longitude === 'number' &&
            Math.abs(record.latitude) <= 90 &&
            Math.abs(record.longitude) <= 180
          )
        )
      );
    })
  ) {
    throw new Error('Invalid attractions response');
  }

  return data;
};

const safeUrl = (
  value?: string,
  host?: string
): string | undefined => {
  try {
    const url = new URL(value || '');

    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }

    if (
      host &&
      (
        url.protocol !== 'https:' ||
        url.hostname !== host ||
        url.port
      )
    ) {
      return undefined;
    }

    return url.href;
  } catch {
    return undefined;
  }
};

const revealInScrollport = (element: HTMLElement) => {
  let parent = element.parentElement;

  while (parent) {
    if (
      /auto|scroll/.test(getComputedStyle(parent).overflowY) &&
      parent.clientHeight > 0
    ) {
      const bounds = element.getBoundingClientRect();
      const top =
        parent.getBoundingClientRect().top + parent.clientTop + 8;
      const bottom = top + parent.clientHeight - 16;

      if (bounds.top < top || bounds.height > bottom - top) {
        parent.scrollTop += bounds.top - top;
      } else if (bounds.bottom > bottom) {
        parent.scrollTop += bounds.bottom - bottom;
      }

      return;
    }

    parent = parent.parentElement;
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

  const [expanded, setExpanded] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(
    new Set()
  );
  const [attempt, setAttempt] = useState(0);
  const [columns, setColumns] = useState(1);

  const gridRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const instanceId = useId();

  useLayoutEffect(() => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const measure = () => {
      const width = grid.clientWidth;

      setColumns(width >= 950 ? 3 : width >= 520 ? 2 : 1);
    };

    measure();

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);

    observer?.observe(grid);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useLayoutEffect(() => {
    if (expanded !== null && detailsRef.current) {
      detailsRef.current.focus({ preventScroll: true });
      revealInScrollport(detailsRef.current);
    } else if (restoreFocus.current && triggerRef.current?.isConnected) {
      triggerRef.current.focus({ preventScroll: true });
      revealInScrollport(triggerRef.current);
    }

    restoreFocus.current = false;
  }, [expanded]);

  const toggleDetails = (
    index: number,
    button: HTMLButtonElement
  ) => {
    triggerRef.current = button;
    restoreFocus.current = expanded === index;
    setExpanded(expanded === index ? null : index);
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    restoreFocus.current = false;
    triggerRef.current = null;

    setExpanded(null);
    setFailedImages(new Set());
    setResult({
      city,
      items: [],
      error: false,
      loading: Boolean(city),
    });

    // Discard effects cleaned up before dispatch, including Strict Mode replay.
    Promise.resolve().then(async () => {
      if (!city || !active) {
        return;
      }

      try {
        const response = await axios.get<unknown>(
          globals.api.attractions,
          {
            params: { city },
            signal: controller.signal,
            timeout: REQUEST_TIMEOUT_MS,
          }
        );

        if (!active) {
          return;
        }

        const items = readAttractions(response.data);

        setResult({
          city,
          items,
          error: false,
          loading: false,
        });
      } catch {
        if (active) {
          setResult({
            city,
            items: [],
            error: true,
            loading: false,
          });
        }
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [city, attempt]);

  const current = result.city === city;
  const loading = Boolean(city) && (!current || result.loading);
  const items = current ? result.items : [];

  const detailId = (index: number) =>
    `${instanceId}-attraction-details-${index}`;

  return (
    <section
      className="attractions-container"
      aria-label={`Attractions in ${city.split(',')[0].trim()}`}
      aria-busy={loading}
    >
      <header className="attractions-header">
        <h2 className="attractions-title">
          🎡 Attractions in {city.split(',')[0].trim()}
        </h2>

        {current && !loading && !result.error && Boolean(city) && (
          <span className="attractions-count">
            {items.length}{' '}
            {items.length === 1 ? 'attraction' : 'attractions'}
          </span>
        )}

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
          </a>
          . Images: Wikimedia Commons.
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

      {Boolean(city) &&
        current &&
        !result.loading &&
        !result.error &&
        items.length === 0 && (
          <p className="attractions-message">
            No attractions found for this city.
          </p>
        )}

      <div
        className="attractions-grid"
        ref={gridRef}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {loading
          ? [0, 1, 2, 3].map(key => <SkeletonCard key={key} />)
          : items.flatMap((attraction, index) => {
              const key =
                `${index}-${attraction.id}-${attraction.name}`;

              const imageKey = `${key}-${attraction.imageUrl}`;

              const image =
                safeUrl(attraction.imageUrl, 'upload.wikimedia.org') ||
                safeUrl(attraction.imageUrl, 'thumb.wikimedia.org');

              const source = safeUrl(
                attraction.imagePageUrl,
                'commons.wikimedia.org'
              );

              const detailsId = detailId(index);
              const selected = expanded === index;

              const hasVisibleImage = Boolean(
                image && source && !failedImages.has(imageKey)
              );

              const card = (
                <article
                  className={
                    `attraction-card${
                      selected ? ' attraction-card-selected' : ''
                    }`
                  }
                  key={key}
                >
                  <figure className="attraction-figure">
                    <button
                      type="button"
                      className="attraction-image-toggle"
                      aria-label={
                        `Show details for ${
                          attraction.name || 'Unnamed attraction'
                        }`
                      }
                      aria-expanded={selected}
                      aria-controls={detailsId}
                      onClick={event =>
                        toggleDetails(index, event.currentTarget)
                      }
                    >
                      {hasVisibleImage ? (
                        <img
                          src={image}
                          alt={attraction.name || 'Attraction'}
                          className="attraction-image"
                          loading="lazy"
                          onError={() =>
                            setFailedImages(previous =>
                              new Set(previous).add(imageKey)
                            )
                          }
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
                            {attraction.imageAttribution ||
                              'Wikimedia Commons'}
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
                        aria-expanded={selected}
                        aria-controls={detailsId}
                        onClick={event =>
                          toggleDetails(index, event.currentTarget)
                        }
                      >
                        {attraction.name || 'Unnamed attraction'}
                      </button>
                    </h3>

                    <button
                      type="button"
                      className="show-on-map-btn"
                      aria-label="Show on Map"
                      onClick={() => {
                        const name = attraction.name?.trim();

                        const hasCoordinates =
                          typeof attraction.latitude === 'number' &&
                          Number.isFinite(attraction.latitude) &&
                          Math.abs(attraction.latitude) <= 90 &&
                          typeof attraction.longitude === 'number' &&
                          Number.isFinite(attraction.longitude) &&
                          Math.abs(attraction.longitude) <= 180;

                        const query = name
                          ? [
                              name,
                              attraction.address,
                              attraction.city || city,
                              attraction.country,
                            ]
                              .map(value => value?.trim())
                              .filter(Boolean)
                              .join(', ')
                          : hasCoordinates
                            ? `${attraction.latitude},${attraction.longitude}`
                            : city;

                        onShowAttractionOnMap(query);

                        document
                          .querySelector('.place-map-container')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                      }}
                    >
                      <span aria-hidden="true">📍</span> Map
                    </button>

                    <button
                      type="button"
                      className="attraction-view-details"
                      aria-expanded={selected}
                      aria-controls={detailsId}
                      onClick={event =>
                        toggleDetails(index, event.currentTarget)
                      }
                    >
                      {selected ? 'Hide details ▴' : 'View details ▾'}
                    </button>
                  </div>
                </article>
              );

              if (
                (index + 1) % columns !== 0 &&
                index !== items.length - 1
              ) {
                return [card];
              }

              const rowStart = index - index % columns;

              return [
                card,
                ...items
                  .slice(rowStart, index + 1)
                  .map((item, offset) => {
                    const itemIndex = rowStart + offset;
                    const open = expanded === itemIndex;
                    const website = safeUrl(item.website);

                    return (
                      <div
                        key={detailId(itemIndex)}
                        id={detailId(itemIndex)}
                        hidden={!open}
                        ref={open ? detailsRef : undefined}
                        tabIndex={-1}
                        className="attraction-details"
                        role="region"
                        aria-label={
                          `Details for ${
                            item.name || 'Unnamed attraction'
                          }`
                        }
                      >
                        <h3>
                          {item.name || 'Unnamed attraction'}
                        </h3>

                        {item.description && (
                          <p>{item.description}</p>
                        )}

                        {item.address && (
                          <p>
                            <strong>Address:</strong> {item.address}
                          </p>
                        )}

                        {item.phone && (
                          <p>
                            <strong>Phone:</strong> {item.phone}
                          </p>
                        )}

                        {item.openingHours && (
                          <p>
                            <strong>Hours:</strong> {item.openingHours}
                          </p>
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

                        {!item.description &&
                          !item.address &&
                          !item.phone &&
                          !item.openingHours &&
                          !website && (
                            <p>No additional details available.</p>
                          )}

                        <button
                          type="button"
                          className="attraction-view-details"
                          onClick={() => {
                            restoreFocus.current = true;
                            setExpanded(null);
                          }}
                        >
                          Close details
                        </button>
                      </div>
                    );
                  }),
              ];
            })}
      </div>
    </section>
  );
};

export default AttractionComponent;