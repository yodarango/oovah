import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTE_HOME, ROUTE_HISTORY, ROUTE_AUTH, ROUTE_PROFILE } from "@constants";
import { useAppContext } from "../../../views/context/appContextProvider";

// styles
import "./BottomNav.css";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, logout } = useAppContext();

  const isProfile = location.pathname === ROUTE_PROFILE;
  const isHistory = location.pathname === ROUTE_HISTORY;
  const isHome = !isProfile && !isHistory;

  const handleLogout = () => {
    logout();
    navigate(ROUTE_AUTH, { replace: true });
  };

  return (
    <nav className='bottom-nav-56yl'>
      <Link
        to={ROUTE_HOME}
        className={`bottom-nav-56yl__item ${
          isHome ? "bottom-nav-56yl__item--active" : ""
        }`}
        aria-label='Home'
      >
        <ion-icon name='home-outline'></ion-icon>
        <span className='bottom-nav-56yl__label'>Home</span>
      </Link>
      <Link
        to={ROUTE_HISTORY}
        className={`bottom-nav-56yl__item ${
          isHistory ? "bottom-nav-56yl__item--active" : ""
        }`}
        aria-label='History'
      >
        <ion-icon name='time-outline'></ion-icon>
        <span className='bottom-nav-56yl__label'>History</span>
      </Link>
      {state.isAuthenticated && (
        <Link
          to={ROUTE_PROFILE}
          className={`bottom-nav-56yl__item ${
            isProfile ? "bottom-nav-56yl__item--active" : ""
          }`}
          aria-label='Profile'
        >
          <ion-icon name='person-outline'></ion-icon>
          <span className='bottom-nav-56yl__label'>Profile</span>
        </Link>
      )}
      {state.isAuthenticated && (
        <button
          type='button'
          onClick={handleLogout}
          className='bottom-nav-56yl__item'
          aria-label='Logout'
        >
          <ion-icon name='log-out-outline'></ion-icon>
          <span className='bottom-nav-56yl__label'>Logout</span>
        </button>
      )}
    </nav>
  );
};
