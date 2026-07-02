import apiClient from "../apiClient.js";

export class AgenteService {
    static async getAgentes() {
        const response = await apiClient.get('/api/v1/admin/agentes');
        return response.data;
    }
}
