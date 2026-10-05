import axios from "axios";
import {loginUrl,safeLoginTarget} from "./config/loginRedirect.js";

const apiClient = axios.create({ timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 && typeof window !== "undefined") {
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (safeLoginTarget(currentUrl)) {
          try {window.localStorage.removeItem("userPayload");} catch {}
          window.location.replace(loginUrl(currentUrl));
        }
      }
      const normalized = new Error(error.response.data?.message || (typeof error.response.data === 'string' ? error.response.data : error.response.statusText));
      normalized.status = error.response.status;
      normalized.data = error.response.data;
      // Keep existing form-level validation/detail consumers compatible.
      normalized.response = error.response;
      normalized.cause = error;
      throw normalized;
    }

    if (error.request) {
      if (axios.isCancel(error)) throw error;
      throw new Error(error.code === 'ECONNABORTED' ? 'El servidor está tardando demasiado. Vuelve a intentarlo.' : 'No se recibió respuesta del servidor', { cause: error });
    }

    throw new Error(error.message, { cause: error });
  },
);

export default apiClient;
