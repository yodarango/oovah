import { Link, useNavigate } from "react-router-dom";
import { ROUTE_HOME, ROUTE_AUTH } from "@constants";
import { useAppContext } from "../../../views/context/appContextProvider";

// styles
import "./Header.css";

export const Header = () => {
  const { state, logout } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(ROUTE_AUTH, { replace: true });
  };

  return (
    <>
      <div className='app-header-56yl__spacer'></div>
      <header className='app-header-56yl'>
        <div className='app-header-56yl__container'>
          <Link to={ROUTE_HOME} className='app-header-56yl__brand'>
            <div className='app-header-56yl__logo'>
              <img src='/logo.jpg' alt='Oovah Logo' className='logo' />
            </div>
            <span className='app-header-56yl__title'>Oovah</span>
          </Link>

          {state.isAuthenticated && (
            <button
              type='button'
              onClick={handleLogout}
              className='app-header-56yl__login'
            >
              <ion-icon name='log-out-outline'></ion-icon>
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
};
