import apiClient from "../apiClient.js";

export class OrdenService {
    static async getOrdenesAdministrativas(filters = {}) {
        const response = await apiClient.get('/api/v1/admin/control-administrativo/ordenes', {
            params: filters
        });
        return response.data;
    }
}
