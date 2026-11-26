import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import ExpandablePanel, { ExpandablePanelName } from './ExpandablePanel';

beforeEach(() => {
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
});

const panels: Array<[ExpandablePanelName, string]> = [
  ['flights', 'Flights'],
  ['hotels', 'Hotels in London'],
  ['attractions', 'Attractions in London'],
];

test.each(panels)(
  'shows the same title in both modes for %s',
  (name, title) => {
    function Example() {
      const [expanded, setExpanded] = React.useState(false);

      return (
        <ExpandablePanel
          name={name}
          title={title}
          expanded={expanded}
          onToggle={() => setExpanded(value => !value)}
        >
          <input aria-label="Search filter" />
        </ExpandablePanel>
      );
    }

    render(<Example />);

    expect(
      screen.getByRole('heading', { name: title })
    ).toBeVisible();

    const filter = screen.getByRole('textbox', {
      name: 'Search filter',
    });

    fireEvent.change(filter, {
      target: { value: 'Example' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: `Expand ${name}`,
      })
    );

    const dialog = screen.getByRole('dialog', {
      name: `Expanded ${name}`,
    });

    expect(
      within(dialog).getByRole('heading', { name: title })
    ).toBeVisible();

    expect(dialog).toContainElement(filter);
    expect(filter).toHaveValue('Example');

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: `Close expanded ${name}`,
      })
    );

    expect(
      screen.getByRole('heading', { name: title })
    ).toBeVisible();

    expect(filter).toHaveValue('Example');
  }
);