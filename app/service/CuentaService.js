import apiClient from "../apiClient.js";

export class CuentaService {
    static async createCuenta(cuentaData) {
        const response = await apiClient.post('/api/v1/clientes/cuentas', cuentaData);
        return response.data;
    }

    static async getCuentas(filters = {}) {
        const response = await apiClient.get('/api/v1/clientes/cuentas', {
            params: filters
        });
        return response.data;
    }

    static async getCuentaById(idCuenta) {
        const response = await apiClient.get(`/api/v1/clientes/cuentas/${idCuenta}`);
        return response.data;
    }

    static async updateCuenta(idCuenta, cuentaData) {
        const response = await apiClient.put(`/api/v1/clientes/cuentas/${idCuenta}`, cuentaData);
        return response.data;
    }
}
