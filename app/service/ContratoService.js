import apiClient from "../apiClient.js";

export class ContratoService {
    static async getContratos(filters = {}) {
        const response = await apiClient.get('/api/v1/comercial/contratos', {
            params: filters
        });
        return response.data;
    }

    static async getContratoById(idContrato) {
        const response = await apiClient.get(`/api/v1/comercial/contratos/${idContrato}`);
        return response.data;
    }

    static async updateContrato(idContrato, data) {
        const response = await apiClient.patch(`/api/v1/comercial/contratos/${encodeURIComponent(idContrato)}`, data);
        return response.data;
    }
}
