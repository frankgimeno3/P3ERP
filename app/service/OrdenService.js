import apiClient from "../apiClient.js";

export class OrdenService {
    static async getOrdenesAdministrativas(filters = {}) {
        const response = await apiClient.get('/api/v1/admin/control-administrativo/ordenes', {
            params: filters
        });
        return response.data;
    }

    static async getOrdenAdministrativa(idOrden) {
        const response = await apiClient.get('/api/v1/admin/control-administrativo/ordenes', { params: { id: idOrden } });
        return response.data;
    }

    static async updateOrdenAdministrativa(idOrden, data) {
        const response = await apiClient.put(`/api/v1/admin/control-administrativo/ordenes?id=${encodeURIComponent(idOrden)}`, data);
        return response.data;
    }

    static async previewCancellation(idOrden) {
        return (await apiClient.get('/api/v1/admin/control-administrativo/ordenes', {params:{id:idOrden,action:'cancelacion'}})).data;
    }

    static async cancelOrden(idOrden, version) {
        return (await apiClient.post(`/api/v1/admin/control-administrativo/ordenes?id=${encodeURIComponent(idOrden)}`,{action:'cancelar',version})).data;
    }
}
