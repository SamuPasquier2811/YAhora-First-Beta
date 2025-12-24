// src/pages/PrivacyPage/PrivacyPage.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PrivacyPage.css';

function PrivacyPage() {
    const navigate = useNavigate();

    return (
        <div className="privacy-page">
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
                    className="btn btn-outline"
                    onClick={() => navigate('/register')}
                >
                    Registrarse
                </button>
            </nav>

            {/* Contenido de Privacidad */}
            <div className="privacy-container">
                <div className="privacy-content">
                    <h1>Política de Privacidad</h1>
                    <p className="last-updated">Última actualización: Diciembre 2025</p>
                    
                    <div className="privacy-section">
                        <h2>1. Información que Recopilamos</h2>
                        <p>
                            Recopilamos información que nos proporcionas al registrarte, como nombre, 
                            correo electrónico y fecha de nacimiento. También recopilamos datos de uso 
                            de la plataforma.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>2. Uso de la Información</h2>
                        <p>
                            Utilizamos su información para: Operar y mejorar el servicio, gestionar cuentas
                            de usuarios y colaboradores, procesar pagos, comunicación relacionada con el servicio.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>3. Compartir Información</h2>
                        <p>
                            No vendemos ni compartimos datos personales con terceros, excepto cuando sea necesario para:
                            Procesar pagos. Cumplir con obligaciones legales
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>4. Protección de Datos</h2>
                        <p>
                            Aplicamos medidas razonables para proteger la información, aunque ningún sistema es 100% seguro.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>5. Derechos del usuario</h2>
                        <p>
                            El usuario tiene derecho a acceder, corregir o eliminar su información personal. 
                            Puede ejercer estos derechos contactándonos.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>6. Edad mínima</h2>
                        <p>
                            YAhora? no recopila de forma intencional información personal de menores de 16 años sin el consentimiento de sus padres o tutores legales.
                            Si un padre, madre o tutor considera que un menor ha proporcionado datos personales sin autorización, puede contactarnos para solicitar su eliminación.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>7. Cambios en la Política</h2>
                        <p>
                            Esta política puede actualizarse. El uso continuo del servicio implica aceptación de los cambios.
                        </p>
                    </div>

                    <div className="privacy-section">
                        <h2>8. Contacto</h2>
                        <p> 
                            <strong> yahora.consultas@gmail.com</strong>
                        </p>
                    </div>

                    <div className="privacy-actions">
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
                <p>© 2025 YAhora? - Respuestas rápidas para Bolivia</p>
            </footer>
        </div>
    );
}

export default PrivacyPage;