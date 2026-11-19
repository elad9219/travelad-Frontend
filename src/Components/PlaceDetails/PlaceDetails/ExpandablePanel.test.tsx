import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import PlaceDetails from './PlaceDetails';

jest.mock('axios', () => ({ get: jest.fn() }));

jest.mock('../../../utils/backendReadiness', () => ({
  warmBackend: () => Promise.resolve(),
  waitForBackend: () => Promise.resolve(),
}));

jest.mock('../../Components/SearchBar/SearchBar', () => ({ onSearch }: any) => (
  <button onClick={() => onSearch('Barcelona')}>Barcelona</button>
));

jest.mock('../../Components/FlightComponent/FlightComponent', () => () => (
  <input aria-label="Flight filter" defaultValue="" />
));

jest.mock('../../Components/HotelComponent/HotelComponent', () => ({ onShowHotelOnMap }: any) => (
  <button
    onClick={() => {
      onShowHotelOnMap('Hotel location');

      globalThis.HTMLElement.prototype.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }}
  >
    Show hotel on map
  </button>
));

jest.mock('../../Components/AttractionComponent/AttractionComponent', () => () => (
  <div>Attraction results</div>
));

jest.mock('../../Components/WeatherComponent/WeatherComponent', () => () => null);

jest.mock('../../Components/MapComponent/MapComponent', () => ({ query }: any) => (
  <div role="region" aria-label="Map">{query}</div>
));

jest.mock('../../Components/Loader/Loader', () => () => null);

beforeEach(() => {
  // JSDOM does not implement the native dialog lifecycle.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });

  (axios.get as jest.Mock).mockImplementation((_url, { params }) =>
    Promise.resolve({
      data: {
        name: params.city,
        placeId: `id-${params.city}`,
        country: 'Country',
      },
    })
  );
});

function show() {
  return render(
    <MemoryRouter initialEntries={['/Paris']}>
      <Routes>
        <Route path="/:cityName" element={<PlaceDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

test('opens the same results in a modal, locks scrolling and restores state on cancel', async () => {
  show();

  const filter = await screen.findByRole('textbox', {
    name: 'Flight filter',
  });

  fireEvent.change(filter, {
    target: { value: 'Direct only' },
  });

  const expand = screen.getByRole('button', {
    name: 'Expand flights',
  });

  fireEvent.click(expand);

  const modal = screen.getByRole('dialog', {
    name: 'Expanded flights',
  });

  expect(modal).toContainElement(filter);
  expect(expand).toHaveAttribute('aria-expanded', 'true');
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.documentElement.style.overflow).toBe('hidden');

  expect(
    screen.getByRole('button', { name: 'Close expanded flights' })
  ).toHaveFocus();

  expect(
    screen.getByRole('textbox', { name: 'Flight filter' })
  ).toBe(filter);

  expect(filter).toHaveValue('Direct only');

  fireEvent(
    modal,
    new Event('cancel', {
      bubbles: false,
      cancelable: true,
    })
  );

  expect(modal).not.toHaveAttribute('open');
  expect(document.body.style.overflow).toBe('');
  expect(document.documentElement.style.overflow).toBe('');

  expect(
    screen.getByRole('button', { name: 'Expand flights' })
  ).toHaveFocus();

  expect(filter).toHaveValue('Direct only');
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('close button and backdrop close the modal, and changing city releases the scroll lock', async () => {
  show();

  fireEvent.click(
    await screen.findByRole('button', { name: 'Expand flights' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Close expanded flights' })
  );

  expect(
    screen.getByRole('button', { name: 'Expand flights' })
  ).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(
    screen.getByRole('button', { name: 'Expand hotels' })
  );

  fireEvent.click(
    screen.getByRole('dialog', { name: 'Expanded hotels' })
  );

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Expand attractions' })
  );

  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(axios.get).toHaveBeenCalledTimes(1);

  fireEvent.click(
    screen.getByRole('button', { name: 'Barcelona' })
  );

  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

  expect(
    await screen.findByRole('button', { name: 'Expand attractions' })
  ).toBeInTheDocument();

  expect(document.body.style.overflow).toBe('');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('showing a hotel on the map closes the modal before scrolling to the updated map', async () => {
  show();

  fireEvent.click(
    await screen.findByRole('button', { name: 'Expand hotels' })
  );

  const original = HTMLElement.prototype.scrollIntoView;

  const scroll = jest.fn(() =>
    expect(document.body.style.overflow).toBe('')
  );

  HTMLElement.prototype.scrollIntoView = scroll;

  try {
    fireEvent.click(
      screen.getByRole('button', { name: 'Show hotel on map' })
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(
      screen.getByRole('region', { name: 'Map' })
    ).toHaveTextContent('Hotel location');

    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
});