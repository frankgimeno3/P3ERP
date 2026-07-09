import apiClient from "../apiClient.js";

export class MediatecaService {
  static async getFolders(path = "") {
    const response = await apiClient.get("/api/v1/mediateca/folders", { params: path ? { path } : {} });
    return response.data;
  }

  static async createFolder(data) {
    const response = await apiClient.post("/api/v1/mediateca/folders", data);
    return response.data;
  }

  static async updateFolder(folderId, data) {
    const response = await apiClient.patch(`/api/v1/mediateca/folders/${encodeURIComponent(folderId)}`, data);
    return response.data;
  }

  static async deleteFolder(folderId) {
    const response = await apiClient.delete(`/api/v1/mediateca/folders/${encodeURIComponent(folderId)}`);
    return response.data;
  }

  static async getFolderByPath(path) {
    const response = await apiClient.get("/api/v1/mediateca/folders/by-path", { params: { path } });
    return response.data;
  }

  static async getMedia(params = {}) {
    const response = await apiClient.get("/api/v1/mediateca/media", { params });
    return response.data;
  }

  static async createPresign(data) {
    const response = await apiClient.post("/api/v1/mediateca/media/presign", data);
    return response.data;
  }

  static async createMedia(data) {
    const response = await apiClient.post("/api/v1/mediateca/media", data);
    return response.data;
  }

  static async getMediaById(mediaId) {
    const response = await apiClient.get(`/api/v1/mediateca/media/${encodeURIComponent(mediaId)}`);
    return response.data;
  }

  static async updateMedia(mediaId, data) {
    const response = await apiClient.patch(`/api/v1/mediateca/media/${encodeURIComponent(mediaId)}`, data);
    return response.data;
  }

  static async deleteMedia(mediaId) {
    const response = await apiClient.delete(`/api/v1/mediateca/media/${encodeURIComponent(mediaId)}`);
    return response.data;
  }
}
