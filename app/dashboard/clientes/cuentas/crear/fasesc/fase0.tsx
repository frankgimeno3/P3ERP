import React, { FC, ChangeEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {CuentaService} from '@/app/service/CuentaService';

interface Agente {
  id_usuario: string;
  nombre_usuario: string;
  rol: string;
}

const paises = [
  "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán",
  "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bhután", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba", "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Etiopía",
  "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guinea", "Guinea-Bisáu", "Guinea Ecuatorial", "Guyana", "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia",
  "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia", "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam", "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Uruguay", "Uzbekistán", "Vanuatu", "Vaticano", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Zambia", "Zimbabue"
];

interface Fase0Props {
  setFaseCrearCuenta: React.Dispatch<React.SetStateAction<number>>;
  codigoEdisoft: string;
  setCodigoEdisoft: React.Dispatch<React.SetStateAction<string>>;
  noExisteEdisoft: boolean;
  setNoExisteEdisoft: React.Dispatch<React.SetStateAction<boolean>>;
  cuentaExiste: boolean | null;
  setCuentaExiste: React.Dispatch<React.SetStateAction<boolean | null>>;
  nombreCuenta: string;
  setNombreCuenta: React.Dispatch<React.SetStateAction<string>>;
  agenteAsignado: string;
  setAgenteAsignado: React.Dispatch<React.SetStateAction<string>>;
  paisCuenta: string;
  setPaisCuenta: React.Dispatch<React.SetStateAction<string>>;
  telefonoCuenta: string;
  setTelefonoCuenta: React.Dispatch<React.SetStateAction<string>>;
  descripcionCuenta: string;
  setDescripcionCuenta: React.Dispatch<React.SetStateAction<string>>;
  paisUbicacion: string;
  setPaisUbicacion: React.Dispatch<React.SetStateAction<string>>;
  estadoUbicacion: string;
  setEstadoUbicacion: React.Dispatch<React.SetStateAction<string>>;
  ciudadUbicacion: string;
  setCiudadUbicacion: React.Dispatch<React.SetStateAction<string>>;
  codigoPostal: string;
  setCodigoPostal: React.Dispatch<React.SetStateAction<string>>;
  direccionCompleta: string;
  setDireccionCompleta: React.Dispatch<React.SetStateAction<string>>;
  telefonoPrincipal: string;
  setTelefonoPrincipal: React.Dispatch<React.SetStateAction<string>>;
  descripcionUbicacion: string;
  setDescripcionUbicacion: React.Dispatch<React.SetStateAction<string>>;
  nombreContacto: string;
  setNombreContacto: React.Dispatch<React.SetStateAction<string>>;
  apellidosContacto: string;
  setApellidosContacto: React.Dispatch<React.SetStateAction<string>>;
  telefonoContacto: string;
  setTelefonoContacto: React.Dispatch<React.SetStateAction<string>>;
  mailContacto: string;
  setMailContacto: React.Dispatch<React.SetStateAction<string>>;
}

const Fase0: FC<Fase0Props> = ({
  setFaseCrearCuenta,
  codigoEdisoft,
  setCodigoEdisoft,
  noExisteEdisoft,
  setNoExisteEdisoft,
  cuentaExiste,
  setCuentaExiste,
  nombreCuenta,
  setNombreCuenta,
  agenteAsignado,
  setAgenteAsignado,
  paisCuenta,
  setPaisCuenta,
  telefonoCuenta,
  setTelefonoCuenta,
  descripcionCuenta,
  setDescripcionCuenta,
  paisUbicacion,
  setPaisUbicacion,
  estadoUbicacion,
  setEstadoUbicacion,
  ciudadUbicacion,
  setCiudadUbicacion,
  codigoPostal,
  setCodigoPostal,
  direccionCompleta,
  setDireccionCompleta,
  telefonoPrincipal,
  setTelefonoPrincipal,
  descripcionUbicacion,
  setDescripcionUbicacion,
  nombreContacto,
  setNombreContacto,
  apellidosContacto,
  setApellidosContacto,
  telefonoContacto,
  setTelefonoContacto,
  mailContacto,
  setMailContacto,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const agentes: Agente[] = [
    { id_usuario: '', nombre_usuario: 'Seleccione un agente asignado', rol: 'Obligatorio' },
    { id_usuario: 'usr_25_00008', nombre_usuario: 'Jose Luis Fernandez Llop', rol: 'Agente' },
    { id_usuario: 'usr_25_00003', nombre_usuario: 'Carlos David Ortega', rol: 'Empleado' },
    { id_usuario: 'usr_25_00004', nombre_usuario: 'Carlos Lamiel', rol: 'Empleado' },
    { id_usuario: 'usr_25_00005', nombre_usuario: 'Frank Admin', rol: 'Superadmin' },
    { id_usuario: 'usr_25_00006', nombre_usuario: 'Frank Auxiliar', rol: 'Empleado' },
    { id_usuario: 'usr_25_00007', nombre_usuario: 'Gimeno Auxiliar', rol: 'Agente' },
    { id_usuario: 'usr_25_00001', nombre_usuario: 'Montserrat Valencia', rol: 'Administrativo' },
    { id_usuario: 'usr_25_00002', nombre_usuario: 'Ricardo Calleja', rol: 'Moderador' },
  ];

  const handleComprobar = async () => {
    setLoading(true);
    setCuentaExiste(null);
    try {
      const cuentas = await CuentaService.getCuentas({ codigoCrmFiltro: codigoEdisoft });
      const existe = cuentas.some((cuenta) => cuenta.id_cuenta === codigoEdisoft);
      setCuentaExiste(existe);
    } catch (error) {
      console.error('Error checking cuenta:', error);
      setCuentaExiste(false); // Assume it doesn't exist if there's an error
    } finally {
      setLoading(false);
    }
  };

  // Validación de campos obligatorios
  const edisoftValido = noExisteEdisoft || (codigoEdisoft.trim() !== '' && cuentaExiste === false);
  const datosCuentaValidos = nombreCuenta.trim() !== '' && agenteAsignado !== '' && paisCuenta.trim() !== '' && telefonoCuenta.trim() !== '';
  const direccionValida = paisUbicacion.trim() !== '' && telefonoPrincipal.trim() !== '';
  const puedeContinuar = edisoftValido && datosCuentaValidos && direccionValida;

  const getInputClass = (value: string, isRequired: boolean = false) => {
    const baseClass = "border p-2 rounded-lg w-full";
    if (isRequired && value.trim() === '') {
      return `${baseClass} bg-yellow-100`;
    }
    return baseClass;
  };

  return (
    <div className="p-10 px-8 md:px-56 bg-white rounded-2xl shadow-md max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-6 pt-4 text-center">Crear nueva cuenta</h2>

      <div className="flex flex-col gap-8">
        {/* Comprobación Edisoft */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Comprobación en Edisoft</h3>
          <div className="flex flex-col gap-3">
            {!noExisteEdisoft ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Código Edisoft <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={codigoEdisoft}
                    onChange={(e) => {
                      setCodigoEdisoft(e.target.value);
                      setCuentaExiste(null);
                    }}
                    className={getInputClass(codigoEdisoft, true)}
                    placeholder="Introduce código Edisoft"
                  />
                </div>
                <button
                  onClick={handleComprobar}
                  disabled={loading || !codigoEdisoft.trim()}
                  className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Cargando...' : 'Comprobar duplicado en edisoft'}
                </button>
                {cuentaExiste && (
                  <div className="mt-4 bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg">
                    <p>⚠️ La cuenta que intentas crear ya existe.</p>
                    <button
                      className="mt-3 bg-red-500 text-white rounded-lg px-4 py-2 hover:bg-red-600 transition cursor-pointer"
                      onClick={() => { router.push(`/dashboard/clientes/cuentas/${codigoEdisoft}`) }}
                    >
                      Ir a la ficha de la cuenta
                    </button>
                  </div>
                )}
                {cuentaExiste === false && !loading && (
                  <div className="mt-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-lg">
                    <p>✓ No existe una cuenta con ese código. Puedes crearla.</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="noExisteEdisoft"
                    checked={noExisteEdisoft}
                    onChange={(e) => {
                      setNoExisteEdisoft(e.target.checked);
                      if (e.target.checked) {
                        setCodigoEdisoft('');
                        setCuentaExiste(null);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <label htmlFor="noExisteEdisoft" className="cursor-pointer text-sm">No existe en Edisoft</label>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noExisteEdisoft"
                  checked={noExisteEdisoft}
                  onChange={(e) => setNoExisteEdisoft(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="noExisteEdisoft" className="cursor-pointer">No existe en Edisoft</label>
              </div>
            )}
          </div>
        </div>

        {/* Datos de la cuenta */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Datos de la cuenta</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la cuenta <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={nombreCuenta}
                onChange={(e) => setNombreCuenta(e.target.value)}
                className={getInputClass(nombreCuenta, true)}
                placeholder="Nombre de la cuenta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Agente asignado <span className="text-red-500">*</span></label>
              <select
                value={agenteAsignado}
                onChange={(e) => setAgenteAsignado(e.target.value)}
                className={getInputClass(agenteAsignado, true)}
              >
                <option value="" disabled>Selecciona un agente asignado</option>
                {agentes.map(a => (
                  <option key={a.id_usuario} value={a.id_usuario}>
                    {a.nombre_usuario} ({a.rol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">País de la cuenta <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={paisCuenta}
                onChange={(e) => setPaisCuenta(e.target.value)}
                className={getInputClass(paisCuenta, true)}
                placeholder="País de la cuenta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono principal de la cuenta <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={telefonoCuenta}
                onChange={(e) => setTelefonoCuenta(e.target.value)}
                className={getInputClass(telefonoCuenta, true)}
                placeholder="Teléfono principal de la cuenta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción de la actividad principal</label>
              <textarea
                value={descripcionCuenta}
                onChange={(e) => setDescripcionCuenta(e.target.value)}
                className="border p-2 rounded-lg w-full"
                rows={4}
                placeholder="Descripción de la actividad principal"
              />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Dirección principal de la empresa</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">País <span className="text-red-500">*</span></label>
              <select
                value={paisUbicacion}
                onChange={(e) => setPaisUbicacion(e.target.value)}
                className={getInputClass(paisUbicacion, true)}
              >
                <option value="" disabled>Selecciona un país</option>
                {paises.map((p, i) => <option key={i} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono principal <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={telefonoPrincipal}
                onChange={(e) => setTelefonoPrincipal(e.target.value)}
                className={getInputClass(telefonoPrincipal, true)}
                placeholder="Teléfono principal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input
                type="text"
                value={estadoUbicacion}
                onChange={(e) => setEstadoUbicacion(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Estado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <input
                type="text"
                value={ciudadUbicacion}
                onChange={(e) => setCiudadUbicacion(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Ciudad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Código postal</label>
              <input
                type="text"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Código postal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección completa</label>
              <input
                type="text"
                value={direccionCompleta}
                onChange={(e) => setDireccionCompleta(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Dirección completa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción de la ubicación</label>
              <textarea
                value={descripcionUbicacion}
                onChange={(e) => setDescripcionUbicacion(e.target.value)}
                className="border p-2 rounded-lg w-full"
                rows={3}
                placeholder="Descripción de la ubicación"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="pb-6">
          <h3 className="text-lg font-semibold mb-4">Contacto principal <span className="text-gray-500 text-sm">(Creará un nuevo contacto asociado a la cuenta)</span></h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellidos</label>
              <input
                type="text"
                value={apellidosContacto}
                onChange={(e) => setApellidosContacto(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Apellidos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Teléfono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={mailContacto}
                onChange={(e) => setMailContacto(e.target.value)}
                className="border p-2 rounded-lg w-full"
                placeholder="Email"
              />
            </div>
          </div>
        </div>

        {/* Botón continuar */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setFaseCrearCuenta(2)}
            disabled={!puedeContinuar}
            className={`px-6 py-3 rounded-lg transition ${
              puedeContinuar
                ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                : "bg-gray-400 text-white opacity-50 cursor-not-allowed"
            }`}
          >
            Continuar y revisar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Fase0;
