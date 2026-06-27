import apiClient from "../apiClient.js";

class UserSerivce{
    static async getAllUsers(){
        const response = await apiClient.get('/api/v1/admin/user');

        return response.data;
    }

    static async updateUser(username, name, email, password, enabled){
        const response = await apiClient.put('/api/v1/admin/user',{
            username,
            name,
            email,
            password,
            enabled
        });

        return response.data;
    }

    static async createUser(name, email, password){
        const response = await apiClient.post('/api/v1/admin/user',{
            name,
            email,
            password,
        });

        return response.data;
    }
}

export default UserSerivce