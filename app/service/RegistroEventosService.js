import apiClient from "../apiClient.js";

export class RegistroEventosService {
  static async getCuentaEventos(idCuenta) {
    const response = await apiClient.get(`/api/v1/comercial/cuentas/${idCuenta}/registro-eventos`);
    return response.data;
  }

  static async getContactoEventos(idContacto) {
    const response = await apiClient.get(`/api/v1/comercial/contactos/${idContacto}/registro-eventos`);
    return response.data;
  }
}
