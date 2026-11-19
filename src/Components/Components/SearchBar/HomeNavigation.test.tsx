import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  MemoryRouter,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import axios from 'axios';
import SearchBar from './SearchBar';

jest.mock('axios', () => ({
  get: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../../utils/userIdentity', () => ({
  getUserId: () => 'browser-id',
}));

jest.mock('./citySuggestions', () => ({
  normalizeCitySearch: (value: string) =>
    value.trim().toLowerCase(),
  getCitySuggestions: () => Promise.resolve([]),
}));

function Harness() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      <SearchBar
        onSearch={city =>
          navigate(`/${encodeURIComponent(city)}`)
        }
      />

      <output data-testid="path">
        {pathname}
      </output>

      <button onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

beforeEach(() => {
  (axios.get as jest.Mock).mockResolvedValue({
    data: ['London', 'Paris'],
  });
});

test('home link resets the search while preserving history and the browser identity', async () => {
  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>
  );

  await waitFor(() =>
    expect(axios.get).toHaveBeenCalledTimes(1)
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Explore Paris' })
  );

  expect(screen.getByTestId('path')).toHaveTextContent('/Paris');

  const input = screen.getByRole('textbox', {
    name: 'City name',
  });

  expect(input).toHaveValue('Paris');

  fireEvent.click(
    screen.getByRole('link', { name: 'Travelad home' })
  );

  expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/);
  expect(input).toHaveValue('');

  fireEvent.focus(input);

  expect(
    await screen.findByRole('button', { name: 'London' })
  ).toBeInTheDocument();

  expect(axios.delete).not.toHaveBeenCalled();
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('browser back to the home route also resets the search', async () => {
  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>
  );

  await waitFor(() =>
    expect(axios.get).toHaveBeenCalledTimes(1)
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Explore Paris' })
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Back' })
  );

  expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/);

  expect(
    screen.getByRole('textbox', { name: 'City name' })
  ).toHaveValue('');
});