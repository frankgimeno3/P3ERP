import apiClient from "../apiClient.js";

export class GmService {
    static async getCuentas() {
        const response = await apiClient.get('/api/v1/gm/cuentas');
        return response.data;
    }

    static async getNuevaCuentaContext() {
        const response = await apiClient.get('/api/v1/gm/cuentas', {
            params: { next: '1' }
        });
        return response.data;
    }

    static async getCuenta(codigo) {
        const response = await apiClient.get(`/api/v1/gm/cuentas/${codigo}`);
        return response.data;
    }

    static async saveCuenta(cuenta, contactos = [], isNew = false) {
        const payload = { cuenta, contactos };
        const response = isNew
            ? await apiClient.post('/api/v1/gm/cuentas', payload)
            : await apiClient.put(`/api/v1/gm/cuentas/${cuenta.codigo}`, payload);
        return response.data;
    }

    static async deleteContacto(codigo, contactoId) {
        const response = await apiClient.delete(`/api/v1/gm/cuentas/${codigo}`, {
            params: { contacto: contactoId }
        });
        return response.data;
    }
}
