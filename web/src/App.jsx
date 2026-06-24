import {
  IndexView,
  AuthView,
  AuthVerifyView,
  ConversationView,
  TranslationView,
  HistoryView,
} from "@views";
import { MainLayout, ProtectedRoute } from "@components";
import {
  createRoutesFromElements,
  createBrowserRouter,
  RouterProvider,
  Route,
} from "react-router-dom";
import {
  ROUTE_AUTH_VERIFY,
  ROUTE_HOME,
  ROUTE_AUTH,
  ROUTE_CONVERSATION,
  ROUTE_TRANSLATION,
  ROUTE_HISTORY,
} from "@constants";

// global styles
import "@assets/tokens.css";
import "./App.css";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path={""} element={<MainLayout />} errorElement={<></>}>
      <Route
        path={ROUTE_HOME}
        element={
          <ProtectedRoute>
            <IndexView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_CONVERSATION}
        element={
          <ProtectedRoute>
            <ConversationView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_TRANSLATION}
        element={
          <ProtectedRoute>
            <TranslationView />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTE_HISTORY}
        element={
          <ProtectedRoute>
            <HistoryView />
          </ProtectedRoute>
        }
      />
      <Route path={ROUTE_AUTH} element={<AuthView />} />
      <Route path={ROUTE_AUTH_VERIFY} element={<AuthVerifyView />} />
    </Route>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
