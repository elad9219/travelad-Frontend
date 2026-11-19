import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExpandablePanel.css';

export type ExpandablePanelName = 'flights' | 'hotels' | 'attractions';

interface ExpandablePanelProps {
  name: ExpandablePanelName;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export default function ExpandablePanel({
  name,
  expanded,
  onToggle,
  children,
}: ExpandablePanelProps) {
  const dialogId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const compact = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const modalContent = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  const [portalTarget] = useState(() => document.createElement('div'));
  const [compactHeight, setCompactHeight] = useState(0);

  useLayoutEffect(() => {
    const compactHost = compact.current;
    const modalHost = modalContent.current;
    const modal = dialog.current;

    if (!compactHost || !modalHost || !modal) return;

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
      if (modal.open) modal.close();

      compactHost.appendChild(portalTarget);

      if (card) card.scrollTop = cardScroll;

      root.style.overflow = oldRootOverflow;
      body.style.overflow = oldBodyOverflow;
      body.style.paddingRight = oldPadding;

      restoreFocus.current = true;
    };
  }, [expanded, portalTarget]);

  return (
    <div className={`grid-item ${name}-component-container expandable-panel`}>
      <div
        ref={compact}
        className="expandable-panel-compact"
        style={expanded ? { minHeight: compactHeight } : undefined}
      />

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
          if (event.target === event.currentTarget) onToggle();
        }}
      >
        <div className="expandable-panel-modal-bar">
          <span>Expanded view</span>

          <button
            ref={closeButton}
            type="button"
            className="expandable-panel-close"
            aria-label={`Close expanded ${name}`}
            onClick={onToggle}
          >
            <span aria-hidden="true">×</span>
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