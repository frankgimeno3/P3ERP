import apiClient from '../apiClient';
const root='/api/v1/direccion/propiedades';
export const PropertyService={
 list:async(signal)=>(await apiClient.get(root,{signal})).data,
 get:async(id,signal)=>(await apiClient.get(`${root}/${encodeURIComponent(id)}`,{signal})).data,
 save:async(id,body)=>(await apiClient({url:id?`${root}/${encodeURIComponent(id)}`:root,method:id?'PUT':'POST',data:body})).data,
 associate:async(id,body)=>(await apiClient.post(`${root}/${encodeURIComponent(id)}/cargos`,body)).data,
 detach:async(id,chargeId,expectedVersion)=>(await apiClient.delete(`${root}/${encodeURIComponent(id)}/cargos/${encodeURIComponent(chargeId)}`,{data:{expectedVersion}})).data,
};
