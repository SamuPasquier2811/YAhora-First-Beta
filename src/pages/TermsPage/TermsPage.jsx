import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './TermsPage.css';

function TermsPage() {
    const navigate = useNavigate();

    return (
        <div className="terms-page">
            {/* Navbar mínima */}
            <nav className="navbar">
                <div 
                    className="logo" 
                    onClick={() => navigate('/home')}
                    style={{ cursor: 'pointer' }}
                >
                    YAhora?
                </div>
                <button 
                    className="btn btn-outline-home btn-register-login"
                    onClick={() => navigate('/register')}
                >
                    Registrarse
                </button>
            </nav>

            {/* Contenido de Términos */}
            <div className="terms-container">
                <div className="terms-content">
                    <h1>Términos y Condiciones de Uso</h1>
                    <p className="last-updated">Última actualización: Diciembre 2025</p>
                    
                    <div className="terms-section">
                        <h2>1. Aceptación de los Términos</h2>
                        <p>
                            Bienvenido a YAhora?, una plataforma digital que permite a los usuarios realizar preguntas y recibir respuestas de colaboradores registrados dentro de un tiempo determinado.
                            Al acceder, registrarte o utilizar esta plataforma, aceptas cumplir con los presentes Términos y Condiciones. Si no estás de acuerdo, por favor no utilices el servicio.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>2. Edad mínima</h2>
                        <p>
                            El uso de YAhora? está permitido a personas mayores de 16 años.
                            En caso de que el usuario tenga entre 16 y 17 años, declara contar con el consentimiento expreso de su madre, padre o tutor legal para utilizar la plataforma.
                            YAhora? no verifica la edad de los usuarios y no se responsabiliza por declaraciones falsas.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>3. Descripción del Servicio</h2>
                        <p>
                            YAhora? ofrece:
                            Preguntas gratuitas limitadas para nuevos usuarios.
                            Planes de pago con diferentes beneficios (tiempo de respuesta, número de preguntas, subida de imágenes).
                            Respuestas proporcionadas por colaboradores humanos.
                            YAhora? no garantiza que todas las preguntas reciban respuesta dentro del tiempo establecido.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>4. Registro y Cuenta</h2>
                        <p>
                            Para usar ciertas funcionalidades, debes registrarte proporcionando información 
                            veraz y actualizada. Eres responsable de mantener la confidencialidad de tu cuenta.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>5. Uso responsable</h2>
                        <p>
                            El usuario se compromete a: <br/>
                            No enviar contenido ilegal, ofensivo, violento, sexual, discriminatorio o que infrinja derechos de terceros. 
                            No usar la plataforma para actividades fraudulentas. 
                            No acosar ni presionar a los colaboradores.
                            YAhora? se reserva el derecho de bloquear o eliminar cuentas que incumplan estas normas.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>6. Pagos y reembolsos</h2>
                        <p>
                            Los pagos realizados por planes o preguntas no son reembolsables.
                            La compra otorga acceso al servicio, no garantiza resultados específicos.
                            El mal uso de la plataforma no da derecho a devolución.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>7. Propiedad Intelectual</h2>
                        <p>
                            Todo el contenido de la plataforma, incluyendo logotipos, diseño y código, es 
                            propiedad de YAhora? o de sus licenciantes. No puedes copiar o distribuir sin 
                            autorización.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>8. Colaboradores y naturaleza de la relación</h2>
                        <p>
                            Los colaboradores de YAhora? son usuarios independientes que participan de forma voluntaria en la plataforma respondiendo preguntas de otros usuarios.
                            La relación entre YAhora? y los colaboradores no constituye una relación laboral, societaria, de dependencia, ni de prestación de servicios profesionales. Los colaboradores no son empleados, representantes ni agentes de YAhora?.
                            La compensación económica para los colaboradores, cuando exista, se basa exclusivamente en la utilidad percibida por el usuario final, quien podrá indicar si una respuesta le resultó útil o no, conforme a las reglas vigentes de la plataforma al momento de la interacción.
                            YAhora? no garantiza que todas las respuestas generen compensación económica ni que los colaboradores obtengan ingresos mínimos o constantes. El envío de respuestas no implica automáticamente derecho a pago.
                            Las respuestas proporcionadas por los colaboradores representan opiniones personales y no constituyen asesoramiento profesional, legal, médico, financiero u otro especializado.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>9. Sistema de compensación</h2>
                        <p>
                            El sistema de compensación de YAhora? puede variar y ajustarse con el tiempo. La plataforma se reserva el derecho de modificar los criterios de pago, montos, condiciones y mecanismos de compensación, previa comunicación a los colaboradores.
                            La compensación se genera únicamente cuando el sistema así lo determine según las interacciones del usuario, incluyendo pero no limitándose a indicadores de utilidad, valoración o confirmación expresa del usuario.
                            YAhora? no se responsabiliza por la falta de pagos derivados de la ausencia de valoración por parte del usuario o del uso gratuito del servicio.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>10. Limitación de Responsabilidad</h2>
                        <p>
                            YAhora? no se hace responsable por:
                            Decisiones tomadas a partir de las respuestas recibidas.
                            Daños directos o indirectos derivados del uso de la plataforma.
                            Fallos técnicos temporales o interrupciones del servicio.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>11. Modificaciones</h2>
                        <p>
                            YAhora? puede modificar estos Términos en cualquier momento.
                            El uso continuado del servicio implica la aceptación de los cambios.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>12. Contacto</h2>
                        <p>
                            Para consultas o reclamos puede escribir a: 
                            <strong> yahora.consultas@gmail.com</strong>
                        </p>
                    </div>

                    <div className="terms-actions">
                        <button 
                            className="btn btn-outline btn-back"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft size={16} /> Volver atrás
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={() => navigate('/home')}
                        >
                            Ir al inicio
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <footer className="footer">
                <p>© 2025-2026 YAhora? - Respuestas rápidas para Bolivia</p>
            </footer>
        </div>
    );
}

export default TermsPage;

