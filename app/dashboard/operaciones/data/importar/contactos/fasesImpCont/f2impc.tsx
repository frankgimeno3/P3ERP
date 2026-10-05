import EntityExcelImport from '@/app/components/EntityExcelImport';
export default function F2impc({configuracion}:{setFaseImportacionContacto:React.Dispatch<React.SetStateAction<number>>;configuracion:string}) {return <EntityExcelImport entity="contactos" mode={configuracion}/>;}
