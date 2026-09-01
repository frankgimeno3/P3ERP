import apiClient from "../apiClient.js";

export class BancoService {
    static async getLineasBanco() {
        const response = await apiClient.get('/api/v1/direccion/bancos');
        return response.data;
    }

    static async importLineasBanco(banco, lineas) {
        const response = await apiClient.post('/api/v1/direccion/bancos', { banco, lineas });
        return response.data;
    }

    static async updateLineaBanco(idLineaBanco, data) {
        const response = await apiClient.put(`/api/v1/direccion/bancos/${idLineaBanco}`, data);
        return response.data;
    }
}
