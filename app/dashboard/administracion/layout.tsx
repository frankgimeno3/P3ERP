import type {ReactNode} from 'react';
import styles from './administracion.module.css';
export default function AdministracionLayout({children}:{children:ReactNode}){
 return <div className={styles.module}>{children}</div>;
}
