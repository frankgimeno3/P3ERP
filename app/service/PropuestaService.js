import apiClient from "../apiClient.js";

export class PropuestaService {
    static async getPropuestas(filters = {}) {
        const response = await apiClient.get('/api/v1/comercial/propuestas', {
            params: filters
        });
        return response.data;
    }

    static async getPropuestaById(idPropuesta) {
        const response = await apiClient.get(`/api/v1/comercial/propuestas/${encodeURIComponent(idPropuesta)}`);
        return response.data;
    }

    static async createPropuesta(propuestaData) {
        const response = await apiClient.post('/api/v1/comercial/propuestas', propuestaData);
        return response.data;
    }

    static async updatePropuesta(idPropuesta, propuestaData) {
        const response = await apiClient.put(`/api/v1/comercial/propuestas/${encodeURIComponent(idPropuesta)}`, propuestaData);
        return response.data;
    }

    static async deletePropuesta(idPropuesta) {
        const response = await apiClient.delete(`/api/v1/comercial/propuestas/${encodeURIComponent(idPropuesta)}`);
        return response.data;
    }
}
