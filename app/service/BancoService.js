import apiClient from "../apiClient.js";

export class BancoService {
    static async getLineasBanco() {
        const response = await apiClient.get('/api/v1/contabilidad/bancos');
        return response.data;
    }

    static async importLineasBanco(banco, lineas) {
        const response = await apiClient.post('/api/v1/contabilidad/bancos', { banco, lineas });
        return response.data;
    }

    static async updateLineaBanco(idLineaBanco, data) {
        const response = await apiClient.put(`/api/v1/contabilidad/bancos/${idLineaBanco}`, data);
        return response.data;
    }

    static async getLineaBanco(idLineaBanco) {
        const response = await apiClient.get(`/api/v1/contabilidad/bancos/${idLineaBanco}`);
        return response.data;
    }
}
