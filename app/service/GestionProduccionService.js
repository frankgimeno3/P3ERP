import apiClient from "../apiClient.js";

export class GestionProduccionService {
  static async getBoard() { return (await apiClient.get("/api/v1/produccion/gestiones-produccion")).data; }
  static async createGestion(data) { return (await apiClient.post("/api/v1/produccion/gestiones-produccion", data)).data; }
  static async updateGestion(id, data) { return (await apiClient.put(`/api/v1/produccion/gestiones-produccion/${id}`, data)).data; }
  static async createLista(data) { return (await apiClient.post("/api/v1/produccion/gestiones-produccion-listas", data)).data; }
  static async updateLista(id, data) { return (await apiClient.put(`/api/v1/produccion/gestiones-produccion-listas/${id}`, data)).data; }
  static async deleteLista(id, moveTo = "") { return (await apiClient.delete(`/api/v1/produccion/gestiones-produccion-listas/${id}`, { params: moveTo ? { moveTo } : {} })).data; }
  static async getMateriales() { return (await apiClient.get("/api/v1/produccion/materiales")).data; }
  static async getMaterial(id) { return (await apiClient.get(`/api/v1/produccion/materiales/${id}`)).data; }
  static async saveMaterial(id, data) { return (await (id ? apiClient.put(`/api/v1/produccion/materiales/${id}`, data) : apiClient.post("/api/v1/produccion/materiales", data))).data; }
  static async getArticulos() { return (await apiClient.get("/api/v1/produccion/articulos-revista")).data; }
  static async getArticulo(id) { return (await apiClient.get(`/api/v1/produccion/articulos-revista/${id}`)).data; }
  static async saveArticulo(id, data) { return (await (id ? apiClient.put(`/api/v1/produccion/articulos-revista/${id}`, data) : apiClient.post("/api/v1/produccion/articulos-revista", data))).data; }
}
