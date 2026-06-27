'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthenticationService from "@/app/service/AuthenticationService";

export default function Home() {
    const router = useRouter();

    const [employeeNumber, setEmployeeNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            // Primero verificar localStorage
            const storedPayload = localStorage.getItem("userPayload");
            if (storedPayload) {
                router.replace('/dashboard');
                return;
            }

            // Luego verificar sesión de Cognito
            try {
                const sessionPayload = await AuthenticationService.checkSession();
                if (sessionPayload) {
                    localStorage.setItem("userPayload", JSON.stringify(sessionPayload));
                    router.replace('/dashboard');
                }
            } catch (e) {
                // Si no hay sesión, no hacer nada
                console.log('No hay sesión activa');
            }
        };

        checkAuth();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const payload: any = await AuthenticationService.login(employeeNumber, password);

            localStorage.setItem("userPayload", JSON.stringify(payload));

            router.replace('/dashboard');
        } catch (e: any) {
            console.error(e);
            // Si el error es "There is already a signed in user", verificar sesión y redirigir
            if (e?.message?.includes('already a signed in user') || e?.message?.includes('already signed in')) {
                try {
                    const sessionPayload = await AuthenticationService.checkSession();
                    if (sessionPayload) {
                        localStorage.setItem("userPayload", JSON.stringify(sessionPayload));
                        router.replace('/dashboard');
                        return;
                    }
                } catch (sessionError) {
                    // Si no se puede obtener la sesión, mostrar error
                }
            }
            setError(e?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-600 p-8 gap-8">
            <div className="flex flex-row justify-left items-center">
                <p className="text-xl font-bold">Sistema de fichaje PROPORCIÓN 3, S.A.</p>
            </div>

            <div className="flex flex-col items-center justify-center flex-grow">
                <form
                    onSubmit={handleLogin}
                    className="flex flex-col gap-4 bg-gray-900 p-8 rounded shadow-md w-full max-w-md"
                >
                    <h2 className="text-2xl text-white font-semibold mb-4 text-center">
                        Ingrese email y contraseña
                    </h2>

                    <input
                        type="text"
                        placeholder="Introduzca su email"
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        className="p-2 rounded bg-black border border-gray-700 text-white placeholder-gray-400"
                        required
                    />

                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Introduzca su contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="p-2 rounded bg-black border border-gray-700 text-white placeholder-gray-400 w-full pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-200"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                     {error && (
                        <div className="flex flex-col text-red-500 text-sm text-center">
                            <p>ERROR:</p>
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="bg-white text-black py-2 rounded hover:bg-gray-300 transition cursor-pointer"
                    >
                        Identificarse
                    </button>

                    <p className='text-xs text-white'>
                        Si no puede identificarse, por favor envíe email a frank@vidrioperfil.com con el evento que deseaba fichar.
                    </p>
                </form>
            </div>
        </div>
    );
}
