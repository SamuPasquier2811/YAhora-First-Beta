import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, User, History, Users, Shield, ChevronDown, MessageSquare, Calendar, Tag, MapPin, AlertCircle } from 'lucide-react';
import './HistoryPage.css';

function HistoryPage() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        fetchUserData();
        fetchHistory();
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
                .select('*')
                .eq('id', user.id)
                .single();

            setUserData({
                id: user.id,
                email: user.email,
                nombre_completo: perfil?.nombre_completo || user.email.split('@')[0],
                tipo: perfil?.tipo || 'usuario'
            });
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Obtener todas las preguntas del usuario con sus respuestas
            const { data: preguntas, error } = await supabase
                .from('preguntas')
                .select(`
                    *,
                    categorias (nombre),
                    zonas_la_paz (nombre),
                    respuestas (
                        id,
                        contenido,
                        creada_en,
                        colaborador:perfiles (
                            nombre_completo,
                            email
                        )
                    )
                `)
                .eq('usuario_id', user.id)
                .order('creada_en', { ascending: false });

            if (error) throw error;

            // Formatear los datos para mostrar
            const formattedHistory = preguntas.map(pregunta => ({
                id: pregunta.id,
                contenido: pregunta.contenido,
                categoria: pregunta.categorias?.nombre || 'Sin categoría',
                zona: pregunta.zonas_la_paz?.nombre || 'No especificada',
                estado: pregunta.estado,
                fecha: new Date(pregunta.creada_en).toLocaleDateString('es-ES'),
                imagen_url: pregunta.imagen_url,
                respuestas: pregunta.respuestas.map(respuesta => ({
                    id: respuesta.id,
                    contenido: respuesta.contenido,
                    fecha: new Date(respuesta.creada_en).toLocaleDateString('es-ES'),
                    colaborador: respuesta.colaborador?.nombre_completo || 
                               respuesta.colaborador?.email?.split('@')[0] || 
                               'Colaborador'
                }))
            }));

            setHistoryData(formattedHistory);
        } catch (error) {
            console.error('Error cargando historial:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleSwitchToDashboard = () => navigate('/dashboard');
    const handleSwitchToCollaborator = () => navigate('/collaborator');
    const handleSwitchToAdmin = () => navigate('/admin');

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className="history-page">
            {/* Header con menú */}
            <header className="dashboard-header-minimal header-history-profile">
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
                                <p className="menu-user-name">{userData?.nombre_completo}</p>
                                <p className="menu-user-email">{userData?.email}</p>
                            </div>
                            
                            <div className="menu-divider"></div>
                            
                            <button className="menu-item" onClick={handleSwitchToDashboard}>
                                <History size={16} />
                                <span>Panel Principal</span>
                            </button>
                            
                            <button className="menu-item" onClick={() => navigate('/profile')}>
                                <User size={16} />
                                <span>Mis Datos</span>
                            </button>
                            
                            {userData?.tipo === 'colaborador' && (
                            <button className="menu-item" onClick={handleSwitchToCollaborator}>
                                <Users size={16} />
                                <span>Modo Colaborador</span>
                            </button>
                            )}
                            
                            {userData?.tipo === 'admin' && (
                                <>
                                    <button className="menu-item" onClick={handleSwitchToCollaborator}>
                                        <Users size={16} />
                                        <span>Modo Colaborador</span>
                                    </button>
                                    <button className="menu-item" onClick={handleSwitchToAdmin}>
                                        <Shield size={16} />
                                        <span>Modo Admin</span>
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

            <main className="history-main">
                <div className="history-header">
                    <div className="history-title-section">
                        <History size={48} className="history-icon" />
                        <div>
                            <h1>Historial de Preguntas</h1>
                            <p className="history-subtitle">
                                Aquí puedes ver todas las preguntas que has realizado y las respuestas recibidas
                            </p>
                        </div>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="loading-history">
                        <div className="spinner"></div>
                        <p>Cargando historial...</p>
                    </div>
                ) : historyData.length === 0 ? (
                    <div className="empty-history">
                        <MessageSquare size={64} className="empty-icon" />
                        <h3>No tienes preguntas en tu historial</h3>
                        <p>Cuando hagas preguntas, aparecerán aquí junto con sus respuestas.</p>
                        <button 
                            className="btn-primary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Ir al Panel Principal
                        </button>
                    </div>
                ) : (
                    <div className="history-grid">
                        {historyData.map((pregunta) => (
                            <div key={pregunta.id} className="history-item">
                                <div className="history-question-card">
                                    <div className="question-header">
                                        <h3>{pregunta.contenido}</h3>
                                        {pregunta.imagen_url && (
                                            <div className="question-image-container">
                                                <img 
                                                    src={pregunta.imagen_url} 
                                                    alt="Imagen de la pregunta" 
                                                    className="question-image"
                                                    onClick={() => window.open(pregunta.imagen_url, '_blank')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="question-meta">
                                        <span className="meta-item">
                                            <Calendar size={14} />
                                            {pregunta.fecha}
                                        </span>
                                        <span className="meta-item">
                                            <Tag size={14} />
                                            {pregunta.categoria}
                                        </span>
                                        {pregunta.zona && pregunta.zona !== 'No especificada' && (
                                            <span className="meta-item">
                                                <MapPin size={14} />
                                                {pregunta.zona}
                                            </span>
                                        )}
                                        <span className={`status ${pregunta.estado}`}>
                                            {pregunta.estado === 'pendiente' ? 'Abierta' : 
                                             pregunta.estado === 'respondida' ? 'Respondida' : 
                                             pregunta.estado === 'cerrada' ? 'Cerrada' : pregunta.estado}
                                        </span>
                                    </div>

                                    <div className="question-responses">
                                        <h4>
                                            <MessageSquare size={16} />
                                            Respuestas ({pregunta.respuestas.length})
                                        </h4>
                                        
                                        {pregunta.respuestas.length > 0 ? (
                                            <div className="responses-list">
                                                {pregunta.respuestas.map((respuesta) => (
                                                    <div key={respuesta.id} className="response-item">
                                                        <div className="response-header">
                                                            <span className="response-author">
                                                                {respuesta.colaborador}
                                                            </span>
                                                            <span className="response-date">
                                                                {respuesta.fecha}
                                                            </span>
                                                        </div>
                                                        <p className="response-content">{respuesta.contenido}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-responses">
                                                <AlertCircle size={24} />
                                                <p>Esta pregunta no recibió respuestas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default HistoryPage;
