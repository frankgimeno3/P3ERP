import EntityExcelImport from '@/app/components/EntityExcelImport';
export default function F2impc({configuracion}:{setFaseImportacionCuenta:React.Dispatch<React.SetStateAction<number>>;configuracion:string}) {return <EntityExcelImport entity="cuentas" mode={configuracion}/>;}
