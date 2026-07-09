import apiClient from "../apiClient.js";

export class RoleService {
    static async getRoles() {
        const response = await apiClient.get('/api/v1/admin/roles');
        return response.data;
    }

    static async getRoleById(idRol) {
        const response = await apiClient.get(`/api/v1/admin/roles/${idRol}`);
        return response.data;
    }

    static async updateRolePermissions(idRol, permisosRol, accesosAdicionales = []) {
        const response = await apiClient.put(`/api/v1/admin/roles/${idRol}`, {
            permisos_rol: permisosRol,
            array_accesos_adicionales: accesosAdicionales,
        });
        return response.data;
    }
}
