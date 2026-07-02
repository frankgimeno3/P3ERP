import apiClient from "../apiClient.js";

export class FacturaService {
    static async getFacturasClientes() {
        const response = await apiClient.get('/api/v1/admin/facturas-clientes');
        return response.data;
    }

    static async getFacturasProveedores() {
        const response = await apiClient.get('/api/v1/admin/facturas-proveedores');
        return response.data;
    }
}
