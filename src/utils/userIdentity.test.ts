import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'generated-user-id') }));

function freshIdentity() {
  let getUserId!: () => string;

  jest.isolateModules(() => {
    getUserId = require('./userIdentity').getUserId;
  });

  return getUserId;
}

beforeEach(() => {
  jest.clearAllMocks();
  (uuidv4 as jest.Mock).mockReturnValue('generated-user-id');
  localStorage.clear();
});

afterEach(() => jest.restoreAllMocks());

test('reuses a valid existing browser identity', () => {
  localStorage.setItem('userId', 'existing_user-1');

  expect(freshIdentity()()).toBe('existing_user-1');
  expect(uuidv4).not.toHaveBeenCalled();
});

test('creates and persists one identity for repeated consumers', () => {
  const getUserId = freshIdentity();

  expect(getUserId()).toBe('generated-user-id');
  expect(getUserId()).toBe('generated-user-id');
  expect(localStorage.getItem('userId')).toBe('generated-user-id');
  expect(uuidv4).toHaveBeenCalledTimes(1);
});

test('blocked storage access uses the same in-memory identity', () => {
  jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError');
  });

  const getUserId = freshIdentity();

  expect(getUserId()).toBe('generated-user-id');
  expect(getUserId()).toBe('generated-user-id');
  expect(uuidv4).toHaveBeenCalledTimes(1);
});

test('a failed storage write does not break identity creation', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  });

  const getUserId = freshIdentity();

  expect(getUserId()).toBe('generated-user-id');
  expect(getUserId()).toBe('generated-user-id');
  expect(uuidv4).toHaveBeenCalledTimes(1);
});

test.each(['bad id!', 'x'.repeat(129)])(
  'replaces identities rejected by the backend: %s',
  value => {
    localStorage.setItem('userId', value);

    expect(freshIdentity()()).toBe('generated-user-id');
    expect(localStorage.getItem('userId')).toBe('generated-user-id');
  }
);