import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import axios from 'axios';
import AttractionComponent from './AttractionComponent';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

const get = axios.get as jest.Mock;

const places = ['Museum', 'Park', 'Tower', 'Gallery'].map(
  (name, index) => ({
    id: index + 1,
    name,
    city: 'London',
    description: `Description of ${name}`,
  })
);

afterEach(() => {
  jest.restoreAllMocks();
});

test.each([
  [400, 1],
  [700, 2],
  [1100, 3],
])(
  'places the selected details after their row at width %i',
  async (width, columns) => {
    jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(width);

    get.mockResolvedValue({ data: places });

    render(
      <AttractionComponent
        city="London"
        onShowAttractionOnMap={jest.fn()}
      />
    );

    const title = await screen.findByRole('button', {
      name: 'Park',
    });

    const card = title.closest('article')!;

    const trigger = within(card).getByRole('button', {
      name: /View details/,
    });

    expect(screen.getByText('4 attractions')).toBeVisible();

    fireEvent.click(trigger);

    const details = screen.getByRole('region', {
      name: 'Details for Park',
    });

    const grid = card.parentElement!;

    expect(details.parentElement).toBe(grid);

    expect(grid.style.gridTemplateColumns).toBe(
      `repeat(${columns}, minmax(0, 1fr))`
    );

    const visible = Array.from(grid.children).filter(
      child => !child.hasAttribute('hidden')
    );

    expect(visible.indexOf(details)).toBe(
      Math.min(
        places.length,
        Math.ceil(2 / columns) * columns
      )
    );

    expect(details).toHaveFocus();

    expect(
      screen.queryByRole('region', {
        name: 'Details for Museum',
      })
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(details).getByRole('button', {
        name: 'Close details',
      })
    );

    expect(trigger).toHaveFocus();

    expect(
      screen.queryByRole('region', {
        name: 'Details for Park',
      })
    ).not.toBeInTheDocument();
  }
);

test(
  'repositions open details after resizing and handles an incomplete final row',
  async () => {
    const width = jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(1100);

    get.mockResolvedValue({ data: places });

    render(
      <AttractionComponent
        city="London"
        onShowAttractionOnMap={jest.fn()}
      />
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Park' })
    );

    width.mockReturnValue(400);

    fireEvent(window, new Event('resize'));

    const details = screen.getByRole('region', {
      name: 'Details for Park',
    });

    const visible = Array.from(
      details.parentElement!.children
    ).filter(child => !child.hasAttribute('hidden'));

    expect(visible.indexOf(details)).toBe(2);

    width.mockReturnValue(1100);

    fireEvent(window, new Event('resize'));

    fireEvent.click(
      screen.getByRole('button', { name: 'Gallery' })
    );

    const last = screen.getByRole('region', {
      name: 'Details for Gallery',
    });

    expect(last.parentElement!.lastElementChild).toBe(last);

    expect(
      screen.queryByRole('region', {
        name: 'Details for Park',
      })
    ).not.toBeInTheDocument();
  }
);