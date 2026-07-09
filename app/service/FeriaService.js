import apiClient from "../apiClient.js";

export class FeriaService {
    static async getFerias() {
        const response = await apiClient.get('/api/v1/admin/ferias');
        return response.data;
    }

    static async getFeriaById(idFeria) {
        const response = await apiClient.get(`/api/v1/admin/ferias/${idFeria}`);
        return response.data;
    }

    static async createFeria(data) {
        const response = await apiClient.post('/api/v1/admin/ferias', data);
        return response.data;
    }
}
