import { useAppContext } from "../../views/context/appContextProvider";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Header } from "./Header/Header";
import { Footer } from "./Footer/Footer";
import { BottomNav } from "./BottomNav/BottomNav";
import { ROUTE_AUTH_VERIFY, ROUTE_HOME, ROUTE_AUTH } from "@constants";

// styles
import "./MainLayout.css";
import { useEffect } from "react";

export const MainLayout = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (state.isLoading) return;

    // If the user is logged in but still needs to verify their email
    if (
      location.pathname === ROUTE_HOME &&
      state.isAuthenticated &&
      state.isPending
    ) {
      navigate(ROUTE_AUTH_VERIFY);
      return;
    }

    // If the user is verified and tries to access auth pages, send them home
    if (
      [ROUTE_AUTH, ROUTE_AUTH_VERIFY].includes(location.pathname) &&
      state.isActive
    ) {
      navigate(ROUTE_HOME);
      return;
    }

    // If the user is not logged in but is trying to access the verification page
    if (location.pathname === ROUTE_AUTH_VERIFY && !state.isAuthenticated) {
      navigate(ROUTE_AUTH);
      return;
    }
  }, [
    location,
    navigate,
    state.isAuthenticated,
    state.isActive,
    state.isLoading,
    state.isPending,
  ]);

  return (
    <div className='main-layout-56yl'>
      <Header />
      <main className='main-layout-56yl__content'>
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};
