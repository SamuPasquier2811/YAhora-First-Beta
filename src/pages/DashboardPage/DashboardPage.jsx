import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, User, History, Users, Shield, Plus, ChevronDown } from 'lucide-react';
import QuestionModal from '../../components/QuestionModal/QuestionModal';
import QuestionsList from '../../components/QuestionsList/QuestionsList';
import PurchaseButton from '../../components/PurchaseButton/PurchaseButton';
import PurchaseModal from '../../components/PurchaseModal/PurchaseModal';
import NotificationComponent from '../../components/common/Notification/NotificationComponent';
import { useNotification } from '../../hooks/useNotification';
import './DashboardPage.css';

function DashboardPage() {
    const navigate = useNavigate();
    const { showNotification, removeNotification, getNotifications } = useNotification();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [userQuestions, setUserQuestions] = useState([]);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const notifications = getNotifications();

    useEffect(() => {
        fetchUserData();
        fetchUserQuestions();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: perfil } = await supabase
                .from('perfiles')
                .select('id, nombre_completo, tipo, preguntas_disponibles, email, plan_actual, tiempo_respuesta_minutos, imagenes_permitidas')
                .eq('id', user.id)
                .single();

            if (!perfil) {
                // Crear perfil si no existe
                const { data: nuevoPerfil } = await supabase
                    .from('perfiles')
                    .insert({
                        id: user.id,
                        email: user.email,
                        nombre_completo: user.user_metadata?.full_name || user.email.split('@')[0],
                        tipo: 'usuario',
                        preguntas_disponibles: 2,
                        plan_actual: 'gratis',
                        tiempo_respuesta_minutos: 7,
                        imagenes_permitidas: false
                    })
                    .select()
                    .single();

                setUserData({
                    id: user.id,
                    email: user.email,
                    nombre_completo: nuevoPerfil?.nombre_completo || user.email.split('@')[0],
                    tipo: nuevoPerfil?.tipo || 'usuario',
                    preguntas_disponibles: nuevoPerfil?.preguntas_disponibles || 2,
                    plan_actual: nuevoPerfil?.plan_actual || 'gratis',
                    tiempo_respuesta_minutos: nuevoPerfil?.tiempo_respuesta_minutos || 7,
                    imagenes_permitidas: nuevoPerfil?.imagenes_permitidas || false
                });
            } else {
                setUserData({
                    id: user.id,
                    email: user.email,
                    nombre_completo: perfil.nombre_completo || user.email.split('@')[0],
                    tipo: perfil.tipo || 'usuario',
                    preguntas_disponibles: perfil.preguntas_disponibles,
                    plan_actual: perfil.plan_actual || 'gratis',
                    tiempo_respuesta_minutos: perfil.tiempo_respuesta_minutos || 7,
                    imagenes_permitidas: perfil.imagenes_permitidas || false
                });
            }

        } catch (error) {
            console.error('Error:', error);
            showNotification('error', 'Error cargando tus datos');
        } finally {
            setLoading(false);
        }
    };

    // Función para cargar preguntas del usuario
    const fetchUserQuestions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: preguntas } = await supabase
                .from('preguntas')
                .select(`
                    *,
                    categorias (nombre),
                    zonas_la_paz (nombre)
                `)
                .eq('usuario_id', user.id)
                .order('creada_en', { ascending: false });

            if (preguntas) {
                const formattedQuestions = preguntas.map(pregunta => ({
                    id: pregunta.id,
                    contenido: pregunta.contenido,
                    categoria: pregunta.categorias?.nombre || 'Sin categoría',
                    zona: pregunta.zonas_la_paz?.nombre || 'No especificada',
                    estado: pregunta.estado,
                    respuestas: pregunta.num_respuestas,
                    creada_en: pregunta.creada_en,
                    imagen_url: pregunta.imagen_url 
                }));
                setUserQuestions(formattedQuestions);
            }
        } catch (error) {
            console.error('Error cargando preguntas:', error);
            showNotification('error', 'Error cargando tus preguntas');
        }
    };

    // Función para manejar el envío de una nueva pregunta
    const handleSubmitQuestion = async (questionData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Insertar la pregunta CON imagen_url si existe
            const { data: nuevaPregunta, error: preguntaError } = await supabase
                .from('preguntas')
                .insert({
                    usuario_id: user.id,
                    contenido: questionData.contenido,
                    categoria_id: questionData.categoria_id,
                    zona_id: questionData.zona_id || null,
                    estado: 'pendiente',
                    imagen_url: questionData.imagen_url || null
                })
                .select(`
                    *,
                    categorias (nombre),
                    zonas_la_paz (nombre)
                `)
                .single();

            if (preguntaError) {
                console.error('Error insertando pregunta:', preguntaError);
                throw preguntaError;
            }

            // 2. Restar 1 a preguntas_disponibles
            const { error: updateError } = await supabase
                .from('perfiles')
                .update({
                    preguntas_disponibles: userData.preguntas_disponibles - 1
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 3. Actualizar estado local
            setUserData({
                ...userData,
                preguntas_disponibles: userData.preguntas_disponibles - 1
            });

            // 4. Añadir la nueva pregunta a la lista local
            const nuevaPreguntaFormateada = {
                id: nuevaPregunta.id,
                contenido: nuevaPregunta.contenido,
                categoria: nuevaPregunta.categorias?.nombre,
                zona: nuevaPregunta.zonas_la_paz?.nombre,
                estado: nuevaPregunta.estado,
                respuestas: nuevaPregunta.num_respuestas,
                creada_en: nuevaPregunta.creada_en,
                imagen_url: nuevaPregunta.imagen_url
            };

            setUserQuestions(prev => [nuevaPreguntaFormateada, ...prev]);

            showNotification('success', '¡Pregunta enviada exitosamente!');

        } catch (error) {
            console.error('Error enviando pregunta:', error);
            showNotification('error', 'Error al enviar la pregunta');
        }
    };

    // En DashboardPage.jsx, añade esta función
    const actualizarEstadoPregunta = useCallback((preguntaId, nuevoEstado) => {
        setUserQuestions(prev => prev.map(pregunta => 
            pregunta.id === preguntaId 
                ? { ...pregunta, estado: nuevoEstado }
                : pregunta
        ));
    }, []);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenu && !event.target.closest('.profile-menu-wrapper')) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showMenu]);


    useEffect(() => {
        // Suscribirse a cambios en el perfil del usuario
        if (!userData?.id) return;

        const channel = supabase
            .channel(`profile-${userData.id}`)
            .on('postgres_changes', 
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'perfiles',
                filter: `id=eq.${userData.id}`
            }, 
            (payload) => {
                // console.log('Perfil actualizado:', payload.new);
                
                // Actualizar TODOS los campos si cambian
                setUserData(prev => ({
                    ...prev,
                    preguntas_disponibles: payload.new.preguntas_disponibles !== undefined ? 
                        payload.new.preguntas_disponibles : prev.preguntas_disponibles,
                    tiempo_respuesta_minutos: payload.new.tiempo_respuesta_minutos !== undefined ? 
                        payload.new.tiempo_respuesta_minutos : prev.tiempo_respuesta_minutos,
                    imagenes_permitidas: payload.new.imagenes_permitidas !== undefined ? 
                        payload.new.imagenes_permitidas : prev.imagenes_permitidas
                }));
            }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userData?.id]);

    useEffect(() => {
        if (!userData?.id) return;
        
        const channel = supabase
            .channel('dashboard-preguntas')
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'preguntas',
                    filter: `usuario_id=eq.${userData.id}`
                }, 
                () => {
                    // console.log('📝 Pregunta actualizada, refrescando lista...');
                    fetchUserQuestions();
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, [userData?.id]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleSwitchToCollaborator = () => navigate('/collaborator');
    const handleSwitchToAdmin = () => navigate('/admin');

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p className="spinner-text">Cargando...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="dashboard-minimal">
                <header className="dashboard-header-minimal">
                    <div className="logo" onClick={() => navigate('/home')}>
                        YAhora?
                    </div>
                    <button className="btn-logout-minimal" onClick={handleLogout}>
                        <LogOut size={18} />
                    </button>
                </header>
                <main className="main-content-minimal">
                    <div className="error-state">
                        <h2>Error cargando datos</h2>
                        <p>No se pudieron cargar tus datos. Intenta recargar la página.</p>
                        <button onClick={fetchUserData} className="retry-button">
                            Reintentar
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-minimal">
            {/* Notificaciones */}
            {notifications.map((notification) => (
                <NotificationComponent
                    key={notification.id}
                    type={notification.type}
                    message={notification.message}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
            
            {/* Header con menú */}
            <header className="dashboard-header-minimal">
                <div className="logo" onClick={() => navigate('/home')}>
                    YAhora?
                </div>
                
                <div className="profile-menu-wrapper">
                    <button 
                        className="profile-menu-toggle"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                    >
                        <div className="profile-avatar">
                            <User size={20} />
                        </div>
                        <ChevronDown size={16} />
                    </button>
                
                    {showMenu && (
                        <div className="profile-dropdown-menu">
                            <div className="menu-user-info">
                                <p className="menu-user-name">{userData.nombre_completo}</p>
                                <p className="menu-user-email">{userData.email}</p>
                            </div>
                            
                            <div className="menu-divider"></div>
                            
                            <button className="menu-item" onClick={() => navigate('/history')}>
                                <History size={16} />
                                <span>Historial</span>
                            </button>
                            
                            <button className="menu-item" onClick={() => navigate('/profile')}>
                                <User size={16} />
                                <span>Mis Datos</span>
                            </button>
                            
                            {userData?.tipo === 'colaborador' && (
                            <button className="menu-item" onClick={handleSwitchToCollaborator}>
                                <Users size={16} />
                                <span>Cambiar a Colaborador</span>
                            </button>
                            )}
                            
                            {userData?.tipo === 'admin' && (
                                <>
                                    <button className="menu-item" onClick={handleSwitchToCollaborator}>
                                        <Users size={16} />
                                        <span>Cambiar a Colaborador</span>
                                    </button>
                                    <button className="menu-item" onClick={handleSwitchToAdmin}>
                                        <Shield size={16} />
                                        <span>Cambiar a Admin</span>
                                    </button>
                                </>
                            )}
                            
                            <div className="menu-divider"></div>
                            
                            <button className="menu-item logout" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Salir</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content-minimal">       
                {/* DISCLAIMER HORARIO - AGREGAR ESTO */}
                <div className="disclaimer-banner">
                    <div className="disclaimer-text">
                    <strong>Horario recomendado:</strong> Para mayor probabilidad de respuestas rápidas, 
                    realiza preguntas entre <strong>7:00 AM y 11:00 PM</strong> (hora Bolivia). 
                    Fuera de este horario, los colaboradores podrían no estar disponibles.
                    </div>
                </div>
                <h1 className="main-title-minimal">¿En qué podemos ayudarte?</h1>
                <div className="big-button-container">
                    <button 
                        className="big-question-button"
                        onClick={() => {
                            if (userData.preguntas_disponibles > 0) {
                                setShowQuestionModal(true);
                            } else {
                                setShowPurchaseModal(true);
                                showNotification('info', 'No tienes preguntas disponibles. ¡Adquiere más para hacer preguntas!');
                            }
                        }}
                        disabled={false}
                    >
                        <div className="plus-icon">
                            <Plus size={48} />
                        </div>
                        <span className="button-text">
                            {userData.preguntas_disponibles > 0 ? 'Hacer una pregunta' : 'Adquirir preguntas'}
                        </span>
                        <span className="questions-counter">
                            {userData.preguntas_disponibles} {userData.preguntas_disponibles === 1 ? 'pregunta disponible' : 'preguntas disponibles'} 
                        </span>
                        {userData.preguntas_disponibles <= 0 && (
                            <span className="no-questions-warning">
                                ¡Click aquí para adquirir más preguntas!
                            </span>
                        )}
                    </button>
                </div>
                
                <div className="answers-section-simple">
                    <h2>Tus Preguntas</h2>
                    <p className="answers-subtitle-simple">
                        Aquí recibirás las respuestas a todas tus preguntas en tiempo real 
                        por parte de nuestros colaboradores bolivianos
                    </p>
                    <QuestionsList 
                        questions={userQuestions} 
                        tiempoRespuestaUsuario={userData?.tiempo_respuesta_minutos || 7}
                        userData={userData}
                        onPreguntaCerrada={actualizarEstadoPregunta}
                    />
                </div>
                <PurchaseButton 
                    onClick={() => setShowPurchaseModal(true)}
                />
            </main>
            
            <QuestionModal
                isOpen={showQuestionModal}
                onClose={() => setShowQuestionModal(false)}
                userData={userData}
                onSubmit={handleSubmitQuestion}
                showNotification={showNotification}
            />
            <PurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                userData={userData}
                showNotification={showNotification}
            />
        </div>
    );
}

export default DashboardPage;
