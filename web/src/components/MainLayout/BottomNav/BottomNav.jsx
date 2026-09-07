import { Link, useLocation } from "react-router-dom";
import { ROUTE_HOME, ROUTE_HISTORY, ROUTE_PROFILE } from "@constants";
import { useAppContext } from "../../../views/context/appContextProvider";
import { avatars } from "@images";

// styles
import "./BottomNav.css";

export const BottomNav = () => {
  const location = useLocation();
  const { state } = useAppContext();

  const isProfile = location.pathname === ROUTE_PROFILE;
  const isHistory = location.pathname === ROUTE_HISTORY;
  const isHome = !isProfile && !isHistory;

  const currentAvatar = avatars.find(
    (avatar) => avatar.pathName === state.user.avatar,
  );

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
          {currentAvatar ? (
            <img
              src={currentAvatar.image}
              alt='Profile'
              className='bottom-nav-56yl__avatar'
            />
          ) : (
            <ion-icon name='person-outline'></ion-icon>
          )}
          <span className='bottom-nav-56yl__label'>Profile</span>
        </Link>
      )}
    </nav>
  );
};
