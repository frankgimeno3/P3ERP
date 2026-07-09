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

    static async getFacturaProveedorById(idFacturaProveedor) {
        const response = await apiClient.get(`/api/v1/admin/facturas-proveedores/${idFacturaProveedor}`);
        return response.data;
    }

    static async createFacturaProveedor(data) {
        const response = await apiClient.post('/api/v1/admin/facturas-proveedores', data);
        return response.data;
    }

    static async updateFacturaProveedor(idFacturaProveedor, data) {
        const response = await apiClient.put(`/api/v1/admin/facturas-proveedores/${idFacturaProveedor}`, data);
        return response.data;
    }

    static async deleteFacturaProveedor(idFacturaProveedor) {
        const response = await apiClient.delete(`/api/v1/admin/facturas-proveedores/${idFacturaProveedor}`);
        return response.data;
    }
}
