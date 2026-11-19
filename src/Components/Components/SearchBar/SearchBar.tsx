import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './SearchBar.css';
import globals from '../../../utils/globals';
import { getCitySuggestions, normalizeCitySearch } from './citySuggestions';
import { getUserId } from '../../../utils/userIdentity';
import { cityLabel } from '../../../utils/cityPresentation';

interface SearchBarProps {
  onSearch: (city: string) => void;
  historyRevision?: number;
}

const popularCities = ['London', 'Paris', 'New York', 'Cape Town', 'Rome'];

const validCity = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 120 &&
  Boolean(value.trim()) &&
  !Array.from(value).some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159);
  });

const cityKey = (city: string) => city.trim().toLowerCase();

const unique = (values: string[]) => {
  const seen = new Set<string>();

  return values.map(value => value.trim()).filter(value => {
    const key = cityKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const suggestionStyle: React.CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  flex: 1,
  cursor: 'pointer',
};

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  historyRevision = 0,
}) => {
  const [userId] = useState(getUserId);
  const [placeName, setPlaceName] = useState('');
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputError, setInputError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [removalError, setRemovalError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);

  const [catalog, setCatalog] = useState<{
    query: string;
    names: string[];
    failed: boolean;
  }>({
    query: '',
    names: [],
    failed: false,
  });

  const input = useRef<HTMLInputElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const focusPending = useRef(false);
  const composing = useRef(false);
  const selectedQuery = useRef<string | null>(null);
  const active = useRef(false);
  const generation = useRef(0);
  const historyController = useRef<AbortController | null>(null);
  const pendingDeletes = useRef(new Map<string, AbortController>());
  const refreshPending = useRef(false);
  const suggestionsId = useId();

  const query = normalizeCitySearch(placeName);

  useEffect(() => {
    if (!showSuggestions || !query) return;

    let active = true;

    const timer = setTimeout(() => {
      getCitySuggestions(query)
        .then(names => {
          if (active) {
            setCatalog({ query, names, failed: false });
          }
        })
        .catch(() => {
          if (active) {
            setCatalog({ query, names: [], failed: true });
          }
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, showSuggestions]);

  const suggestions = useMemo(() => {
    if (!query) return recentCities.slice(0, 8);
    if (catalog.query !== query) return [];

    return unique([
      ...catalog.names.filter(validCity),
      ...recentCities.filter(city =>
        normalizeCitySearch(city).startsWith(query)
      ),
    ]).slice(0, 8);
  }, [query, catalog, recentCities]);

  const loadHistory = useCallback(() => {
    if (pendingDeletes.current.size) {
      refreshPending.current = true;
      return;
    }

    const id = ++generation.current;
    historyController.current?.abort();

    const controller = new AbortController();
    historyController.current = controller;

    setHistoryLoading(true);
    setHistoryError('');

    Promise.resolve().then(async () => {
      if (!active.current || id !== generation.current) return;

      try {
        const response = await axios.get<unknown>(globals.api.cacheCities, {
          params: { userId },
          signal: controller.signal,
          timeout: 15000,
        });

        if (!active.current || id !== generation.current) return;

        if (
          !Array.isArray(response.data) ||
          !response.data.every(validCity)
        ) {
          throw new Error('Invalid history response');
        }

        setRecentCities(unique(response.data).slice(0, 10));
        setActiveIndex(-1);
      } catch {
        if (active.current && id === generation.current) {
          setHistoryError(
            'Recent searches are temporarily unavailable. You can still search.'
          );
        }
      } finally {
        if (active.current && id === generation.current) {
          setHistoryLoading(false);
        }
      }
    });
  }, [userId]);

  useEffect(() => {
    const deletions = pendingDeletes.current;
    active.current = true;

    return () => {
      active.current = false;
      generation.current += 1;
      historyController.current?.abort();
      deletions.forEach(controller => controller.abort());
    };
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, historyRevision]);

  useEffect(() => {
    if (focusPending.current && showSuggestions) {
      options.current[activeIndex]?.focus();
      focusPending.current = false;
    }
  }, [activeIndex, showSuggestions]);

  const selectCity = (value: string) => {
    if (!validCity(value)) {
      setInputError('Enter a city name of up to 120 characters.');
      return;
    }

    const city = value.trim();

    selectedQuery.current = city;
    setPlaceName(cityLabel(city, suggestions));
    setInputError('');
    setActiveIndex(-1);
    setShowSuggestions(false);
    onSearch(city);
  };

  const focusSuggestion = (index: number) => {
    if (!suggestions.length) return;

    setShowSuggestions(true);
    setActiveIndex(index);
    focusPending.current = true;

    // The index may already be selected after focus moved to a sibling control.
    if (options.current[index]) {
      options.current[index]?.focus();
      focusPending.current = false;
    }
  };

  const closeSuggestions = () => {
    input.current?.focus();
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const removeCity = async (city: string) => {
    const key = cityKey(city);

    if (pendingDeletes.current.has(key)) return;

    const controller = new AbortController();
    pendingDeletes.current.set(key, controller);
    setDeleting(Array.from(pendingDeletes.current.keys()));
    setRemovalError('');

    generation.current += 1;
    historyController.current?.abort();
    setHistoryLoading(false);

    try {
      await axios.delete(globals.api.cacheCities, {
        params: { userId, city },
        signal: controller.signal,
        timeout: 15000,
      });

      if (!active.current) return;

      setRecentCities(previous =>
        previous.filter(value => cityKey(value) !== key)
      );

      setActiveIndex(-1);
      input.current?.focus();
    } catch {
      if (active.current) {
        setRemovalError(
          'Removal could not be confirmed. Reload recent searches to check.'
        );
      }
    } finally {
      pendingDeletes.current.delete(key);

      if (active.current) {
        setDeleting(Array.from(pendingDeletes.current.keys()));

        if (!pendingDeletes.current.size && refreshPending.current) {
          refreshPending.current = false;
          loadHistory();
        }
      }
    }
  };

  return (
    <div
      className="search-section"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setShowSuggestions(false);
          setActiveIndex(-1);
        }
      }}
    >
      <img
        src="https://i.postimg.cc/15rbQdXx/travelad-logo.png"
        alt="Travelad Logo"
        className="logo"
      />

      <h1>Search for a Place</h1>

      <form
        className="search-bar"
        onSubmit={event => {
          event.preventDefault();
          if (!composing.current) {
            selectCity(selectedQuery.current || placeName);
          }
        }}
      >
        <input
          ref={input}
          type="text"
          value={placeName}
          maxLength={120}
          aria-label="City name"
          aria-controls={showSuggestions ? suggestionsId : undefined}
          aria-invalid={Boolean(inputError)}
          autoComplete="off"
          onChange={event => {
            selectedQuery.current = null;
            setPlaceName(event.target.value);
            setInputError('');
            setActiveIndex(-1);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setShowSuggestions(true);
            setActiveIndex(-1);
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={event => {
            if (
              composing.current ||
              event.nativeEvent.isComposing ||
              event.keyCode === 229
            ) {
              if (event.key === 'Enter') event.preventDefault();
              return;
            }

            if (event.key === 'ArrowDown' && suggestions.length) {
              event.preventDefault();
              focusSuggestion(0);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              closeSuggestions();
            }
          }}
          placeholder="Enter a city name"
          className="search-input"
        />

        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {inputError && <p role="alert">{inputError}</p>}

      <div className="popular-cities-container">
        {popularCities.map(city => (
          <button
            key={city}
            type="button"
            className="popular-city-btn"
            onClick={() => selectCity(city)}
          >
            Explore {city}
          </button>
        ))}
      </div>

      {(historyError || removalError) && (
        <div role="status">
          <p>{historyError || removalError}</p>
          <button
            type="button"
            className="popular-city-btn"
            disabled={historyLoading || deleting.length > 0}
            onClick={() => {
              setRemovalError('');
              loadHistory();
            }}
          >
            Reload recent searches
          </button>
        </div>
      )}

      {showSuggestions && query && catalog.query === query && catalog.failed && (
        <p role="status">
          City suggestions are temporarily unavailable. You can still search.
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="recent-cities">
          <ul id={suggestionsId} aria-label="City suggestions">
            {suggestions.map((city, index) => (
              <li
                key={cityKey(city)}
                className={index === activeIndex ? 'active' : ''}
              >
                <button
                  type="button"
                  ref={element => {
                    options.current[index] = element;
                  }}
                  style={suggestionStyle}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => selectCity(city)}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      focusSuggestion(
                        Math.min(index + 1, suggestions.length - 1)
                      );
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();

                      if (index === 0) input.current?.focus();
                      else focusSuggestion(index - 1);
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      closeSuggestions();
                    }
                  }}
                >
                  {cityLabel(city, suggestions)}
                </button>

                {recentCities.some(
                  value => cityKey(value) === cityKey(city)
                ) && (
                  <button
                    type="button"
                    className="remove-btn"
                    aria-label={`Remove ${city} from recent searches`}
                    disabled={deleting.includes(cityKey(city))}
                    onClick={() => removeCity(city)}
                  >
                    X
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <small className="city-data-credit">
        City data: <a
          href="https://www.geonames.org/"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit' }}
        >
          GeoNames
        </a>
        {' · '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit' }}
        >
          CC BY 4.0
        </a>
      </small>
    </div>
  );
};

export default SearchBar;