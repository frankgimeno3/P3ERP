import apiClient from "../apiClient.js";

export class NewsletterService {
    static async getNewsletters(filters = {}) {
        const response = await apiClient.get('/api/v1/produccion/newsletters', {
            params: filters
        });
        return response.data;
    }

    static async getNewsletterById(idNewsletter) {
        const response = await apiClient.get(`/api/v1/produccion/newsletters/${encodeURIComponent(idNewsletter)}`);
        return response.data;
    }

    static async updateNewsletter(idNewsletter, data) {
        const response = await apiClient.patch(`/api/v1/produccion/newsletters/${encodeURIComponent(idNewsletter)}`, data);
        return response.data;
    }

    static async createNewsletter(data) {
        const response = await apiClient.post('/api/v1/produccion/newsletters', data);
        return response.data;
    }
}
