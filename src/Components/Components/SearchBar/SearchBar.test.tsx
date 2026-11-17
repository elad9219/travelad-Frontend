import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import SearchBar from './SearchBar';

jest.mock('axios', () => ({ get: jest.fn(), delete: jest.fn() }));
jest.mock('../../../utils/userIdentity', () => ({
  getUserId: () => 'browser-id',
}));
jest.mock('./cleaned-cities.json', () => [
  { name: 'Paris' },
  { name: 'Parma' },
  { name: 'Tokyo' },
]);

const get = axios.get as jest.Mock;
const remove = axios.delete as jest.Mock;

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: any) => void;

  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: ['London', 'Paris'] });
  remove.mockReset().mockResolvedValue({ data: null });
});

afterEach(() => jest.useRealTimers());

function focusInput() {
  const input = screen.getByRole('textbox', { name: 'City name' });
  act(() => input.focus());
  return input;
}

test('Strict Mode dispatches one bounded history request', async () => {
  render(
    <React.StrictMode>
      <SearchBar onSearch={jest.fn()} />
    </React.StrictMode>
  );

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  expect(get.mock.calls[0][1]).toEqual(expect.objectContaining({
    params: { userId: 'browser-id' },
    timeout: 15000,
    signal: expect.any(AbortSignal),
  }));
});

test('a late history response does not overwrite suggestions for typed text', async () => {
  const history = deferred();
  get.mockReturnValue(history.promise);

  render(<SearchBar onSearch={jest.fn()} />);

  const input = focusInput();
  fireEvent.change(input, { target: { value: 'Par' } });

  await act(async () => history.resolve({ data: ['London'] }));

  expect(
    screen.getByRole('button', { name: 'Paris', exact: true })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Parma', exact: true })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'London', exact: true })
  ).not.toBeInTheDocument();
});

test('keyboard navigation selects a city and Escape returns focus to the input', async () => {
  const search = jest.fn();
  render(<SearchBar onSearch={search} />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const input = focusInput();
  fireEvent.change(input, { target: { value: 'Par' } });
  fireEvent.keyDown(input, { key: 'ArrowDown' });

  const paris = screen.getByRole('button', { name: 'Paris', exact: true });
  expect(paris).toHaveFocus();

  fireEvent.keyDown(paris, { key: 'ArrowDown' });

  const parma = screen.getByRole('button', { name: 'Parma', exact: true });
  expect(parma).toHaveFocus();

  fireEvent.keyDown(parma, { key: 'Escape' });

  expect(input).toHaveFocus();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();

  fireEvent.submit(input.closest('form')!);
  expect(search).toHaveBeenCalledWith('Par');

  fireEvent.keyDown(input, { key: 'ArrowDown' });
  userEvent.keyboard('{Enter}');

  expect(search).toHaveBeenLastCalledWith('Paris');
});

test('submits trimmed city names without altering reserved characters', () => {
  const search = jest.fn();
  render(<SearchBar onSearch={search} />);

  const input = focusInput();
  fireEvent.change(input, { target: { value: '  A+B%20C  ' } });
  fireEvent.submit(input.closest('form')!);

  expect(search).toHaveBeenCalledWith('A+B%20C');
});

test.each([' ', 'x'.repeat(121), 'Paris\u0001probe'])(
  'invalid input does not invoke search: %s',
  value => {
    const search = jest.fn();
    render(<SearchBar onSearch={search} />);

    const input = focusInput();
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input.closest('form')!);

    expect(search).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  }
);

test('composition does not submit an unfinished city name', () => {
  const search = jest.fn();
  render(<SearchBar onSearch={search} />);

  const input = focusInput();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: '東京' } });
  fireEvent.submit(input.closest('form')!);

  expect(search).not.toHaveBeenCalled();

  fireEvent.compositionEnd(input);
  fireEvent.submit(input.closest('form')!);

  expect(search).toHaveBeenCalledWith('東京');
});

test('history failures do not block searching and allow a manual reload', async () => {
  get.mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({ data: ['Rome'] });

  const search = jest.fn();
  render(<SearchBar onSearch={search} />);

  await screen.findByText(/Recent searches are temporarily unavailable/);

  fireEvent.click(screen.getByRole('button', { name: 'Explore Paris' }));
  expect(search).toHaveBeenCalledWith('Paris');

  fireEvent.click(
    screen.getByRole('button', { name: 'Reload recent searches' })
  );

  await waitFor(() => expect(
    screen.queryByText(/Recent searches are temporarily unavailable/)
  ).not.toBeInTheDocument());

  const input = focusInput();
  fireEvent.change(input, { target: { value: '' } });

  expect(
    await screen.findByRole('button', { name: 'Rome', exact: true })
  ).toBeInTheDocument();
});

test('catalog suggestions have no removal action unless they are in history', async () => {
  get.mockResolvedValue({ data: [] });
  render(<SearchBar onSearch={jest.fn()} />);

  const input = focusInput();
  fireEvent.change(input, { target: { value: 'Par' } });

  await screen.findByRole('button', { name: 'Paris', exact: true });

  expect(
    screen.queryByRole('button', { name: /Remove/ })
  ).not.toBeInTheDocument();
});

