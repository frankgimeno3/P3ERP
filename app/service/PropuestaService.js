import apiClient from "../apiClient.js";

export class PropuestaService {
    static async getPropuestas(filters = {}) {
        const response = await apiClient.get('/api/v1/comercial/propuestas', {
            params: filters
        });
        return response.data;
    }
}
