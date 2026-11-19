import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import axios from 'axios';
import PlaceDetails from './PlaceDetails';

const mockWeather = jest.fn();
const mockHotels = jest.fn();

const barcelona = 'Barcelona, Catalonia, Spain';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

jest.mock('../../../utils/backendReadiness', () => ({
  warmBackend: () => Promise.resolve(),
  waitForBackend: () => Promise.resolve(),
}));

jest.mock(
  '../../Components/SearchBar/SearchBar',
  () => ({ onSearch }: any) => (
    <button onClick={() => onSearch('Barcelona, Catalonia, Spain')}>
      Barcelona
    </button>
  )
);

jest.mock(
  '../../Components/WeatherComponent/WeatherComponent',
  () => ({ city, displayName }: any) => {
    mockWeather(city, displayName);

    return <div data-testid="weather">{city}</div>;
  }
);

jest.mock(
  '../../Components/HotelComponent/HotelComponent',
  () => ({ cityName, countryName }: any) => {
    mockHotels(cityName, countryName);

    return null;
  }
);

jest.mock(
  '../../Components/FlightComponent/FlightComponent',
  () => () => null
);

jest.mock(
  '../../Components/AttractionComponent/AttractionComponent',
  () => () => null
);

jest.mock(
  '../../Components/MapComponent/MapComponent',
  () => () => null
);

jest.mock(
  '../../Components/Loader/Loader',
  () => () => null
);

test('never renders a new city with coordinates or country from the previous city', async () => {
  const get = axios.get as jest.Mock;

  get.mockResolvedValueOnce({
    data: {
      name: 'Paris',
      placeId: 'paris-id',
      country: 'France',
      latitude: 48.85,
      longitude: 2.35,
    },
  }).mockResolvedValueOnce({
    data: {
      name: 'Barcelona',
      placeId: 'barcelona-id',
      country: 'Spain',
      latitude: 41.38,
      longitude: 2.16,
    },
  });

  render(
    <MemoryRouter initialEntries={['/Paris']}>
      <Routes>
        <Route path="/:cityName" element={<PlaceDetails />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByTestId('weather');

  fireEvent.click(
    screen.getByRole('button', { name: 'Barcelona' })
  );

  await waitFor(() =>
    expect(screen.getByTestId('weather'))
      .toHaveTextContent('41.38,2.16')
  );

  expect(mockWeather).not.toHaveBeenCalledWith(
    '48.85,2.35',
    expect.any(String)
  );

  expect(mockHotels).not.toHaveBeenCalledWith(
    barcelona,
    'France'
  );

  expect(mockHotels).toHaveBeenCalledWith(
    barcelona,
    'Spain'
  );

  expect(get).toHaveBeenCalledTimes(2);
});