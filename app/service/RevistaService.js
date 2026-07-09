import apiClient from "../apiClient.js";

export class RevistaService {
    static async getRevistas() {
        const response = await apiClient.get('/api/v1/produccion/revistas');
        return response.data;
    }

    static async getRevistaById(idRevista) {
        const response = await apiClient.get(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}`);
        return response.data;
    }

    static async updateRevista(idRevista, data) {
        const response = await apiClient.patch(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}`, data);
        return response.data;
    }

    static async createRevista(data) {
        const response = await apiClient.post('/api/v1/produccion/revistas', data);
        return response.data;
    }

    static async getPaginas(idRevista) {
        return (await apiClient.get(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}/paginas`)).data;
    }

    static async setNumeroPaginas(idRevista, numPaginas) {
        return (await apiClient.put(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}/paginas`, { num_paginas: numPaginas })).data;
    }

    static async updatePagina(idRevista, idPagina, data) {
        return (await apiClient.patch(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}/paginas/${encodeURIComponent(idPagina)}`, data)).data;
    }

    static async pageAction(idRevista, data) {
        return (await apiClient.post(`/api/v1/produccion/revistas/${encodeURIComponent(idRevista)}/paginas/acciones`, data)).data;
    }
}
