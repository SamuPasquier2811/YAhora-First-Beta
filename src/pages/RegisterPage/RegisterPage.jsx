import { useNavigate } from 'react-router-dom'
import './RegisterPage.css'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState, useRef } from 'react'
import NotificationComponent from '../../components/common/Notification/NotificationComponent';
import { supabase } from '../../lib/supabaseClient';
function RegisterPage() {
    const navigate = useNavigate()

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        birthDate: '',
        termsAccepted: false
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);

    const dateInputRef = useRef(null);

    const validateForm = () => {
        const newErrors = {};

        // Validación de Nombre
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'El nombre completo es obligatorio.';
        } else if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/.test(formData.fullName)) {
            newErrors.fullName = 'El nombre solo puede contener letras y espacios.';
        }

        // Validación de Nombre de Usuario
        if (!formData.username.trim()) {
            newErrors.username = 'El nombre de usuario es obligatorio.';
        } else if (formData.username.length < 3) {
            newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres.';
        } else if (formData.username.length > 20) {
            newErrors.username = 'El nombre de usuario no puede tener más de 20 caracteres.';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Solo se permiten letras, números y guión bajo (_).';
        }

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

        // Validación de Confirmación
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden.';
        }

        // Validación de Fecha
        if (formData.birthDate) {
            const birthDate = new Date(formData.birthDate);
            const today = new Date();
            const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

            if (birthDate > minDate) {
                newErrors.birthDate = 'Completa correctamente este campo, por favor.';
            }
        } else {
            newErrors.birthDate = 'Completa correctamente este campo, por favor.';
        }

        // Validación del Checkbox de Términos
        if (!formData.termsAccepted) {
            newErrors.terms = 'Debes aceptar los Términos y Condiciones y la Política de Privacidad.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (id === 'fullName') {
            // Permitir solo letras, espacios y caracteres especiales del español
            const filteredValue = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, '');
            setFormData({
                ...formData,
                [id]: filteredValue,
            });
        } else {
            setFormData({
                ...formData,
                [id]: value,
            });
        }

        if (errors[id]) {
            setErrors({
                ...errors,
                [id]: '',
            });
        }
    };

    // Función para prevenir entrada manual en el campo de fecha
    const handleDateInputKeyDown = (e) => {
        // Permitir solo teclas de navegación y borrado
        const allowedKeys = [
            'Tab', 'Escape', 'Enter', 
            'Backspace', 'Delete',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Home', 'End'
        ];
        
        // Permitir combinaciones de teclas con Ctrl
        if (e.ctrlKey || e.metaKey) {
            return; // Permitir Ctrl+A, Ctrl+C, etc.
        }
        
        // Bloquear entrada de texto manual
        if (!allowedKeys.includes(e.key) && e.key.length === 1) {
            e.preventDefault();
        }
    };

    // Función para manejar el clic en el campo de fecha
    const handleDateInputClick = (e) => {
    //     // Abrir el selector de fecha nativo
    //     if (e.target.showPicker) {
    //         e.target.showPicker();
    //     }
    };

    // Función para validar cuando el usuario selecciona una fecha
    const handleDateChange = (e) => {
        const selectedDate = e.target.value;
        
        // Calcular fecha mínima (16 años atrás)
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
        const minDateString = minDate.toISOString().split('T')[0];
        
        // Si la fecha seleccionada es mayor a la permitida, limpiar el campo
        if (selectedDate > minDateString) {
            setFormData({
                ...formData,
                birthDate: ''
            });
            setErrors({
                ...errors,
                birthDate: 'Completa correctamente este campo, por favor.'
            });
            // Mostrar el calendario nuevamente para que el usuario seleccione otra fecha
            if (dateInputRef.current) {
                dateInputRef.current.focus();
            }
            return;
        }
        
        setFormData({
            ...formData,
            birthDate: selectedDate
        });
        
        // Limpiar error si existe
        if (errors.birthDate) {
            setErrors({
                ...errors,
                birthDate: ''
            });
        }
    };

    // Bloquear eventos de pegado en el campo de fecha
    const handleDateInputPaste = (e) => {
        e.preventDefault();
        return false;
    };

    // Prevenir el evento de drop (arrastrar y soltar)
    const handleDateInputDrop = (e) => {
        e.preventDefault();
        return false;
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // Después de las otras funciones (togglePasswordVisibility, etc.)
    const showNotification = (type, message) => {
        setNotification({ type, message });
        setIsNotificationVisible(true);
    };

    const hideNotification = () => {
        setIsNotificationVisible(false);
        // Limpiar después de la animación
        setTimeout(() => setNotification(null), 300);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // 1. Validar el formulario
        if (!validateForm()) {
            setIsSubmitting(false);
            return; // Detener el envío si hay errores
        }

        try {
            // 2. Registrar al usuario en Auth de Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            // 3. Crear el perfil en nuestra tabla 'perfiles'
            const { error: profileError } = await supabase
                .from('perfiles')
                .insert([
                    {
                        id: authData.user.id, // Mismo ID que auth.users
                        email: formData.email,
                        nombre_completo: formData.fullName,
                        nombre_usuario: formData.username,
                        fecha_nacimiento: formData.birthDate,
                        tipo: 'usuario', // Valor por defecto
                    },
                ]);

            if (profileError) throw profileError;

            // 4. Éxito: Mostrar notificación y redirigir
            showNotification('success', '¡Registro exitoso! Por favor, inicia sesión con tu cuenta y contraseña.');
            // Redirigir después de 3 segundos
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            console.error('Error en el registro:', error.message);
            // Determinar el mensaje de error amigable
            let errorMessage = 'Hubo un error al crear la cuenta.';
            
            if (error.message.includes('already registered') || 
                error.message.includes('already exists') ||
                error.message.includes('Email address')) {
                errorMessage = 'El correo electrónico ya se encuentra registrado.';
            } else if (error.message.includes('row-level security')) {
                errorMessage = 'Error de permisos. Por favor, contacta al soporte.';
            } else if (error.message.includes('password')) {
                errorMessage = 'La contraseña no cumple con los requisitos de seguridad.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
            }
            
            // Mostrar notificación de error
            showNotification('error', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="register-page">
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
                    onClick={() => navigate('/login')}
                >
                    Ingresar
                </button>
            </nav>

            {/* Formulario de Registro */}
            <div className="register-container">
                <div className="register-card">
                    <h2>Crear Cuenta</h2>
                    <p className="subtitle">Comienza tu experiencia con YAhora?</p>        
                    <form onSubmit={handleSubmit} className="register-form" noValidate>
                        <div className="form-group">
                            <label htmlFor="fullName">Nombre Completo</label>
                            <input
                                type="text"
                                id="fullName"
                                placeholder="Juan José Peréz García"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className={errors.fullName ? 'input-error' : ''}
                                maxLength="80"
                                title='Solo se permiten letras y espacios'
                            />
                            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">Nombre de Usuario</label>
                            <input
                                type="text"
                                id="username"
                                placeholder="Juan Peréz"
                                value={formData.username}
                                onChange={(e) => {
                                    // Solo permitir letras, números y guión bajo
                                    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                    setFormData({
                                        ...formData,
                                        username: value
                                    });
                                    if (errors.username) {
                                        setErrors({
                                            ...errors,
                                            username: ''
                                        });
                                    }
                                }}
                                className={errors.username ? 'input-error' : ''}
                                maxLength="20"
                                title='Solo letras, números y guión bajo (_)'
                            />
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>
                        
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
                            <small className="password-hint">
                                Mínimo 6 caracteres
                            </small>
                        </div>
                        
                        <div className="form-group password-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className={errors.confirmPassword ? 'input-error' : ''}
                                />
                                <button 
                                    type="button"
                                    className="password-toggle"
                                    onClick={toggleConfirmPasswordVisibility}
                                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="birthDate">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                ref={dateInputRef}
                                className='input-birth-date'
                                id="birthDate"
                                value={formData.birthDate}
                                onChange={handleDateChange}
                                onClick={handleDateInputClick}
                                onKeyDown={handleDateInputKeyDown}
                                onPaste={handleDateInputPaste}
                                onDrop={handleDateInputDrop}
                                max={new Date(new Date().getFullYear() - 16, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                                title="Selecciona una fecha del calendario"
                                onInput={(e) => {
                                    // Validar el formato en tiempo real
                                    const value = e.target.value;
                                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== '') {
                                        e.target.value = formData.birthDate;
                                    }
                                }}
                            />
                            {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
                        </div>
                        
                        <div className={`terms-group ${errors.terms ? 'input-error' : ''}`}>
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={formData.termsAccepted}
                                onChange={(e) => {
                                    setFormData({ ...formData, termsAccepted: e.target.checked });
                                    // Limpiar el error cuando el usuario hace clic
                                    if (errors.terms) {
                                        setErrors({ ...errors, terms: '' });
                                    }
                                }}
                            />
                            <label htmlFor="terms">
                                Acepto los{' '}
                                <span 
                                    className="link"
                                    onClick={() => navigate('/terms')}
                                >
                                    Términos y Condiciones
                                </span>
                                {' '}y la{' '}
                                <span 
                                    className="link"
                                    onClick={() => navigate('/privacy')}
                                >
                                    Política de Privacidad
                                </span>
                            </label>
                        </div>
                        {errors.terms && <span className="error-message" style={{ display: 'block', marginBottom: '0.8rem' }}>{errors.terms}</span>}
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary btn-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span> Creando cuenta...
                                </>
                            ) : (
                                'Crear Cuenta'
                            )}
                        </button>
                    </form>
                    
                    <div className="register-footer">
                        <p>
                            ¿Ya tienes cuenta?{' '}
                            <span 
                                className="link"
                                onClick={() => navigate('/login')}
                            >
                                Inicia sesión aquí
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

export default RegisterPage
