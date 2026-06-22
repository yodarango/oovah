import { Link } from "react-router-dom";
import { ROUTE_HOME } from "@constants";
import oovahLogo from "../../../../public/logo.png";

// styles
import "./Header.css";

export const Header = () => {
  return (
    <>
      <div className='app-header-56yl__spacer'></div>
      <header className='app-header-56yl'>
        <div className='app-header-56yl__container'>
          <Link to={ROUTE_HOME} className='app-header-56yl__brand'>
            <div className='app-header-56yl__logo'>
              <img src={oovahLogo} alt='Oovah Logo' className='logo' />
            </div>
            <span className='app-header-56yl__title'>Oovah</span>
          </Link>
        </div>
      </header>
    </>
  );
};
