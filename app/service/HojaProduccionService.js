import apiClient from "../apiClient.js";

export class HojaProduccionService {
    static async getContenidos(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/hoja-produccion', {
            params: filters
        });
        return response.data;
    }

    static async createContenido(data) {
        const response = await apiClient.post('/api/v1/produccion/hoja-produccion', data);
        return response.data;
    }
}
