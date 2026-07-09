import apiClient from "../apiClient.js";

export class TareaService {
    static async getTareas(filters = {}) {
        const response = await apiClient.get('/api/v1/direccion/tareas', { params: filters });
        return response.data;
    }

    static async createTarea(data) {
        const response = await apiClient.post('/api/v1/direccion/tareas', data);
        return response.data;
    }

    static async updateTarea(idTarea, data) {
        const response = await apiClient.put(`/api/v1/direccion/tareas/${idTarea}`, data);
        return response.data;
    }

    static async deleteTarea(idTarea) {
        const response = await apiClient.delete(`/api/v1/direccion/tareas/${idTarea}`);
        return response.data;
    }

    static async getListas(filters = {}) {
        const response = await apiClient.get('/api/v1/direccion/tareas-listas', { params: filters });
        return response.data;
    }

    static async createLista(data) {
        const response = await apiClient.post('/api/v1/direccion/tareas-listas', data);
        return response.data;
    }

    static async updateLista(idLista, data) {
        const response = await apiClient.put(`/api/v1/direccion/tareas-listas/${idLista}`, data);
        return response.data;
    }

    static async deleteLista(idLista, moveToList = "") {
        const response = await apiClient.delete(`/api/v1/direccion/tareas-listas/${idLista}`, { params: moveToList ? { moveToList } : {} });
        return response.data;
    }

    static async getRelationOptions() {
        const [cuentas, contactos, contenidos, ferias, proveedores] = await Promise.all([
            apiClient.get('/api/v1/comercial/cuentas'),
            apiClient.get('/api/v1/comercial/contactos'),
            apiClient.get('/api/v1/produccion/contenidos'),
            apiClient.get('/api/v1/admin/ferias'),
            apiClient.get('/api/v1/admin/proveedores'),
        ]);
        return {
            cuentas: cuentas.data,
            contactos: contactos.data,
            contenidos: contenidos.data,
            ferias: ferias.data,
            proveedores: proveedores.data,
        };
    }
}
