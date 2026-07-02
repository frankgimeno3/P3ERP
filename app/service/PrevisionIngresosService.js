import apiClient from "../apiClient.js";

export class PrevisionIngresosService {
    static async getOrdenes(tipo) {
        const response = await apiClient.get('/api/v1/direccion/prevision-ingresos', {
            params: { tipo }
        });
        return response.data;
    }
}
