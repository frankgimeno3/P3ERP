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
