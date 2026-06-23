export const ROUTE_HOME = "/";
export const ROUTE_AUTH = "/auth";
export const ROUTE_AUTH_VERIFY = "/auth/verify";
export const ROUTE_CONVERSATION = "/conversation/:id";
export const ROUTE_TRANSLATION = "/translation/:id";
export const ROUTE_HISTORY = "/history";
export const ROUTE_TRANSLATE = "/translate";

// api base
export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// api auth routes
export const API_POST_LOGIN = API_BASE + "/login";
export const API_POST_SIGNUP = API_BASE + "/signup";
export const API_GET_VERIFY_EMAIL = API_BASE + "/verify-email";
export const API_POST_FORGOT_PASSWORD = API_BASE + "/forgot-password";
export const API_POST_CHANGE_PASSWORD = API_BASE + "/change-password";
export const API_POST_UPDATE_PROFILE = API_BASE + "/update-profile";
export const API_POST_TRANSLATE = API_BASE + "/translate";
export const API_GET_CONVERSATION = API_BASE + "/conversation/";
export const API_GET_CONVERSATIONS = API_BASE + "/conversations";

// user statuses
export const USER_STATUS_PENDING = "pending";
export const USER_STATUS_ACTIVE = "active";
export const USER_STATUS_DELETED = "deleted";
