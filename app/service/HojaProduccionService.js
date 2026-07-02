import apiClient from "../apiClient.js";

export class HojaProduccionService {
    static async getContenidos(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/hoja-produccion', {
            params: filters
        });
        return response.data;
    }
}
