'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Banner de aviso de cookies (LSSI-CE art. 22.2 / RGPD)
 *
 * La única cookie utilizada es `token` (JWT httpOnly), de naturaleza
 * estrictamente necesaria para la autenticación. Aunque las cookies
 * esenciales no requieren consentimiento previo, se muestra este aviso
 * para informar al usuario de su existencia y finalidad.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostrar solo si el usuario aún no ha visto el aviso
    if (!localStorage.getItem('cookie_consent')) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-700 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-base text-gray-300">
          <p>
            <span className="font-semibold text-white">🍪 Uso de cookies.</span>{' '}
            Esta web utiliza únicamente una cookie técnica llamada{' '}
            <code className="bg-gray-800 px-1 rounded text-amber-400 text-xs">token</code>
            {' '}para gestionar tu sesión de usuario (JWT). Es estrictamente necesaria
            para el funcionamiento del servicio y no requiere tu consentimiento,
            pero queremos informarte de su existencia.{' '}
            <Link href="/privacy" className="text-amber-400 hover:underline">
              Política de privacidad
            </Link>
          </p>
        </div>
        <button
          onClick={accept}
          className="shrink-0 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-5 py-2 rounded-lg text-base transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
