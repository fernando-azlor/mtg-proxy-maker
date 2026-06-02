import Navbar from '../../components/Navbar';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad - MTG Proxy Maker',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main id="main-content" className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidad</h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: mayo 2026</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Responsable del tratamiento</h2>
            <p>MTG Proxy Maker es un proyecto educativo desarrollado en el marco de la asignatura Diseño y Desarrollo Web Seguro de la Universidad San Jorge. No tiene carácter comercial.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Datos que recogemos</h2>
            <p className="mb-2">Recogemos únicamente los datos estrictamente necesarios para el funcionamiento del servicio:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Dirección de correo electrónico (para identificar tu cuenta)</li>
              <li>Contraseña hasheada con bcrypt (nunca almacenamos la contraseña en texto plano)</li>
              <li>Mazos y cartas que guardas en la aplicación</li>
            </ul>
            <p className="mt-2 text-gray-400">No recogemos nombre, teléfono, dirección postal ni ningún otro dato personal. Este principio de minimización está recogido en el art. 5.1.c del RGPD.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Base legal del tratamiento</h2>
            <p>El tratamiento de tus datos se basa en el consentimiento que otorgas al crear una cuenta (art. 6.1.a del Reglamento General de Protección de Datos). Puedes retirar ese consentimiento en cualquier momento eliminando tu cuenta.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Finalidad del tratamiento</h2>
            <p>Tus datos se usan exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
              <li>Identificarte cuando inicias sesión</li>
              <li>Guardar y recuperar tus mazos de cartas</li>
              <li>Generar los PDFs de proxies que solicitas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookies</h2>
            <p>Usamos una única cookie de sesión llamada <code className="bg-gray-800 px-1 rounded text-amber-400">token</code> que contiene tu JWT de autenticación. Es una cookie esencial para el funcionamiento del servicio — sin ella no puedes iniciar sesión. No usamos cookies de analítica, publicidad ni rastreo de ningún tipo.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Tus derechos</h2>
            <p className="mb-2">De acuerdo con el RGPD, tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong className="text-gray-300">Acceso:</strong> consultar qué datos tenemos sobre ti</li>
              <li><strong className="text-gray-300">Rectificación:</strong> corregir datos incorrectos</li>
              <li><strong className="text-gray-300">Supresión:</strong> eliminar tu cuenta y todos tus datos (art. 17 RGPD)</li>
              <li><strong className="text-gray-300">Portabilidad:</strong> recibir tus datos en formato estructurado</li>
            </ul>
            <p className="mt-3">Puedes ejercer el derecho de supresión directamente desde tu perfil en la aplicación.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Conservación de datos</h2>
            <p>Tus datos se conservan mientras mantengas una cuenta activa. Al eliminar tu cuenta, todos tus datos (email, mazos y cartas) se eliminan de forma permanente e inmediata de nuestra base de datos.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-700">
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
