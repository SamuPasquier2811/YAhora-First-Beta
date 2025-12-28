import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, User, History, Users, Shield, ChevronDown, Save, Edit, X, Mail, Package, Clock, Image, Shield as ShieldIcon, PanelTop } from 'lucide-react';
import './UserProfilePage.css';

function UserProfilePage() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUserData();
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

            const userDataObj = {
                id: user.id,
                email: user.email,
                nombre_completo: perfil?.nombre_completo || user.email.split('@')[0],
                tipo: perfil?.tipo || 'usuario',
                preguntas_disponibles: perfil?.preguntas_disponibles || 0,
                plan_actual: perfil?.plan_actual || 'gratis',
                tiempo_respuesta_minutos: perfil?.tiempo_respuesta_minutos || 7,
                imagenes_permitidas: perfil?.imagenes_permitidas || false,
                colaborador_pro: perfil?.colaborador_pro || false,
                creado_en: perfil?.creado_en || new Date().toISOString()
            };

            setUserData(userDataObj);
            setNombreCompleto(userDataObj.nombre_completo);
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveName = async () => {
        if (!userData || !nombreCompleto.trim()) return;
        
        try {
            setSaving(true);
            
            const { error } = await supabase
                .from('perfiles')
                .update({ 
                    nombre_completo: nombreCompleto.trim()
                })
                .eq('id', userData.id);

            if (error) throw error;

            // Actualizar estado local
            setUserData(prev => ({
                ...prev,
                nombre_completo: nombreCompleto.trim()
            }));
            
            setEditMode(false);
        } catch (error) {
            console.error('Error actualizando nombre:', error);
            alert('Error al actualizar el nombre');
        } finally {
            setSaving(false);
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

    const canEditName = userData?.tipo === 'colaborador' || userData?.tipo === 'admin';

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className="profile-page">
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
                                <PanelTop size={16} />
                                <span>Panel Principal</span>
                            </button>
                            
                            <button className="menu-item" onClick={() => navigate('/history')}>
                                <History size={16} />
                                <span>Historial</span>
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

            <main className="profile-main">
                <div className="profile-header">
                    <div className="profile-title-section">
                        <User size={48} className="profile-icon" />
                        <div>
                            <h1>Mis Datos</h1>
                            <p className="profile-subtitle">
                                Información de tu cuenta y configuración personal
                            </p>
                        </div>
                    </div>
                </div>

                <div className="profile-content">
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <h2>Información Personal</h2>
                            {canEditName && !editMode && (
                                <button 
                                    className="btn-edit-nombre"
                                    onClick={() => setEditMode(true)}
                                >
                                    <Edit size={16} />
                                    Editar Nombre
                                </button>
                            )}
                        </div>

                        <div className="profile-info-grid">
                            {/* Nombre Completo */}
                            <div className="info-item">
                                <div className="info-label">
                                    <User size={16} />
                                    <span>Nombre Completo</span>
                                </div>
                                {editMode ? (
                                    <div className="edit-name-container">
                                        <input
                                            type="text"
                                            value={nombreCompleto}
                                            onChange={(e) => setNombreCompleto(e.target.value)}
                                            className="name-input"
                                            placeholder="Ingresa tu nombre completo"
                                        />
                                        <div className="edit-actions">
                                            <button 
                                                className="btn-cancel"
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setNombreCompleto(userData.nombre_completo);
                                                }}
                                                disabled={saving}
                                            >
                                                <X size={16} />
                                                Cancelar
                                            </button>
                                            <button 
                                                className="btn-save"
                                                onClick={handleSaveName}
                                                disabled={saving || !nombreCompleto.trim()}
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="spinner-small"></div>
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={16} />
                                                        Guardar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="info-value">{userData?.nombre_completo}</div>
                                )}
                            </div>

                            {/* Email */}
                            <div className="info-item">
                                <div className="info-label">
                                    <Mail size={16} />
                                    <span>Email</span>
                                </div>
                                <div className="info-value">{userData?.email}</div>
                            </div>

                            {/* Tipo de Usuario */}
                            <div className="info-item">
                                <div className="info-label">
                                    <ShieldIcon size={16} />
                                    <span>Tipo de Usuario</span>
                                </div>
                                <div className="info-value">
                                    <span className={`user-type-badge ${userData?.tipo}`}>
                                        {userData?.tipo === 'usuario' ? 'Usuario' :
                                         userData?.tipo === 'colaborador' ? 'Colaborador' :
                                         userData?.tipo === 'admin' ? 'Administrador' : userData?.tipo}
                                    </span>
                                </div>
                            </div>

                            {/* Preguntas Disponibles */}
                            <div className="info-item">
                                <div className="info-label">
                                    <Package size={16} />
                                    <span>Preguntas Disponibles</span>
                                </div>
                                <div className="info-value">
                                    <span className="questions-count">
                                        {userData?.preguntas_disponibles}
                                    </span>
                                </div>
                            </div>

                            {/* Tiempo de Respuesta */}
                            <div className="info-item">
                                <div className="info-label">
                                    <Clock size={16} />
                                    <span>Tiempo de Respuesta</span>
                                </div>
                                <div className="info-value">
                                    {userData?.tiempo_respuesta_minutos} minutos
                                </div>
                            </div>

                            {/* Imágenes Permitidas */}
                            <div className="info-item">
                                <div className="info-label">
                                    <Image size={16} />
                                    <span>Subir Imágenes</span>
                                </div>
                                <div className="info-value">
                                    {userData?.imagenes_permitidas ? (
                                        <span className="badge enabled">Habilitado</span>
                                    ) : (
                                        <span className="badge disabled">No habilitado</span>
                                    )}
                                </div>
                            </div>

                            {/* Fecha de Creación */}
                            <div className="info-item">
                                <div className="info-label">
                                    <Clock size={16} />
                                    <span>Cuenta creada el</span>
                                </div>
                                <div className="info-value">
                                    {new Date(userData?.creado_en).toLocaleDateString('es-ES')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button 
                            className="btn-secondary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Volver al Panel Principal
                        </button>
                        
                        <button 
                            className="btn-primary"
                            onClick={() => navigate('/history')}
                        >
                            Ver Historial
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default UserProfilePage;
