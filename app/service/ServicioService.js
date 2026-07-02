import apiClient from "../apiClient.js";

export class ServicioService {
    static async getServicios(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/servicios', {
            params: filters
        });
        return response.data;
    }

    static async getServicioById(idServicio) {
        const response = await apiClient.get(`/api/v1/produccion/servicios/${idServicio}`);
        return response.data;
    }
}
