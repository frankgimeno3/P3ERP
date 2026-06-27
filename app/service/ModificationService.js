import apiClient from "../apiClient.js";

export class ModificationService{
    static async createModification(logId, newType, newDate, comment){
        const response = await apiClient.post('/api/v1/time-log/modification',{
            logId,
            newType,
            newDate,
            comment
        });
        return response.data;
    }

    static async getUsersModifications(status){
        const response = await apiClient.get('/api/v1/admin/modifications',{
            params:{
                status
            }
        });
        return response.data;
    }

    static async setModificationStatus(id, newStatus){
        const response = await apiClient.patch('/api/v1/admin/modification',{
            id,
            newStatus
        });
        return response.data;
    }
}