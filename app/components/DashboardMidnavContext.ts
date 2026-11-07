'use client';
import {createContext} from 'react';

export type MidnavDescription = {tituloprincipal: string; currentLabel?: string};
export type RegisterMidnav = (id: string, pathname: string, description: MidnavDescription) => () => void;
export const DashboardMidnavContext = createContext<RegisterMidnav | null>(null);
