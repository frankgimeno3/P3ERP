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
  onOpenContactos: () => void;
  onRedesSocialesSaved: (profiles: NonNullable<InterfazCuenta['redes_sociales']>) => void;
}

const ContenidoGeneral: FC<ContenidoGeneralProps> = ({ 
  cuentaEditable, 
  setCuentaEditable,
  setIsContenidoEdited,
  onOpenContactos,
  onRedesSocialesSaved,
}) => {
  if (!cuentaEditable) {
    return <p className="text-red-700">Cuenta no encontrada</p>;
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
    setCuentaEditable(prev => prev && {
      ...prev,
      datos_comerciales: { ...prev.datos_comerciales, [field]: value },
    });
    setIsContenidoEdited(true);
  };

  return (
    <div className="flex flex-col">
      <DatosCRM
        id_cuenta={cuentaEditable.id_cuenta}
        id_edisoft={cuentaEditable.id_edisoft || ""}
        pais_cuenta={cuentaEditable.pais_cuenta}
        receptor_revista={Boolean(cuentaEditable.receptor_revista)}
        suscriptor_revista={Boolean(cuentaEditable.suscriptor_revista)}
        potencial_actual_relacion={cuentaEditable.potencial_actual_relacion || ""}
        potencial_futuro_encaje={cuentaEditable.potencial_futuro_encaje || ""}
        revisado_ricardo={Boolean(cuentaEditable.revisado_ricardo)}
        estado_leads_frios={cuentaEditable.estado_leads_frios || ""}
        presente_en_qq={cuentaEditable.presente_en_qq}
        qq={Boolean(cuentaEditable.qq)}
        actividades={cuentaEditable.actividades_cuenta}
        descripcion_actividad={cuentaEditable.descripcion_actividad || ""}
        correo_principal={cuentaEditable.correo_principal || ""}
        redesSociales={cuentaEditable.redes_sociales || []}
        onRedesSocialesSaved={onRedesSocialesSaved}
        catalogos={cuentaEditable.catalogos || ""}
        catalogos_enlaces={cuentaEditable.catalogos_enlaces || []}
        array_cuentas_distribuidoras={cuentaEditable.array_cuentas_distribuidoras || []}
        array_cuentas_distribuidas={cuentaEditable.array_cuentas_distribuidas || []}
        fuente_novedades={cuentaEditable.fuente_novedades_cuenta}
        onChange={handleCRMChange}
        id_agente={cuentaEditable.id_agente || ""}
        asignado_a={cuentaEditable.asignado_a || ""}
        summary={<label className="flex min-h-32 flex-col text-sm font-medium">Resumen actividad<textarea className="flex-1 rounded border border-gray-300 p-2 font-normal" value={cuentaEditable.datos_comerciales.resumen_actividad_cuenta || ""} onChange={event => handleDatosComercialesChange("resumen_actividad_cuenta", event.target.value)} /></label>}
        description={<Descripcion
        descripcion={cuentaEditable.descripcion_cuenta}
        onChange={(value) => {
          setCuentaEditable(prev =>
            prev ? { ...prev, descripcion_cuenta: value } : prev
          );
          setIsContenidoEdited(true);
        }}
      />}
        commercialDetails={
          <DatosComerciales
            key={cuentaEditable.id_cuenta}
            datos_comerciales={cuentaEditable.datos_comerciales}
            idCuenta={cuentaEditable.id_cuenta}
            pais={cuentaEditable.pais_cuenta}
            onCountryChange={value => handleCRMChange("pais_cuenta", value)}
            tipo_cuenta={cuentaEditable.tipo_cuenta || ""}
            cuenta_agencia={cuentaEditable.cuenta_agencia || ""}
            onAccountChange={handleCRMChange}
            onOpenContactos={onOpenContactos}
            onChange={handleDatosComercialesChange}
          />
        }
      />

      <Direcciones
        direcciones={cuentaEditable.array_direcciones_cuenta}
        onChange={(updatedDirecciones) => {
          setCuentaEditable(prev =>
            prev ? { ...prev, array_direcciones_cuenta: updatedDirecciones } : prev
          );
          setIsContenidoEdited(true);
        }}
      />



    </div>
  );
};

export default ContenidoGeneral;
