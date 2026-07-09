import apiClient from "../apiClient.js";

export class ProveedorService {
    static async getProveedores() {
        const response = await apiClient.get('/api/v1/admin/proveedores');
        return response.data;
    }

    static async getPagosProveedores() {
        const response = await apiClient.get('/api/v1/admin/pagos-proveedores');
        return response.data;
    }
}
