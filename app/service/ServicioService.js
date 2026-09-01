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

    static async updateServicio(idServicio, data) {
        return (await apiClient.put(`/api/v1/produccion/servicios/${encodeURIComponent(idServicio)}`, data)).data;
    }

    static async createServicio(data) {
        return (await apiClient.post('/api/v1/produccion/servicios', data)).data;
    }

    static async createPublicationOption(data) {
        return (await apiClient.post('/api/v1/produccion/servicios/publicaciones', data)).data;
    }
}
