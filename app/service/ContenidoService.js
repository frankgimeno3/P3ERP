import apiClient from "../apiClient.js";

export class ContenidoService {
    static async getContenidos(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/contenidos', {
            params: filters
        });
        return response.data;
    }

    static async getContenidoById(idContenido) {
        const response = await apiClient.get(`/api/v1/produccion/contenidos/${idContenido}`);
        return response.data;
    }

    static async updateContenido(idContenido, data) {
        const response = await apiClient.patch(`/api/v1/produccion/contenidos/${idContenido}`, data);
        return response.data;
    }

    static async createContenido(data) {
        const response = await apiClient.post('/api/v1/produccion/contenidos', data);
        return response.data;
    }

    static async deleteContenido(idContenido) {
        const response = await apiClient.delete(`/api/v1/produccion/contenidos/${idContenido}`);
        return response.data;
    }
}
