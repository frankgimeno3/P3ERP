import apiClient from "../apiClient.js";

export class ContactoService {
    static async createContacto(data) {
        const response = await apiClient.post('/api/v1/comercial/contactos', data);
        return response.data;
    }

    static async getContactos(filters = {}) {
        const response = await apiClient.get('/api/v1/comercial/contactos', {
            params: filters
        });
        return response.data;
    }

    static async unlinkContactoFromCuenta(idContacto, idCuenta) {
        const response = await apiClient.patch(`/api/v1/comercial/contactos/${idContacto}`, {
            id_cuenta: idCuenta
        });
        return response.data;
    }

    static async deleteContacto(idContacto) {
        const response = await apiClient.delete(`/api/v1/comercial/contactos/${idContacto}`);
        return response.data;
    }
}
