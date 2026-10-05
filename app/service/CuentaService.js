import apiClient from "../apiClient.js";

export class CuentaService {
    static async createCuenta(cuentaData) {
        const response = await apiClient.post('/api/v1/comercial/cuentas', cuentaData);
        return response.data;
    }

    static async getCuentas(filters = {}, options = {}) {
        const response = await apiClient.get('/api/v1/comercial/cuentas', {
            params: filters, signal: options.signal
        });
        return response.data;
    }

    static async getCuentaById(idCuenta, options = {}) {
        const response = await apiClient.get(`/api/v1/comercial/cuentas/${encodeURIComponent(idCuenta)}`, {signal:options.signal});
        return response.data;
    }

    static async updateCuenta(idCuenta, cuentaData) {
        const response = await apiClient.put(`/api/v1/comercial/cuentas/${idCuenta}`, cuentaData);
        return response.data;
    }

    static async deleteCuenta(idCuenta, params = {}) {
        const response = await apiClient.delete(`/api/v1/comercial/cuentas/${idCuenta}`, { params });
        return response.data;
    }
}
