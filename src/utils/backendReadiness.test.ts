export {};

jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: (error: any) => Boolean(error?.isAxiosError),
}));

let readiness: typeof import('./backendReadiness');
let get: jest.Mock;

const ready = () => ({
  status: 200,
  data: {
    swagger: '2.0',
    paths: {},
  },
});

const unavailable = (status: number) => ({
  isAxiosError: true,
  response: { status },
});

async function flush() {
  for (let step = 0; step < 8; step += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  readiness = require('./backendReadiness');
  get = jest.requireMock('axios').get;
});

afterEach(() => {
  jest.useRealTimers();
});

test('shares one read-only warm-up and briefly reuses a ready response', async () => {
  get.mockResolvedValue(ready());

  const first = readiness.warmBackend();
  const second = readiness.warmBackend();

  expect(second).toBe(first);

  await first;
  await readiness.warmBackend();

  expect(get).toHaveBeenCalledTimes(1);
  expect(get).toHaveBeenCalledWith(
    'http://localhost:8080/v2/api-docs',
    { timeout: 8000 }
  );
});

test('retries temporary startup failures and rejects an HTML startup page as readiness', async () => {
  get
    .mockRejectedValueOnce(unavailable(503))
    .mockResolvedValueOnce({
      status: 200,
      data: '<html>Starting App</html>',
    })
    .mockResolvedValueOnce(ready());

  const pending = readiness.warmBackend();

  await flush();
  jest.advanceTimersByTime(2000);
  await flush();
  jest.advanceTimersByTime(2000);

  await pending;

  expect(get).toHaveBeenCalledTimes(3);
});

test('bounds retries and allows a fresh attempt after failure', async () => {
  get.mockRejectedValue(unavailable(503));

  const result = readiness.warmBackend().catch(error => error);

  await flush();

  for (let step = 0; step < 5; step += 1) {
    jest.advanceTimersByTime(2000);
    await flush();
  }

  expect(await result).toBeInstanceOf(Error);
  expect(get).toHaveBeenCalledTimes(6);

  get.mockResolvedValue(ready());

  await readiness.warmBackend();

  expect(get).toHaveBeenCalledTimes(7);
});

test('does not retry a permanent HTTP error', async () => {
  const error = unavailable(401);
  get.mockRejectedValue(error);

  await expect(readiness.warmBackend()).rejects.toBe(error);

  expect(get).toHaveBeenCalledTimes(1);
});

test('one cancelled search does not cancel another waiting search', async () => {
  let resolve!: (value: unknown) => void;

  get.mockReturnValue(
    new Promise(yes => {
      resolve = yes;
    })
  );

  const first = new AbortController();
  const second = new AbortController();

  const cancelled = readiness
    .waitForBackend(first.signal)
    .catch(error => error);

  const remaining = readiness.waitForBackend(second.signal);

  first.abort();

  expect((await cancelled).name).toBe('AbortError');

  resolve(ready());

  await remaining;

  expect(get).toHaveBeenCalledTimes(1);
});

test('does not start a probe for an already cancelled search', async () => {
  const controller = new AbortController();
  controller.abort();

  await expect(
    readiness.waitForBackend(controller.signal)
  ).rejects.toHaveProperty('name', 'AbortError');

  expect(get).not.toHaveBeenCalled();
});

test('checks readiness again after its short cache expires', async () => {
  get.mockResolvedValue(ready());

  await readiness.warmBackend();

  jest.advanceTimersByTime(15001);

  await readiness.warmBackend();

  expect(get).toHaveBeenCalledTimes(2);
});

test.each(['3.0.3', '3.1.0', '3.2.0'])(
  'accepts OpenAPI %s metadata without requiring optional fields', async version => {
    get.mockResolvedValue({ status: 200, data: { openapi: version } });

    await readiness.warmBackend();

    expect(get).toHaveBeenCalledTimes(1);
  }
);

test('uses the new endpoint only when the legacy endpoint is missing', async () => {
  get.mockRejectedValueOnce(unavailable(404))
    .mockResolvedValueOnce({ status: 200, data: { openapi: '3.1.0' } });

  await readiness.warmBackend();

  expect(get.mock.calls.map(([url]) => url)).toEqual([
    'http://localhost:8080/v2/api-docs',
    'http://localhost:8080/v3/api-docs',
  ]);
});

test('does not loop when neither documentation endpoint exists', async () => {
  const missing = unavailable(404);
  get.mockRejectedValue(missing);

  await expect(readiness.warmBackend()).rejects.toBe(missing);

  expect(get).toHaveBeenCalledTimes(2);
});

test('both endpoint reads share one attempt timeout budget', async () => {
  get.mockImplementationOnce(() => {
    jest.setSystemTime(Date.now() + 2500);
    return Promise.reject(unavailable(404));
  }).mockResolvedValueOnce({ status: 200, data: { openapi: '3.1.0' } });

  await readiness.warmBackend();

  expect(get.mock.calls[0][1].timeout).toBe(8000);
  expect(get.mock.calls[1][1].timeout).toBe(5500);
});

test('retries the new endpoint after a temporary startup failure', async () => {
  get.mockRejectedValueOnce(unavailable(404))
    .mockRejectedValueOnce(unavailable(503))
    .mockResolvedValueOnce({ status: 200, data: { openapi: '3.1.0' } });

  const pending = readiness.warmBackend();

  await flush();
  jest.advanceTimersByTime(2000);
  await pending;

  expect(get.mock.calls.map(([url]) => url)).toEqual([
    'http://localhost:8080/v2/api-docs',
    'http://localhost:8080/v3/api-docs',
    'http://localhost:8080/v3/api-docs',
  ]);
});

test('can discover the legacy server again after a rollback', async () => {
  get.mockRejectedValueOnce(unavailable(404))
    .mockResolvedValueOnce({ status: 200, data: { openapi: '3.1.0' } });

  await readiness.warmBackend();

  jest.advanceTimersByTime(15001);
  get.mockResolvedValueOnce(ready());

  await readiness.warmBackend();

  expect(get.mock.calls[2][0]).toBe('http://localhost:8080/v2/api-docs');
});

test.each([{ openapi: '2.0' }, { openapi: '3.invalid' }, { swagger: '2.1' }, []])(
  'rejects an unsupported documentation response: %j', async data => {
    get.mockResolvedValueOnce({ status: 200, data }).mockResolvedValueOnce(ready());

    const pending = readiness.warmBackend();

    await flush();
    jest.advanceTimersByTime(2000);
    await pending;

    expect(get).toHaveBeenCalledTimes(2);
  }
);