test('acknowledged deletion updates history without searching or replaying DELETE', async () => {
  const deletion = deferred();
  remove.mockReturnValue(deletion.promise);

  const search = jest.fn();
  render(<SearchBar onSearch={search} />);

  focusInput();

  const button = await screen.findByRole('button', {
    name: 'Remove London from recent searches',
  });

  fireEvent.click(button);
  expect(button).toBeDisabled();

  fireEvent.click(button);
  expect(remove).toHaveBeenCalledTimes(1);

  await act(async () => deletion.resolve({ data: null }));

  expect(
    screen.queryByRole('button', { name: 'London', exact: true })
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Paris', exact: true })
  ).toBeInTheDocument();

  expect(search).not.toHaveBeenCalled();
  expect(get).toHaveBeenCalledTimes(1);
});

test('failed deletion retains history and never automatically repeats the mutation', async () => {
  jest.useFakeTimers();
  remove.mockRejectedValue(new Error('Timeout'));

  render(<SearchBar onSearch={jest.fn()} />);

  focusInput();
  await act(async () => {});

  fireEvent.click(screen.getByRole('button', {
    name: 'Remove London from recent searches',
  }));

  await act(async () => {});

  expect(
    screen.getByText(/Removal could not be confirmed/)
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'London', exact: true })
  ).toBeInTheDocument();

  await act(async () => jest.advanceTimersByTime(90000));

  expect(remove).toHaveBeenCalledTimes(1);
});

test('out-of-order deletion responses preserve other acknowledged deletions', async () => {
  const london = deferred();
  const paris = deferred();

  remove.mockReturnValueOnce(london.promise)
    .mockReturnValueOnce(paris.promise);

  render(<SearchBar onSearch={jest.fn()} />);
  focusInput();

  fireEvent.click(await screen.findByRole('button', {
    name: 'Remove London from recent searches',
  }));
  fireEvent.click(screen.getByRole('button', {
    name: 'Remove Paris from recent searches',
  }));

  await act(async () => paris.resolve({ data: null }));
  await act(async () => london.resolve({ data: null }));

  expect(
    screen.queryByRole('button', { name: /Remove/ })
  ).not.toBeInTheDocument();
});

test('a late history refresh cannot resurrect an acknowledged deletion', async () => {
  const refresh = deferred();

  get.mockResolvedValueOnce({ data: ['London', 'Paris'] })
    .mockReturnValueOnce(refresh.promise);

  const view = render(<SearchBar onSearch={jest.fn()} />);
  focusInput();

  await screen.findByRole('button', {
    name: 'Remove London from recent searches',
  });

  view.rerender(
    <SearchBar onSearch={jest.fn()} historyRevision={1} />
  );

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole('button', {
    name: 'Remove London from recent searches',
  }));

  await act(async () => {});
  await act(async () => refresh.resolve({ data: ['London', 'Paris'] }));

  expect(
    screen.queryByRole('button', { name: 'London', exact: true })
  ).not.toBeInTheDocument();
});

test('successful searches can refresh history through a revision change', async () => {
  get.mockResolvedValueOnce({ data: [] })
    .mockResolvedValueOnce({ data: ['Tokyo'] });

  const view = render(<SearchBar onSearch={jest.fn()} />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  view.rerender(
    <SearchBar onSearch={jest.fn()} historyRevision={1} />
  );

  focusInput();

  await screen.findByRole('button', { name: 'Tokyo', exact: true });

  expect(get).toHaveBeenCalledTimes(2);
});

test.each([
  { data: null },
  { data: ['Paris', {}] },
])(
  'invalid history is not silently presented as empty: %j',
  async ({ data }) => {
    get.mockResolvedValue({ data });
    render(<SearchBar onSearch={jest.fn()} />);

    await screen.findByText(/Recent searches are temporarily unavailable/);
  }
);

test('unmounting aborts history reads and ignores a late response', async () => {
  const pending = deferred();
  get.mockReturnValue(pending.promise);

  const view = render(<SearchBar onSearch={jest.fn()} />);

  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

  const signal = get.mock.calls[0][1].signal;
  view.unmount();

  expect(signal.aborted).toBe(true);

  await act(async () => pending.resolve({ data: ['Paris'] }));
});

test('history refresh during deletion waits for acknowledgement before reading', async () => {
  const deletion = deferred();
  remove.mockReturnValue(deletion.promise);

  get.mockResolvedValueOnce({ data: ['London', 'Paris'] })
    .mockResolvedValueOnce({ data: ['Tokyo', 'Paris'] });

  const view = render(<SearchBar onSearch={jest.fn()} />);
  focusInput();

  fireEvent.click(await screen.findByRole('button', {
    name: 'Remove London from recent searches',
  }));

  view.rerender(
    <SearchBar onSearch={jest.fn()} historyRevision={1} />
  );

  await act(async () => {});
  expect(get).toHaveBeenCalledTimes(1);

  await act(async () => deletion.resolve({ data: null }));

  await screen.findByRole('button', { name: 'Tokyo', exact: true });

  expect(get).toHaveBeenCalledTimes(2);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole('button', { name: 'London', exact: true })
  ).not.toBeInTheDocument();
});