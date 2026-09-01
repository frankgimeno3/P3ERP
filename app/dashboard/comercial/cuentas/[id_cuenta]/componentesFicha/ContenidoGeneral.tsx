'use client';

import React, { FC } from 'react';
import DatosCRM from './general/DatosCrm';
import DatosComerciales from './general/DatosComerciales';
import Direcciones from './general/Direcciones';
import Descripcion from './general/Descripcion';
import { InterfazCuenta } from '@/app/interfaces/interfaces';

interface ContenidoGeneralProps {
  cuentaEditable: InterfazCuenta;
  setCuentaEditable: React.Dispatch<React.SetStateAction<InterfazCuenta | undefined>>;
  setIsContenidoEdited: (val: boolean) => void;
}

const ContenidoGeneral: FC<ContenidoGeneralProps> = ({ 
  cuentaEditable, 
  setCuentaEditable,
  setIsContenidoEdited 
}) => {
  if (!cuentaEditable) {
    return <p className="text-red-500">Cuenta no encontrada</p>;
  }

  const fieldMap: Record<string, string> = {
    nombre_empresa: "nombre_empresa",
    actividades: "actividades_cuenta",
    presente_en_qq: "presente_en_qq",
    qq: "qq",
    fuente_novedades: "fuente_novedades_cuenta",
  };

  const handleCRMChange = (field: string, value: string | boolean | string[] | any[]) => {
    setCuentaEditable((prev) =>
      prev ? { ...prev, [`${fieldMap[field] ?? field}`]: value } : prev
    );
    setIsContenidoEdited(true);
  };

  const handleDatosComercialesChange = (field: string, value: string) => {
    if (field in cuentaEditable.datos_comerciales) {
      setCuentaEditable(prev =>
        prev
          ? {
              ...prev,
              datos_comerciales: {
                ...prev.datos_comerciales,
                [field]: value,
              },
            }
          : prev
      );
    } else if (field === "pais_cuenta") {
      setCuentaEditable(prev =>
        prev ? { ...prev, pais_cuenta: value } : prev
      );
    } else if (field === "contacto_principal") {
      setCuentaEditable(prev =>
        prev
          ? {
              ...prev,
              datos_comerciales: {
                ...prev.datos_comerciales,
                contacto_principal: value,
              },
            }
          : prev
      );
    }

    setIsContenidoEdited(true);
  };

  return (
    <div className="flex flex-col">
      <DatosCRM
        id_cuenta={cuentaEditable.id_cuenta}
        nombre_empresa={cuentaEditable.nombre_empresa}
        id_agente={cuentaEditable.id_agente}
        id_edisoft={cuentaEditable.id_edisoft || ""}
        asignado_a={cuentaEditable.asignado_a || ""}
        pais_cuenta={cuentaEditable.pais_cuenta}
        receptor_revista={Boolean(cuentaEditable.receptor_revista)}
        potencial_actual_relacion={cuentaEditable.potencial_actual_relacion || ""}
        potencial_futuro_encaje={cuentaEditable.potencial_futuro_encaje || ""}
        revisado_ricardo={Boolean(cuentaEditable.revisado_ricardo)}
        campanas={cuentaEditable.campanas || ""}
        estado_leads_frios={cuentaEditable.estado_leads_frios || ""}
        stands_ferias={cuentaEditable.stands_ferias || ""}
        tipo_cuenta={cuentaEditable.tipo_cuenta || ""}
        presente_en_qq={cuentaEditable.presente_en_qq}
        qq={Boolean(cuentaEditable.qq)}
        actividades={cuentaEditable.actividades_cuenta}
        descripcion_actividad={cuentaEditable.descripcion_actividad || ""}
        correo_principal={cuentaEditable.correo_principal || ""}
        ferias={cuentaEditable.ferias || []}
        red_social_prioritaria={cuentaEditable.red_social_prioritaria || ""}
        catalogos={cuentaEditable.catalogos || ""}
        array_cuentas_distribuidoras={cuentaEditable.array_cuentas_distribuidoras || []}
        array_cuentas_distribuidas={cuentaEditable.array_cuentas_distribuidas || []}
        cuenta_agencia={cuentaEditable.cuenta_agencia || ""}
        fuente_novedades={cuentaEditable.fuente_novedades_cuenta}
        onChange={handleCRMChange}
      />

      <DatosComerciales
        datos_comerciales={cuentaEditable.datos_comerciales}
        pais_cuenta={cuentaEditable.pais_cuenta}
        onChange={handleDatosComercialesChange}
      />

      <Direcciones
        direcciones={cuentaEditable.array_direcciones_cuenta}
        receptorRevista={Boolean(cuentaEditable.receptor_revista)}
        suscriptorRevista={Boolean(cuentaEditable.suscriptor_revista)}
        onReceptorRevistaChange={(value) => handleCRMChange("receptor_revista", value)}
        onSuscriptorRevistaChange={(value) => handleCRMChange("suscriptor_revista", value)}
        onChange={(updatedDirecciones) => {
          setCuentaEditable(prev =>
            prev ? { ...prev, array_direcciones_cuenta: updatedDirecciones } : prev
          );
          setIsContenidoEdited(true);
        }}
      />

      <Descripcion
        descripcion={cuentaEditable.descripcion_cuenta}
        onChange={(value) => {
          setCuentaEditable(prev =>
            prev ? { ...prev, descripcion_cuenta: value } : prev
          );
          setIsContenidoEdited(true);
        }}
      />

    </div>
  );
};

export default ContenidoGeneral;
