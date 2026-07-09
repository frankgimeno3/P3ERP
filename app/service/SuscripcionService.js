import apiClient from "../apiClient.js";

export class SuscripcionService {
    static async getSuscripciones(filters = {}) {
        const response = await apiClient.get('/api/v1/admin/suscripciones', {
            params: filters
        });
        return response.data;
    }

    static async createSuscripcion(data) {
        const response = await apiClient.post('/api/v1/admin/suscripciones', data);
        return response.data;
    }
}
