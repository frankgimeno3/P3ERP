import {createEndpoint} from "../../../../../../server/createEndpoint.js";
import {getCuentaById, updateCuenta} from "../../../../../../server/features/cuenta/CuentaService.js";
import {NextResponse} from "next/server";

export async function GET(request, context) {
    const idCuenta = context?.params?.id_cuenta;
    
    if (!idCuenta) {
        return new NextResponse('ID de cuenta requerido', { status: 400 });
    }

    const handler = createEndpoint(async (request) => {
        const cuenta = await getCuentaById(idCuenta);

        if (!cuenta) {
            return new NextResponse('Cuenta no encontrada', { status: 404 });
        }

        return NextResponse.json(cuenta);
    }, null, true); // isProtected = true

    return handler(request);
}

export async function PUT(request, context) {
    const idCuenta = context?.params?.id_cuenta;
    
    if (!idCuenta) {
        return new NextResponse('ID de cuenta requerido', { status: 400 });
    }

    const handler = createEndpoint(async (request, body) => {
        if (!body) {
            return new NextResponse('Datos de cuenta requeridos', { status: 400 });
        }

        const cuenta = await getCuentaById(idCuenta);

        if (!cuenta) {
            return new NextResponse('Cuenta no encontrada', { status: 404 });
        }

        const cuentaActualizada = await updateCuenta(request.username, idCuenta, body);

        return NextResponse.json(cuentaActualizada);
    }, null, true); // isProtected = true

    return handler(request);
}
