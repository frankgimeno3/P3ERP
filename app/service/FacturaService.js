import apiClient from "../apiClient.js";

export class FacturaService {
    static async getFacturasClientes() {
        const response = await apiClient.get('/api/v1/admin/facturas-clientes');
        return response.data;
    }

    static async getContratosFacturables() {
        const response = await apiClient.get('/api/v1/admin/facturas-clientes/contratos');
        return response.data;
    }

    static async createFacturaClienteDraft(idContrato) {
        const response = await apiClient.post('/api/v1/admin/facturas-clientes', { id_contrato: idContrato });
        return response.data;
    }

    static async getFacturaCliente(idFactura) {
        const response = await apiClient.get(`/api/v1/admin/facturas-clientes/${encodeURIComponent(idFactura)}`);
        return response.data;
    }

    static async updateFacturaCliente(idFactura, data) {
        const response = await apiClient.put(`/api/v1/admin/facturas-clientes/${encodeURIComponent(idFactura)}`, data);
        return response.data;
    }

    static async emitirFacturaCliente(idFactura, data) {
        const response = await apiClient.post(`/api/v1/admin/facturas-clientes/${encodeURIComponent(idFactura)}/emitir`, data);
        return response.data;
    }

    static async createFacturaRectificativaDraft(idFacturaOrigen, facturaTipo) {
        const response = await apiClient.post('/api/v1/admin/facturas-clientes/rectificativas', {
            factura_origen_id: idFacturaOrigen,
            factura_tipo: facturaTipo,
        });
        return response.data;
    }

    static async getVerifactuRecords() {
        const response = await apiClient.get('/api/v1/admin/facturas-clientes/verifactu-records');
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
