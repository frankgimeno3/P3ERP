import apiClient from '../apiClient.js';
export class HorasJuanService {
  static async getAll() { return (await apiClient.get('/api/v1/direccion/horas-juan')).data; }
  static async getById(id) { return (await apiClient.get(`/api/v1/direccion/horas-juan/${id}`)).data; }
  static async create(data) { return (await apiClient.post('/api/v1/direccion/horas-juan', data)).data; }
  static async suggestion(params) { return (await apiClient.get('/api/v1/direccion/horas-juan/sugerencia', { params })).data; }
  static async getDebts() { return (await apiClient.get('/api/v1/direccion/horas-juan/adeudos')).data; }
  static async getDeleteImpact(id) { return (await apiClient.get(`/api/v1/direccion/horas-juan/${id}`, { params: { accion: 'impacto-eliminacion' } })).data; }
  static async remove(id, confirmDependencies = false) { return (await apiClient.delete(`/api/v1/direccion/horas-juan/${id}`, { data: { confirmar_dependencias: confirmDependencies } })).data; }
}
