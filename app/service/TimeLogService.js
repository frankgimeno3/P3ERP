import apiClient from "../apiClient.js";

export class TimeLogService{
    static async createTimeLog(type, comment){
        const response = await apiClient.post('/api/v1/time-log',{
            type,
            comment
        })

        return response.data;
    }

    static async getUserTimeLogs(afterTime, beforeTime){
        const response = await apiClient.get('/api/v1/time-logs',{
            params:{
                afterTime,
                beforeTime
            }
        })
        return response.data;
    }

    static async getUsersTimeLogs(afterTime, beforeTime, users = ""){
        const response = await apiClient.get('/api/v1/admin/time-logs',{
            params:{
                afterTime,
                beforeTime,
                users
            }
        })
        return response.data;
    }

    static async getUsersTimeLogsInCsv(afterTime, beforeTime, users = ""){
        const response = await apiClient.get('/api/v1/admin/time-logs/csv',{
            params:{
                afterTime,
                beforeTime,
                users
            }
        })
        return response.data;
    }
}