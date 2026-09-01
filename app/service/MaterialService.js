import apiClient from "../apiClient.js";

export class MaterialService {
  static async getMateriales() { return (await apiClient.get("/api/v1/produccion/materiales")).data; }
  static async getMaterial(id) { return (await apiClient.get(`/api/v1/produccion/materiales/${id}`)).data; }
  static async saveMaterial(id, data) {
    return (await (id
      ? apiClient.put(`/api/v1/produccion/materiales/${id}`, data)
      : apiClient.post("/api/v1/produccion/materiales", data))).data;
  }
}
