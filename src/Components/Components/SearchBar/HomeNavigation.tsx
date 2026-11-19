import React, { useEffect } from 'react';
import {
  Link,
  useInRouterContext,
  useLocation,
} from 'react-router-dom';
import './HomeNavigation.css';

interface HomeNavigationProps {
  onHome: () => void;
}

const content = (
  <>
    <img
      src="https://i.postimg.cc/15rbQdXx/travelad-logo.png"
      alt=""
      className="logo"
    />
    <span>Home</span>
  </>
);

function RoutedHomeNavigation({ onHome }: HomeNavigationProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/') {
      onHome();
    }
  }, [pathname, onHome]);

  return (
    <Link
      to="/"
      className="travelad-home-link"
      aria-label="Travelad home"
      replace={pathname === '/'}
      onClick={event => {
        if (
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey
        ) {
          onHome();
        }
      }}
    >
      {content}
    </Link>
  );
}

export default function HomeNavigation({
  onHome,
}: HomeNavigationProps) {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return <RoutedHomeNavigation onHome={onHome} />;
  }

  return (
    <a
      href="/"
      className="travelad-home-link"
      aria-label="Travelad home"
    >
      {content}
    </a>
  );
}