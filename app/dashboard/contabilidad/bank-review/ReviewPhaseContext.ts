export const money = (value: any) => Number(value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const input = 'w-full rounded border bg-white p-2';
export const select = `${input} enabled:cursor-pointer enabled:hover:border-blue-950 disabled:cursor-not-allowed disabled:bg-gray-100`;

// Draft state stays in the wizard. Each phase renders it without its own copy.
export type ReviewPhaseContext = {
  phase: number; mode: 'review' | 'assign' | 'charge'; forced: boolean; common: boolean; simpleAssignment: boolean; saving: boolean;
  lines: any[]; active: any[]; expenseLines: any[]; drafts: Record<string, any>; data: any;
  patch: (id: string, value: any, individual?: boolean) => void;
  entities: (type: string) => any[]; entityName: (draft: any) => string;
  conflict: (line: any, draft: any) => boolean; previousOwners: (line: any) => string;
  charges: (draft: any) => any[]; calculation: (line: any, draft: any) => any;
};
export type ReviewLineContext = { context: ReviewPhaseContext; line: any; draft: any; calculation: any };
