


export interface InterfazContacto {
  id_contacto: string;
  nombre_contacto: string;
  apellidos_contacto: string;
  nombre_completo_contacto: string;
  id_cuenta: string,
  nombre_empresa: string,
  telefono_contacto: string,
  email_contacto: string,
  cargo_contacto: string,
  idiomas: string,
  conocido_en: string,
  contactado_en_feria: string,
  suscripciones: string[],
  otros_datos_interes: string
  pais_contacto:string
}

export interface InterfazDireccion {
  nombre_direccion: string;
  pais_direccion: string;
  region_direccion: string;
  ciudad_direccion: string;
  codigo_postal: string;
  direccion_completa: string;
  telefono_direccion: string;
  descripcion_direccion: string;
}

export interface InterfazCuenta {
  id_cuenta: string;
  nombre_empresa: string;
  pais_cuenta: string;
  id_agente: string;
  descripcion_cuenta: string;
  actividades_cuenta: string;
  presente_en_qq: boolean;
  fuente_novedades_cuenta: string;
  datos_comerciales: {
    ciudad_principal_cuenta: string;
    telefono_principal_cuenta: string;
    categoria_principal_cuenta: string;
    contacto_principal: string;
    resumen_actividad_cuenta: string;
  };
  array_direcciones_cuenta: InterfazDireccion[];
  array_contactos_cuenta: { id_contacto: string }[];
  array_comentarios_cuenta: string[];
}

export interface InterfazServicio {
  id_servicio: string;
  ano_servicio: string;
  soporte_servicio: string;
  precio_servicio: string;
  fecha_deadline_servicio: string;
  fecha_publicacion_servicio: string;
  es: {
    medio: string;
    edicion: string;
    publicacion: string;
    nombre: string;
  };
  en: {
    medio: string;
    edicion: string;
    publicacion: string;
    nombre: string;
  };
}

export interface InterfazPropuesta {
  id_propuesta: string;
  id_agente_propuesta: string;
  estado_propuesta: string;

  fecha_envio_propuesta: string;

  nombre_propuesta: string;
  comentarios_adicionales?: string;

  forma_cobro_propuesta: string;
  descuento_final_propuesta: number;
  importe_total_BI_propuesta: number;
  iva_aplicable: boolean;
  importe_propuesta_con_iva: number;

  cuenta_propuesta: {
    id_cuenta_propuesta: string;
    id_contacto: string;
    cargoContacto: string;
  };

   cobros: {
    cobro: string;    
    fecha: string;   
    importe: number | string;  
  }[];

  contenido_propuesta: {
    medio: string;
    publicacion: string;
    producto: string;
    precio_tarifa: number;
    descuento_producto: number;
    precio_unitario: number;
    deadline_publicacion: string;
    fecha_publicacion_publicacion: string;
  }[];
}




export interface InterfazAgente {
  id_agente: string;
  nombre_agente: string;
  apellidos_agente: string;
  nombre_completo_agente: string;
  DNI_agente: string;
  rol_agente: string;
  estado_agente: 'activo' | 'inactivo' | string ;
}

export interface InterfazContrato {
  id_contrato: string;
  id_agente_contrato: string;
  fecha_cobro_prevista_contrato: string;
  forma_cobro_contrato:
    | 'Domiciliación Bancaria'
    | 'Transferencia Bancaria'
    | 'Recibo Domiciliado'
    | string;
  fecha_firma_contrato: string;
  fecha_fin_contrato: string;
  id_campana_asociada: string;

  descuento_final_contrato: number;
  importe_total_BI_contrato: number;
  iva_aplicable: boolean;
  importe_contrato_con_iva: number;

  array_ordenes_cobro: {
    id_orden: string;
    tipo_cobro: 'Recibo domiciliado' | 'Transferencia bancaria' | string;
    id_factura: string;
  }[];

  cuenta_contrato: {
    id_cuenta_contrato: string;
    id_contacto: string;
    cargoContacto: string;
  };

  array_contenidos: {
    id_contenido: string;
  }[];

  contenido_campana: {
    medio: string;
    publicacion: string;
    producto: string;
    precio_producto: number;
    deadline_publicacion: string;
    fecha_publicacion_publicacion: string;
    estado_material_contrato: 'Publicado' | 'Pedido, no recibido' | 'No pedido' | string;
    urlcontenido: string;
  }[];
}

export interface ContratoResumen {
  codigo: string;
  cliente: string;
  agente: string;
  estado: string;
  fechaFirma: string;
  importe: string;
  campania: string;
}
