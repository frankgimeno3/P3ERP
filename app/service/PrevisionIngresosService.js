import apiClient from "../apiClient.js";

export class PrevisionIngresosService {
    static async importRecibos(file, action) {
        const form = new FormData();
        form.append('file', file);
        form.append('action', action);
        const response = await apiClient.post('/api/v1/direccion/prevision-ingresos/importar-recibos', form);
        return response.data;
    }
    static async getOrdenes(tipo) {
        const response = await apiClient.get('/api/v1/direccion/prevision-ingresos', {
            params: { tipo }
        });
        return response.data;
    }

    static async createIngresoAdicional(data) {
        const response = await apiClient.post('/api/v1/direccion/prevision-ingresos', data);
        return response.data;
    }
}
