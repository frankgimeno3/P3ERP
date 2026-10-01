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

    static async markRelevant(ids) {
        const response = await apiClient.patch('/api/v1/admin/ferias/relevancia', { ids });
        return response.data;
    }
    static async getCatalogo() { return (await apiClient.get('/api/v1/admin/ferias/catalogo')).data; }
    static async createCatalogo(data) { return (await apiClient.post('/api/v1/admin/ferias/catalogo',data)).data; }
    static async updateEditionDetails(id,data) { return (await apiClient.patch(`/api/v1/admin/ferias/${encodeURIComponent(id)}`,data)).data; }
}
