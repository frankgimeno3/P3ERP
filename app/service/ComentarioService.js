import apiClient from "../apiClient.js";

export class ComentarioService {
  static async getComentarios(tipoEntidad, idEntidad) {
    const response = await apiClient.get("/api/v1/comercial/comentarios", {
      params: { tipo_entidad: tipoEntidad, id_entidad: idEntidad },
    });
    return response.data;
  }

  static async createComentario(data) {
    const response = await apiClient.post("/api/v1/comercial/comentarios", data);
    return response.data;
  }

  static async updateComentario(idComentario, data) {
    const response = await apiClient.put(`/api/v1/comercial/comentarios/${idComentario}`, data);
    return response.data;
  }

  static async deleteComentario(idComentario, idAgente = "") {
    const response = await apiClient.delete(`/api/v1/comercial/comentarios/${idComentario}`, {
      params: { id_agente: idAgente },
    });
    return response.data;
  }
}
