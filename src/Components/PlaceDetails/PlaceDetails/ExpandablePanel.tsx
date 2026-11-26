import React, {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './ExpandablePanel.css';

export type ExpandablePanelName =
  | 'flights'
  | 'hotels'
  | 'attractions';

interface ExpandablePanelProps {
  name: ExpandablePanelName;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function PanelIcon({ name }: { name: ExpandablePanelName }) {
  return (
    <svg
      className="panel-heading-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'flights' && (
        <path d="M12 2c1.1 0 2 1.1 2 2.5V9l7 4v3l-7-2v4l3 2v2l-5-1.5L7 22v-2l3-2v-4l-7 2v-3l7-4V4.5C10 3.1 10.9 2 12 2Z" />
      )}

      {name === 'hotels' && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 21v-5h6v5M8 7h2m4 0h2M8 11h2m4 0h2" />
        </>
      )}

      {name === 'attractions' && (
        <>
          <circle cx="12" cy="10" r="7" />
          <circle cx="12" cy="10" r="1.5" />
          <path d="M12 3v5.5m0 3V17M5 10h5.5m3 0H19M8 16l-3 5h14l-3-5" />
        </>
      )}
    </svg>
  );
}

export default function ExpandablePanel({
  name,
  title,
  expanded,
  onToggle,
  children,
}: ExpandablePanelProps) {
  const dialogId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const compact = useRef<HTMLDivElement>(null);
  const compactBody = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const modalContent = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  const [portalTarget] = useState(() => {
    const element = document.createElement('div');
    element.className = 'expandable-panel-body';

    return element;
  });

  const [compactHeight, setCompactHeight] = useState(0);

  useLayoutEffect(() => {
    const compactHost = compactBody.current;
    const modalHost = modalContent.current;
    const modal = dialog.current;

    if (!compactHost || !modalHost || !modal) {
      return;
    }

    if (!expanded) {
      compactHost.appendChild(portalTarget);

      if (restoreFocus.current) {
        restoreFocus.current = false;
        button.current?.focus({ preventScroll: true });
      }

      return;
    }

    // Move the existing DOM without remounting the React children.
    const card = portalTarget.firstElementChild;
    const cardScroll = card?.scrollTop ?? 0;

    modalHost.appendChild(portalTarget);

    const root = document.documentElement;
    const body = document.body;

    const oldRootOverflow = root.style.overflow;
    const oldBodyOverflow = body.style.overflow;
    const oldPadding = body.style.paddingRight;

    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - root.clientWidth
    );

    const padding =
      parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    if (root.clientWidth > 0 && scrollbarWidth > 0) {
      body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    modal.showModal();
    modalHost.scrollTop = cardScroll;

    closeButton.current?.focus({ preventScroll: true });

    return () => {
      if (modal.open) {
        modal.close();
      }

      compactHost.appendChild(portalTarget);

      if (card) {
        card.scrollTop = cardScroll;
      }

      root.style.overflow = oldRootOverflow;
      body.style.overflow = oldBodyOverflow;
      body.style.paddingRight = oldPadding;

      restoreFocus.current = true;
    };
  }, [expanded, portalTarget]);

  return (
    <div
      className={`grid-item ${name}-component-container expandable-panel`}
    >
      <div
        ref={compact}
        className="expandable-panel-compact"
        style={expanded ? { minHeight: compactHeight } : undefined}
      >
        <header className="expandable-panel-heading">
          <h2>
            <PanelIcon name={name} />
            <span>{title}</span>
          </h2>

          <button
            ref={button}
            type="button"
            className="expandable-panel-toggle"
            aria-label={`Expand ${name}`}
            title={`Expand ${name}`}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-controls={dialogId}
            onClick={() => {
              setCompactHeight(
                compact.current?.getBoundingClientRect().height ?? 0
              );

              onToggle();
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
            </svg>
          </button>
        </header>

        <div
          className="expandable-panel-compact-body"
          ref={compactBody}
        />
      </div>

      <dialog
        id={dialogId}
        ref={dialog}
        className="expandable-panel-dialog"
        aria-label={`Expanded ${name}`}
        aria-modal="true"
        onCancel={event => {
          event.preventDefault();
          onToggle();
        }}
        onClick={event => {
          if (event.target === event.currentTarget) {
            onToggle();
          }
        }}
      >
        <div className="expandable-panel-modal-bar">
          <h2>
            <PanelIcon name={name} />
            <span>{title}</span>
          </h2>

          <button
            ref={closeButton}
            type="button"
            className="expandable-panel-close"
            aria-label={`Close expanded ${name}`}
            onClick={onToggle}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div
          ref={modalContent}
          className="expandable-panel-modal-content"
        />
      </dialog>

      {createPortal(children, portalTarget)}
    </div>
  );
}