import React from 'react';
import { render, screen } from '@testing-library/react';
import PhotoAttributions from './PhotoAttributions';

test('shows all author credits and safe links without injecting provider HTML', () => {
  const { container } = render(
    <PhotoAttributions
      values={[
        'Photo by <a href="https://www.google.com/maps/contrib/123">Alice &amp; Co</a>',
        '<a href="https://example.org/author"><strong>Bob</strong></a> · Jane',
      ]}
    />
  );

  expect(
    screen.getByRole('link', { name: 'Alice & Co' })
  ).toHaveAttribute(
    'href',
    'https://www.google.com/maps/contrib/123'
  );

  expect(
    screen.getByRole('link', { name: 'Bob' })
  ).toHaveAttribute('rel', 'noopener noreferrer');

  expect(container).toHaveTextContent('Jane');
  expect(container.querySelector('strong')).toBeNull();
});

test('rejects unsafe links and renders encoded markup as text', () => {
  const { container } = render(
    <PhotoAttributions
      values={[
        '<a href="javascript:alert(1)">Unsafe author</a>',
        '<img src="https://evil.example/image" onerror="alert(1)">Plain author',
        '&lt;img src=x onerror=alert(1)&gt;',
        '<a href="https://user:password@example.org/">Credentials</a>',
      ]}
    />
  );

  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(container.querySelector('img, script, iframe')).toBeNull();

  expect(container).toHaveTextContent('Unsafe author');
  expect(container).toHaveTextContent('Plain author');
  expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
});

test.each([undefined, null, [], [''], [null, 5], 'invalid'])(
  'omits missing or malformed credits: %j',
  values => {
    const { container } = render(
      <PhotoAttributions values={values} />
    );

    expect(container).toBeEmptyDOMElement();
  }
);