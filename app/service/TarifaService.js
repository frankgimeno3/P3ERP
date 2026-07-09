import apiClient from "../apiClient.js";

export class TarifaService {
    static async getTarifas(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/tarifas', {
            params: filters
        });
        return response.data;
    }

    static async getTarifaById(idTarifa) {
        const response = await apiClient.get(`/api/v1/produccion/tarifas/${encodeURIComponent(idTarifa)}`);
        return response.data;
    }
}
