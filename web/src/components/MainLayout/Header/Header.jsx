import { Link, useLocation } from "react-router-dom";
import { ROUTE_HOME, ROUTE_HISTORY, ROUTE_PROFILE } from "@constants";
import { useAppContext } from "../../../views/context/appContextProvider";
import { avatars } from "@images";

// styles
import "./Header.css";

const clearCacheAndReload = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((name) => caches.delete(name)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch (err) {
    console.error("Failed to clear cache:", err);
  }
  window.location.href = `${ROUTE_HOME}?nocache=${Date.now()}`;
};

export const Header = () => {
  const location = useLocation();
  const { state } = useAppContext();

  // Same active-route logic as the bottom nav
  const isProfile = location.pathname === ROUTE_PROFILE;
  const isHistory = location.pathname === ROUTE_HISTORY;
  const isHome = !isProfile && !isHistory;

  const currentAvatar = avatars.find(
    (avatar) => avatar.pathName === state.user.avatar,
  );

  const handleLogoClick = (e) => {
    e.preventDefault();
    clearCacheAndReload();
  };

  return (
    <>
      <div className='app-header-56yl__spacer'></div>
      <header className='app-header-56yl'>
        <div className='app-header-56yl__container'>
          <Link
            to={ROUTE_HOME}
            className='app-header-56yl__brand'
            onClick={handleLogoClick}
            title='Tap to refresh and clear cache'
          >
            <div className='app-header-56yl__logo'>
              <img src='/logo.webp' alt='Oovah Logo' className='logo' />
            </div>
            <span className='app-header-56yl__title'>Oovah</span>
          </Link>

          {/* Mirrors the bottom nav; only visible on screens over 800px */}
          <nav className='app-header-56yl__nav' aria-label='Primary'>
            <Link
              to={ROUTE_HOME}
              className={`app-header-56yl__nav-item ${
                isHome ? "app-header-56yl__nav-item--active" : ""
              }`}
              aria-label='Home'
            >
              <ion-icon name='home-outline'></ion-icon>
              <span className='app-header-56yl__nav-label'>Home</span>
            </Link>
            <Link
              to={ROUTE_HISTORY}
              className={`app-header-56yl__nav-item ${
                isHistory ? "app-header-56yl__nav-item--active" : ""
              }`}
              aria-label='History'
            >
              <ion-icon name='time-outline'></ion-icon>
              <span className='app-header-56yl__nav-label'>History</span>
            </Link>
            {state.isAuthenticated && (
              <Link
                to={ROUTE_PROFILE}
                className={`app-header-56yl__nav-item ${
                  isProfile ? "app-header-56yl__nav-item--active" : ""
                }`}
                aria-label='Profile'
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar.image}
                    alt='Profile'
                    className='app-header-56yl__nav-avatar'
                  />
                ) : (
                  <ion-icon name='person-outline'></ion-icon>
                )}
                <span className='app-header-56yl__nav-label'>Profile</span>
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
};
