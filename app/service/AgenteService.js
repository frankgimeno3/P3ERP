import apiClient from "../apiClient.js";

export class AgenteService {
    static async getAgentes() {
        const response = await apiClient.get('/api/v1/admin/agentes');
        return response.data;
    }

    static async updateAgenteRoles(idAgente, rolesData) {
        const response = await apiClient.put(`/api/v1/admin/agentes/${idAgente}`, rolesData);
        return response.data;
    }
}
