import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
export default function ContentManagementLayout({children}:{children:React.ReactNode}) {
 return <><MiddleNav tituloprincipal="Gestión contenidos"/>{children}</>;
}
