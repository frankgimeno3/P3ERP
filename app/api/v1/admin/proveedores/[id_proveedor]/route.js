import { deleteSupplier, findSupplier, updateSupplier, supplierInvoices, supplierCharges, supplierPrices, supplierBankCharges, adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
import { getTickets } from '@/server/features/proveedor/TicketRepository.js';
export const runtime = 'nodejs';
export async function GET(_request,{params}) {
  try { const proveedor = await findSupplier((await params).id_proveedor); const [tickets,facturas,cargos,precios,cargosBancarios] = await Promise.all([getTickets(proveedor.id_proveedor),supplierInvoices(proveedor.id_proveedor),supplierCharges(proveedor.id_proveedor),supplierPrices(proveedor.id_proveedor),supplierBankCharges(proveedor.id_proveedor)]); return Response.json({proveedor,tickets,facturas,cargos,precios,cargosBancarios}); }
  catch (error) { return adminError(error); }
}
export async function PUT(request,{params}) { try { return Response.json(await updateSupplier((await params).id_proveedor,await request.json())); } catch (error) { return adminError(error); } }
export async function DELETE(_request,{params}) { try { return Response.json(await deleteSupplier((await params).id_proveedor)); } catch (error) { return adminError(error); } }
