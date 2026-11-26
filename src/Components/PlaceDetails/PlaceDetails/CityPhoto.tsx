import React, { useState } from 'react';
import { City } from '../../../modal/City';
import PhotoAttributions from '../../Components/PhotoAttributions/PhotoAttributions';
import catalog from './cityPhotoCatalog.json';
import './CityPhoto.css';

type CityPhotoEntry = {
  key: string;
  cities: string[];
  countries: string[];
  alt: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  position: string;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function findCityPhoto(
  place: City
): CityPhotoEntry | undefined {
  const city = normalize((place.name || '').split(',')[0]);

  const country = normalize(
    place.country?.trim() ||
    place.address?.split(',').pop() ||
    ''
  );

  return catalog.find(
    entry =>
      entry.cities.includes(city) &&
      entry.countries.includes(country)
  );
}

const remotePhoto = (value?: string) => {
  try {
    const url = new URL(value || '');

    return url.protocol === 'https:' &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};

export default function CityPhoto({
  place,
}: {
  place: City;
}) {
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const entry = findCityPhoto(place);

  const local = entry
    ? `${process.env.PUBLIC_URL || ''}/city-images/${entry.key}.webp`
    : undefined;

  const remote = remotePhoto(place.icon);

  const src =
    local && !failed.has(local)
      ? local
      : remote && !failed.has(remote)
        ? remote
        : undefined;

  const curated = Boolean(src && src === local && entry);

  const label =
    place.address || place.name || 'Unknown address';

  return (
    <div className="place-image city-photo">
      {src && (
        <img
          key={src}
          className="city-photo-image"
          src={src}
          alt={
            curated && entry
              ? entry.alt
              : `Photo of ${place.name || 'the destination'}`
          }
          style={{
            objectPosition:
              curated && entry ? entry.position : 'center',
          }}
          onError={() =>
            setFailed(previous => new Set(previous).add(src))
          }
        />
      )}

      <div
        className="city-photo-shade"
        aria-hidden="true"
      />

      {curated && entry ? (
        <details className="city-photo-credit">
          <summary>Photo credits</summary>

          <div>
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {entry.author}
            </a>

            {' · '}

            <a
              href={entry.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {entry.license}
            </a>

            <small>
              Wikimedia Commons · Resized and converted to WebP;
              display may crop.
            </small>
          </div>
        </details>
      ) : (
        src && (
          <PhotoAttributions values={place.photoAttributions} />
        )
      )}

      <div className="place-address">{label}</div>
    </div>
  );
}