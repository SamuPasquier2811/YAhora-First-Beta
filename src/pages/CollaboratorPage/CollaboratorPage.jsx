import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LogOut, User, Users, Shield, History, ChevronDown, MessageSquare, Clock, Loader2, MapPin, UserCog } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';
import NotificationComponent from '../../components/common/Notification/NotificationComponent';
import './CollaboratorPage.css';

function CollaboratorPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('pendientes');
  const [preguntasPendientes, setPreguntasPendientes] = useState([]);
  const [misRespuestas, setMisRespuestas] = useState([]);
  const [respuestasLocales, setRespuestasLocales] = useState({});
  const [respondiendoId, setRespondiendoId] = useState(null);
  const [respuestasDetalladas, setRespuestasDetalladas] = useState({});
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false); // Para controlar el estado de envío
  const [filtroZona, setFiltroZona] = useState('todas');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const { showNotification, removeNotification, getNotifications } = useNotification();
  const notifications = getNotifications();

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
    fetchUserData();
    fetchPreguntasPendientes();
    fetchMisRespuestas();
    fetchZonasYCategorias(); 
    
    const channel = supabase
      .channel('preguntas-realtime')
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public', 
          table: 'preguntas' 
        }, 
        () => {
          fetchPreguntasPendientes();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'respuestas'
        },
        () => {
          fetchPreguntasPendientes();
          fetchMisRespuestas();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  //  Recargar preguntas cuando cambien los filtros
  useEffect(() => {
    if (activeTab === 'pendientes') {
      fetchPreguntasPendientes();
    }
  }, [filtroZona, filtroCategoria, activeTab]);

  // Función mejorada para problemas de teclado (sin scroll automático)
  useEffect(() => {
      const handleFocus = (e) => {
          // Solo prevenir comportamiento no deseado, sin scroll
          if (e.target.tagName === 'TEXTAREA') {
              // Pequeño delay para estabilizar
              setTimeout(() => {
                  e.target.focus();
              }, 10);
          }
      };

      document.addEventListener('focusin', handleFocus);

      return () => {
          document.removeEventListener('focusin', handleFocus);
      };
  }, []);

  const fetchZonasYCategorias = async () => {
    try {
      // Obtener zonas disponibles
      const { data: zonas, error: errorZonas } = await supabase
        .from('zonas_la_paz')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      
      if (!errorZonas && zonas) {
        setZonasDisponibles(zonas);
      }
      
      // Obtener categorías disponibles
      const { data: categorias, error: errorCategorias } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      
      if (!errorCategorias && categorias) {
        setCategoriasDisponibles(categorias);
      }
      
    } catch (error) {
      console.error('Error cargando zonas y categorías:', error);
    }
  };

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
        .maybeSingle();

      setUserData({
        id: user.id,
        email: user.email,
        nombre_completo: perfil?.nombre_completo || user.email.split('@')[0],
        tipo: perfil?.tipo || 'usuario',
        colaborador_pro: perfil?.colaborador_pro || false, 
        ganancias_colaborador: perfil?.ganancias_colaborador || 0.00  
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreguntasPendientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Construir query base
      let query = supabase
        .from('preguntas')
        .select(`
          *,
          categorias (id, nombre),
          zonas_la_paz (id, nombre),
          perfiles:usuario_id (tiempo_respuesta_minutos)
        `)
        .eq('estado', 'pendiente');
      
      // Aplicar filtro de zona si no es "todas"
      if (filtroZona !== 'todas') {
        query = query.eq('zona_id', filtroZona);
      }
      
      // Aplicar filtro de categoría si no es "todas"
      if (filtroCategoria !== 'todas') {
        query = query.eq('categoria_id', filtroCategoria);
      }
      
      // Ordenar y ejecutar
      const { data, error } = await query
        .order('creada_en', { ascending: true });
      
      if (error) throw error;
      
      const ahora = new Date();
      const preguntasFiltradas = (data || []).filter(pregunta => {
        const creadaEn = new Date(pregunta.creada_en + 'Z');
        const minutosTranscurridos = (ahora - creadaEn) / (1000 * 60);
        
        const tiempoLimiteUsuario = pregunta.perfiles?.tiempo_respuesta_minutos || 7;
        return minutosTranscurridos < tiempoLimiteUsuario;
      });
      
      setPreguntasPendientes(preguntasFiltradas);
      
      // Cargar respuestas detalladas para TODAS las preguntas
      for (const pregunta of preguntasFiltradas) {
        await fetchRespuestasPregunta(pregunta.id);
      }
      
    } catch (error) {
      console.error('Error cargando preguntas:', error);
    }
  };

    // Función para cargar respuestas detalladas de una pregunta
  const fetchRespuestasPregunta = async (preguntaId) => {
    try {
      const { data, error } = await supabase
        .from('respuestas')
        .select(`
          *,
          perfiles!inner (
            nombre_usuario,
            email,
            colaborador_pro
          )
        `)
        .eq('pregunta_id', preguntaId)
        .order('creada_en', { ascending: true });
      
      if (error) throw error;

      // Procesar los datos del JOIN
      const respuestasProcesadas = (data || []).map(item => ({
        ...item,
        colaborador: item.perfiles ? {
          nombre_usuario: item.perfiles.nombre_usuario,
          email: item.perfiles.email,
          colaborador_pro: item.perfiles.colaborador_pro || false
        } : null
      }));
      
      // console.log('Respuestas cargadas para pregunta', preguntaId, ':', respuestasProcesadas);
      
      setRespuestasDetalladas(prev => ({
        ...prev,
        [preguntaId]: respuestasProcesadas
      }));
    } catch (error) {
      console.error('Error cargando respuestas detalladas:', error);
    }
  };

  const fetchMisRespuestas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('respuestas')
        .select(`
          *,
          preguntas (
            contenido,
            categorias (nombre)
          )
        `)
        .eq('colaborador_id', user.id)
        .order('creada_en', { ascending: false });
      
      if (error) throw error;
      setMisRespuestas(data || []);
    } catch (error) {
      console.error('Error cargando respuestas:', error);
    }
  };

  const handleEnviarRespuesta = async (preguntaId, respuestaTexto) => {
    if (!respuestaTexto.trim() || enviandoRespuesta) return;
    
    try {
      // VALIDACIÓN 1: Verificar si aún hay menos de 5 respuestas (protección extra)
      const { count: numRespuestasActuales, error: countError } = await supabase
        .from('respuestas')
        .select('*', { count: 'exact', head: true })
        .eq('pregunta_id', preguntaId);
      
      if (!countError && numRespuestasActuales >= 5) {
        showNotification('error', 'Esta pregunta ya alcanzó el máximo de 5 respuestas.');
        setEnviandoRespuesta(false);
        // Limpiar respuesta local si estaba escribiendo
        setRespuestasLocales(prev => ({
          ...prev,
          [preguntaId]: ''
        }));
        setRespondiendoId(null);
        return;
      }
      
      setEnviandoRespuesta(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // VALIDACIÓN 2: Verificar si ya respondió esta pregunta
      const yaRespondio = misRespuestas.some(resp => 
        resp.pregunta_id === preguntaId && resp.colaborador_id === user.id
      );
      
      if (yaRespondio) {
        // Usar notificación en lugar de alert
        showNotification('info', 'Ya respondiste esta pregunta.');
        setEnviandoRespuesta(false);
        return;
      }

      // Calcular monto según si es pro o no
      const montoRespuesta = userData?.colaborador_pro ? 0.40 : 0.30;

      // 1. Insertar respuesta (CON OTRA VALIDACIÓN)
      const { data: respuestaInsertada, error: respuestaError } = await supabase
        .from('respuestas')
        .insert({
          pregunta_id: preguntaId,
          colaborador_id: user.id,
          contenido: respuestaTexto.trim(),
          es_aceptada: false
        })
        .select()
        .single(); // Asegurar que solo inserta una
      
      if (respuestaError) {
        // Si hay error de restricción de unicidad o algo similar
        if (respuestaError.code === '23505') {
          showNotification('error', 'Ya habías respondido esta pregunta.');
        } else {
          throw respuestaError;
        }
        setEnviandoRespuesta(false);
        return;
      }

      // 2. Verificar nuevamente el número de respuestas después de insertar
      const { count: nuevoNumRespuestas } = await supabase
        .from('respuestas')
        .select('*', { count: 'exact', head: true })
        .eq('pregunta_id', preguntaId);
      
      // Solo actualizar contador si aún hay menos de 5
      if (nuevoNumRespuestas <= 5) {
        const { error: preguntaError } = await supabase.rpc('increment_num_respuestas', {
          pregunta_id_param: preguntaId
        });
        
        if (preguntaError) console.error('Error actualizando contador:', preguntaError);
      }

      // 5. Actualizar estadísticas
      await fetchMisRespuestas();
      await fetchRespuestasPregunta(preguntaId);
      
      // 6. Limpiar respuesta local
      setRespuestasLocales(prev => ({
        ...prev,
        [preguntaId]: ''
      }));
      setRespondiendoId(null);
      
      // 7. Mostrar notificación según si alcanzó el límite
      if (nuevoNumRespuestas >= 5) {
        showNotification('success', `¡Respuesta enviada exitosamente! Esta pregunta ya alcanzó el máximo de 5 respuestas.`);
      } else {
        showNotification('success', `¡Respuesta enviada exitosamente!`);
      }
      
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      showNotification('error', 'Error al enviar respuesta. Verifica que tengas permisos de colaborador.');
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  // Componente para cada pregunta
  const QuestionCard = ({ pregunta }) => {
    // Obtener el tiempo_respuesta_minutos del usuario que hizo la pregunta
    const tiempoRespuestaUsuario = pregunta.perfiles?.tiempo_respuesta_minutos || 7;
    
    const [tiempoRestante, setTiempoRestante] = useState(() => {
      const fechaCreacion = new Date(pregunta.creada_en + 'Z');
      const ahora = new Date();
      const diferenciaMs = ahora - fechaCreacion;
      return Math.max(0, (tiempoRespuestaUsuario * 60) - Math.floor(diferenciaMs / 1000));
    });

    const [yaRespondio, setYaRespondio] = useState(() => {
      if (!userData) return false;
      const respuestas = respuestasDetalladas[pregunta.id] || [];
      return respuestas.some(resp => resp.colaborador_id === userData.id);
    });

    const textareaRef = useRef(null);
    const timerRef = useRef(null);

    // Respuesta local para esta pregunta
    const respuestaLocal = respuestasLocales[pregunta.id] || '';
    // Respuestas de esta pregunta
    const respuestasPregunta = respuestasDetalladas[pregunta.id] || [];

    // Inicializar timer solo una vez
    useEffect(() => {
      if (pregunta.estado !== 'pendiente') return;

      // Solo iniciar timer si hay tiempo restante
      if (tiempoRestante > 0 && !timerRef.current) {
        timerRef.current = setInterval(() => {
          setTiempoRestante(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, []);

    // Enfocar textarea cuando se activa
    useEffect(() => {
      if (respondiendoId === pregunta.id && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = respuestaLocal.length;
      }
    }, [respondiendoId, pregunta.id]);

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRespuestaChange = useCallback((e) => {
      const value = e.target.value;
      setRespuestasLocales(prev => ({
        ...prev,
        [pregunta.id]: value
      }));
    }, [pregunta.id]);

    const handleCancelar = useCallback(() => {
      setRespuestasLocales(prev => ({
        ...prev,
        [pregunta.id]: ''
      }));
      setRespondiendoId(null);
    }, [pregunta.id]);

    const handleSubmit = useCallback(() => {
      handleEnviarRespuesta(pregunta.id, respuestaLocal);
    }, [pregunta.id, respuestaLocal]);

    return (
      <div className="collab-question-card">
        <div className="collab-question-header">
          <h4>{truncateText(pregunta.contenido, 120)}</h4>
          
          {/* MOSTRAR IMAGEN SI EXISTE */}
          {pregunta.imagen_url && (
            <div className="collab-question-image-container">
              <img 
                src={pregunta.imagen_url} 
                alt="Imagen de la pregunta" 
                className="collab-question-image"
                onClick={() => window.open(pregunta.imagen_url, '_blank')}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const container = e.target.parentElement;
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'collab-image-error';
                  errorDiv.innerHTML = '<span>❌ Error cargando imagen</span>';
                  container.appendChild(errorDiv);
                }}
              />
              <div className="image-hint">Click para ampliar</div>
            </div>
          )}
          
          <div className="collab-question-meta">
            <span className="meta-tag">
              <MessageSquare size={12} />
              {pregunta.categorias?.nombre || 'General'}
            </span>
            <span className="meta-tag">
              <Clock size={12} />
              {formatTime(tiempoRestante)} restantes
            </span>
            {/* Mostrar zona si existe */}
            {pregunta.zonas_la_paz?.nombre && pregunta.zonas_la_paz.nombre !== 'No especificada' && (
              <span className="meta-tag">
                <MapPin size={12} />
                {pregunta.zonas_la_paz.nombre}
              </span>
            )}
          </div>
        </div>
        
        <div className="collab-question-info">
          <p className="respuestas-count">Respuestas actuales: {respuestasPregunta.length} / 5</p>
          
          {/* Mostrar respuestas existentes */}
          {respuestasPregunta.length > 0 && (
            <div className="collab-existing-answers">
              <div className="answers-header">
                <MessageSquare size={14} />
                <span>{respuestasPregunta.length} respuesta(s):</span>
              </div>
              <div className="answers-list">
                {respuestasPregunta.map((respuesta, index) => (
                  <div key={respuesta.id || index} className="collab-answer-item">
                    <div className="collab-answer-header">
                      <span className="collab-answer-author">
                        {respuesta.colaborador?.nombre_usuario || 
                        respuesta.colaborador?.email?.split('@')[0] || 
                        'Colaborador'}
                        {respuesta.colaborador_id === userData?.id && ' (Tú)'}
                        
                        {/* Mostrar badge PRO si es colaborador pro */}
                        {respuesta.colaborador?.colaborador_pro && (
                          <span className="collab-pro-badge">
                            <Shield size={10} />
                            Pro
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="collab-answer-content">
                      {truncateText(respuesta.contenido, 150)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {yaRespondio ? (
          <div className="already-responded">
            <MessageSquare size={16} />
            <span>Ya respondiste esta pregunta</span>
          </div>
        ) : tiempoRestante <= 0 ? (
          <div className="time-expired">
            <Clock size={16} />
            <span>Tiempo agotado</span>
          </div>
        ) : respuestasPregunta.length >= 5 ? (  
          <div className="max-respuestas">
            <MessageSquare size={16} />
            <span>❌ Máximo de respuestas alcanzado (5/5)</span>
            <p className="max-respuestas-note">
              Esta pregunta ya recibió el máximo de respuestas permitidas. 
              Se cerrará automáticamente cuando termine el tiempo.
            </p>
          </div>
        ) : respondiendoId === pregunta.id ? (
          <div className="answer-form">
            <textarea
              ref={textareaRef}
              value={respuestaLocal}
              onChange={handleRespuestaChange}
              placeholder="Escribe tu respuesta aquí..."
              rows={3}
              maxLength={500}
              onFocus={(e) => {
                // Forzar redibujado para prevenir bugs
                e.target.style.transform = 'translateZ(0)';
                e.target.style.webkitTransform = 'translateZ(0)';
              }}
              onTouchStart={(e) => {
                // Prevenir eventos táctiles que cierran el teclado
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                // Permitir scroll dentro del textarea
                e.stopPropagation();
              }}
              // Configurar el teclado correctamente
              inputMode="text"
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="true"
              // Estilos inline para prevenir bugs
              style={{
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            />
            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelar}
                disabled={enviandoRespuesta}
              >
                Cancelar
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={!respuestaLocal.trim() || enviandoRespuesta || respuestasPregunta.length >= 5}
              >
                {enviandoRespuesta ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Enviando...</span>
                  </>
                ) : respuestasPregunta.length >= 4 ? (
                  `Enviar (Última oportunidad)`
                ) : (
                  `Enviar Respuesta`
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-responder"
            onClick={() => setRespondiendoId(pregunta.id)}
            disabled={respuestasPregunta.length >= 5}
          >
            <MessageSquare size={16} />
            {respuestasPregunta.length >= 5 ? (
              "❌ Máximo de respuestas alcanzado"
            ) : respuestasPregunta.length >= 4 ? (
              `Responder (Última oportunidad)`
            ) : (
              `Responder`
            )}
          </button>
        )}
      </div>
    );
  };

  const handleSwitchToUser = () => navigate('/dashboard');
  const handleSwitchToAdmin = () => navigate('/admin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="collaborator-page">
      {notifications.map((notification) => (
        <NotificationComponent
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
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
            <div className="profile-avatar collaborator">
              <Users size={20} />
            </div>
            <ChevronDown size={16} />
          </button>
          
          {showMenu && (
            <div className="profile-dropdown-menu">
              <div className="menu-user-info">
                <p className="menu-user-name">{userData?.nombre_completo}</p>
                <p className="menu-user-email">{userData?.email}</p>
                {userData?.tipo === 'colaborador' && (
                  <p className="menu-user-role collaborator-badge">
                    <Users size={14} /> Colaborador
                  </p>
                )}
                {userData?.tipo === 'admin' && (
                  <p className="menu-user-role admin-badge">
                    <Shield size={14} /> Administrador
                  </p>
                )}
              </div>
              
              <div className="menu-divider"></div>
              
              <button className="menu-item" onClick={() => navigate('/history')}>
                  <History size={16} />
                  <span>Historial</span>
              </button>
              
              <button className="menu-item" onClick={() => navigate('/profile')}>
                  <UserCog size={16} />
                  <span>Mis Datos</span>
              </button>
              
              <button className="menu-item" onClick={handleSwitchToUser}>
                <User size={16} />
                <span>Modo Usuario</span>
              </button>
              
              {userData?.tipo === 'admin' && (
                <button className="menu-item" onClick={handleSwitchToAdmin}>
                  <Shield size={16} />
                  <span>Modo Admin</span>
                </button>
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

      <main className="collaborator-main">
        <div className="collaborator-welcome">
          <div className="role-icon">
            <Users size={48} />
          </div>
          <h1>Panel de Colaborador</h1>
          <p>Responde preguntas de usuarios y gana cuando los usuarios marquen tus respuestas como útiles</p>
          {userData?.colaborador_pro && (
              <div className="pro-badge-header">
                  <Shield size={20} className="pro-icon" />
                  <span>Usted es un Colaborador Pro</span>
              </div>
          )}
        </div>
        
        <div className="collaborator-stats">
          <div className="stat-item">
            <Users size={24} />
            <div className="stat-info">
              <h3>Respuestas dadas</h3>
              <p className="stat-number">{misRespuestas.length}</p>
              <p className="stat-subtext">Total de preguntas respondidas</p>
            </div>
          </div>
          
          <div className="stat-item">
              <Users size={24} />
              <div className="stat-info">
                  <h3>Ganancias totales</h3>
                  <p className="stat-money">Bs. {userData?.ganancias_colaborador?.toFixed(2) || '0.00'}</p>
                  <p className="stat-subtext">
                      {userData?.colaborador_pro ? '0.40 Bs por respuesta (PRO)' : '0.30 Bs por respuesta'}
                  </p>
              </div>
          </div>
        </div>
        
        <div className="tabs-container">
          <div className="tabs-header">
            <button 
              className={`tab-button ${activeTab === 'pendientes' ? 'active' : ''}`}
              onClick={() => setActiveTab('pendientes')}
            >
              <MessageSquare size={18} />
              <span>Preguntas pendientes ({preguntasPendientes.length})</span>
            </button>
            
            <button 
              className={`tab-button ${activeTab === 'mis-respuestas' ? 'active' : ''}`}
              onClick={() => setActiveTab('mis-respuestas')}
            >
              <Users size={18} />
              <span>Mis respuestas ({misRespuestas.length})</span>
            </button>
          </div>
          
          <div className="tabs-content">
            {activeTab === 'pendientes' ? (
              <div className="tab-pane">
                {/* SECCIÓN DE FILTROS */}
                <div className="filtros-container">
                  <div className="filtros-grid">
                    {/* FILTRO POR ZONA */}
                    <div className="filtro-item">
                      <label htmlFor="filtro-zona">
                        <MapPin size={16} />
                        <span>Filtrar por Zona</span>
                      </label>
                      <select
                        id="filtro-zona"
                        className="filtro-select"
                        value={filtroZona}
                        onChange={(e) => setFiltroZona(e.target.value)}
                      >
                        <option value="todas">Todas las zonas</option>
                        {zonasDisponibles.map((zona) => (
                          <option key={zona.id} value={zona.id}>
                            {zona.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* FILTRO POR CATEGORÍA */}
                    <div className="filtro-item">
                      <label htmlFor="filtro-categoria">
                        <MessageSquare size={16} />
                        <span>Filtrar por Categoría</span>
                      </label>
                      <select
                        id="filtro-categoria"
                        className="filtro-select"
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                      >
                        <option value="todas">Todas las categorías</option>
                        {categoriasDisponibles.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* CONTADOR DE RESULTADOS */}
                    <div className="filtro-item resultados">
                      <div className="resultados-info">
                        <span className="resultados-numero">
                          {preguntasPendientes.length}
                        </span>
                        <span className="resultados-texto">
                          {preguntasPendientes.length === 1 ? 'pregunta encontrada' : 'preguntas encontradas'}
                        </span>
                      </div>
                      <button 
                        className="btn-limpiar-filtros"
                        onClick={() => {
                          setFiltroZona('todas');
                          setFiltroCategoria('todas');
                        }}
                        disabled={filtroZona === 'todas' && filtroCategoria === 'todas'}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                </div>
                
                {preguntasPendientes.length === 0 ? (
                  <div className="empty-state">
                    <MessageSquare size={48} />
                    <h3>No hay preguntas pendientes</h3>
                    {filtroZona !== 'todas' || filtroCategoria !== 'todas' ? (
                      <>
                        <p>No se encontraron preguntas con los filtros aplicados.</p>
                        <p className="empty-note">Prueba con otros filtros o limpia los filtros para ver todas las preguntas.</p>
                      </>
                    ) : (
                      <>
                        <p>Cuando los usuarios hagan preguntas, aparecerán aquí para que puedas responderlas.</p>
                        <p className="empty-note">Recuerda: Por cada respuesta marcada como útil ganas {userData?.colaborador_pro ? '0.40' : '0.30'} Bs</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="questions-grid">
                    {preguntasPendientes.map((pregunta) => (
                      <QuestionCard key={pregunta.id} pregunta={pregunta} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="tab-pane">
                {misRespuestas.length === 0 ? (
                  <div className="empty-state">
                    <Users size={48} />
                    <h3>No has respondido preguntas aún</h3>
                    <p>Cuando respondas preguntas, tu historial aparecerá aquí.</p>
                    <p className="empty-note">Cada respuesta te genera {userData?.colaborador_pro ? '0.40' : '0.30'} Bs en ganancias</p>
                  </div>
                ) : (
                  <div className="answers-history">
                    {misRespuestas.map((respuesta) => (
                      <div key={respuesta.id} className="history-item">
                        <div className="history-question">
                          <strong>Pregunta:</strong> {truncateText(respuesta.preguntas?.contenido || 'No disponible', 100)}
                        </div>
                        <div className="history-answer">
                          <strong>Tu respuesta:</strong> {truncateText(respuesta.contenido, 150)}
                        </div>
                        <div className="history-meta">
                          <span className="meta-date">
                            {new Date(respuesta.creada_en).toLocaleDateString()}
                          </span>
                          {respuesta.es_aceptada && (
                            <span className="meta-status accepted">
                              ✓ Aceptada
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export default CollaboratorPage;
