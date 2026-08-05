import { Link } from "react-router-dom";
import { ROUTE_HOME } from "@constants";

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
        </div>
      </header>
    </>
  );
};
