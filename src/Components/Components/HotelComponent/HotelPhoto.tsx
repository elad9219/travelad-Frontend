import React, { useState } from 'react';
import { HotelDto, HotelPhotoAttribution } from '../../../modal/Hotel';
import './HotelCatalog.css';

export const isCatalogHotel = (hotel: HotelDto): boolean =>
  /^CATALOG_Q[1-9]\d*$/.test(hotel.hotelId);

function trustedLink(
  value: unknown,
  host: string,
  pathPrefix: string
): string | null {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.hostname !== host ||
      url.username ||
      url.password ||
      url.port ||
      !url.pathname.startsWith(pathPrefix)
    ) {
      return null;
    }

    url.protocol = 'https:';

    return url.href;
  } catch {
    return null;
  }
}

export const validPhotoAttribution = (
  value: unknown
): value is HotelPhotoAttribution => {
  if (!value || typeof value !== 'object') return false;

  const photo = value as Record<string, unknown>;

  return ['title', 'author', 'license', 'modifications'].every(
    field =>
      typeof photo[field] === 'string' &&
      (photo[field] as string).trim().length > 0
  ) &&
    !!trustedLink(
      photo.sourceUrl,
      'commons.wikimedia.org',
      '/wiki/File:'
    ) &&
    !!trustedLink(
      photo.licenseUrl,
      'creativecommons.org',
      '/licenses/'
    );
};

interface HotelPhotoProps {
  hotel: HotelDto;
  mockIndex: number;
}

const HotelPhoto: React.FC<HotelPhotoProps> = ({
  hotel,
  mockIndex
}) => {
  const [failed, setFailed] = useState(false);

  const real = isCatalogHotel(hotel);
  const mock = hotel.hotelId.startsWith('MOCK_');

  const path = `/hotel-images/${hotel.hotelId.slice(8)}.webp`;
  const base = process.env.PUBLIC_URL || '';

  if (mock && !failed) {
    return (
      <img
        src={`${base}/hotel-demo-images/hotel-${mockIndex % 10}.webp`}
        alt="AI-generated illustrative hotel"
        className="hotel-image"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const showPhoto =
    real &&
    hotel.imageUrl === path &&
    validPhotoAttribution(hotel.photoAttribution) &&
    !failed;

  return showPhoto ? (
    <img
      src={`${base}${path}`}
      alt={hotel.name}
      className="hotel-image"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`hotel-photo-placeholder${
        real ? ' hotel-photo-unavailable' : ''
      }`}
    >
      <span aria-hidden="true">🏨</span>
      <span>
        {real ? 'Photo unavailable' : 'Illustrative hotel'}
      </span>
    </div>
  );
};

export const HotelPhotoCredit: React.FC<{ hotel: HotelDto }> = ({
  hotel
}) => {
  const photo = hotel.photoAttribution;

  if (
    !isCatalogHotel(hotel) ||
    !validPhotoAttribution(photo)
  ) {
    return null;
  }

  const source = trustedLink(
    photo.sourceUrl,
    'commons.wikimedia.org',
    '/wiki/File:'
  )!;

  const license = trustedLink(
    photo.licenseUrl,
    'creativecommons.org',
    '/licenses/'
  )!;

  return (
    <details
      className="hotel-photo-credit"
      onClick={event => event.stopPropagation()}
    >
      <summary>Photo credits</summary>

      Photo:{' '}

      <a
        href={source}
        target="_blank"
        rel="noopener noreferrer"
        title={photo.title}
      >
        {photo.author}
      </a>

      {' · '}

      <a
        href={license}
        target="_blank"
        rel="noopener noreferrer"
      >
        {photo.license}
      </a>

      {' · '}{photo.modifications}; cropped for display.

      <a
        className="hotel-photo-source-title"
        href={source}
        target="_blank"
        rel="noopener noreferrer"
      >
        {photo.title}
      </a>
    </details>
  );
};

export default HotelPhoto;