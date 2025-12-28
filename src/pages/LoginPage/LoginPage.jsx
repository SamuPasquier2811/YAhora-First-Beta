import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import NotificationComponent from '../../components/common/Notification/NotificationComponent';
function LoginPage() {
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        const newErrors = {};

        // Validación de Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'El correo electrónico es obligatorio.';
        } else if (!emailRegex.test(formData.email)) {
            if (!formData.email.includes('@')) {
                newErrors.email = 'El correo debe contener el símbolo "@".';
            } else {
                newErrors.email = 'Por favor, introduce una dirección de correo válida (ejemplo: usuario@dominio.com).';
            }
        }

        // Validación de Contraseña
        if (!formData.password) {
            newErrors.password = 'La contraseña es obligatoria.';
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({
            ...formData,
            [id]: value,
        });
        // Limpiar el error específico cuando el usuario empieza a corregir
        if (errors[id]) {
            setErrors({
                ...errors,
                [id]: '',
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // 1. Validar el formulario
        if (!validateForm()) {
            setIsSubmitting(false);
            return;
        }

        try {
            // 2. Iniciar sesión con Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            // Mostrar notificación de éxito
            showNotification('success', '¡Inicio de sesión exitoso!');

            // Redirigir 
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error) {
            console.error('Error en el login:', error.message);
            
            // Determinar el mensaje de error amigable
            let errorMessage = 'Hubo un error al iniciar sesión.';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Correo o contraseña incorrectos.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Confirma tu correo electrónico antes de iniciar sesión.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Error de conexión. Verifica tu internet.';
            } else if (error.message.includes('User not found')) {
                errorMessage = 'No existe una cuenta con este correo.';
            }
            
            showNotification('error', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setIsNotificationVisible(true);
    };

    const hideNotification = () => {
        setIsNotificationVisible(false);
        setTimeout(() => setNotification(null), 300);
    };

    return (
        <div className="login-page">
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

            {/* Formulario de Login */}
            <div className="login-container">
                <div className="login-card">
                    <h2>Iniciar Sesión</h2>
                    <p className="subtitle">Accede a tu cuenta para continuar</p>                
                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        <div className="form-group">
                            <label htmlFor="email">Correo Electrónico</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="tucorreo@ejemplo.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                className={errors.email ? 'input-error' : ''}
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>
                        
                        <div className="form-group password-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={errors.password ? 'input-error' : ''}
                                />
                                <button 
                                    type="button"
                                    className="password-toggle"
                                    onClick={togglePasswordVisibility}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary btn-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span> Iniciando sesión...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </button>
                    </form>
                
                    <div className="login-footer">
                        <p>
                            ¿No tienes cuenta?{' '}
                            <span 
                                className="link"
                                onClick={() => navigate('/register')}
                            >
                                Regístrate aquí
                            </span>
                        </p>
                        
                        <button 
                            className="btn btn-outline-home btn-home"
                            onClick={() => navigate('/home')}
                        >
                            <ArrowLeft size={16} /> Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <footer className="footer">
                <p>© 2025 YAhora? - Respuestas rápidas para Bolivia</p>
            </footer>
            {notification && isNotificationVisible && (
                <NotificationComponent
                    type={notification.type}
                    message={notification.message}
                    onClose={hideNotification}
                />
            )}
        </div>
    )
}

export default LoginPage
