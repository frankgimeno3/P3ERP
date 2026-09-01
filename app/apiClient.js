import axios from "axios";

const apiClient = axios.create();

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
        if (!currentUrl.startsWith("/unlogged")) {
          window.localStorage.setItem("redirectAfterLogin", currentUrl || "/dashboard");
          window.location.href = `/unlogged/${encodeURIComponent(currentUrl || "/dashboard")}`;
        }
      }
      throw {
        status: error.response.status,
        message: error.response.data?.message || error.response.data || error.response.statusText,
        data: error.response.data,
      };
    }

    if (error.request) {
      throw { message: "No se recibió respuesta del servidor" };
    }

    throw { message: error.message };
  },
);

export default apiClient;
