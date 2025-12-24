import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { 
  LogOut, User, Users, Shield, ChevronDown, BarChart, MessageSquare, 
  CreditCard, History, ChevronRight, ChevronDown as ChevronDownIcon,
  Edit, Save, X, Eye, CheckCircle, XCircle, Loader2, CircleX,
  Search
} from 'lucide-react';
import NotificationComponent from '../../components/common/Notification/NotificationComponent';
import { useNotification } from '../../hooks/useNotification';
import './AdminPage.css';

function AdminPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalColaboradores: 0,
    totalPreguntas: 0,
    totalRespuestas: 0
  });
  const [usuarios, setUsuarios] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [preguntasRespuestas, setPreguntasRespuestas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  
  // Estados para filtros
  const [filtroUsuarios, setFiltroUsuarios] = useState('');
  const [filtroColaboradores, setFiltroColaboradores] = useState('');
  const [filtroPreguntasUsuario, setFiltroPreguntasUsuario] = useState('');
  const [filtroPreguntasColaborador, setFiltroPreguntasColaborador] = useState('');
  const [filtroTransacciones, setFiltroTransacciones] = useState('');

  const { showNotification, removeNotification, getNotifications } = useNotification();
  const notifications = getNotifications();

  // Cerrar menú al hacer clic fuera
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchStats();
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
        .maybeSingle();

      setUserData({
        email: user.email,
        nombre_completo: perfil?.nombre_completo || user.email.split('@')[0],
        tipo: perfil?.tipo || 'usuario'
      });
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error cargando datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Usamos supabaseAdmin para TODAS las estadísticas
      // 1. Total usuarios (todos los perfiles)
      const { count: totalUsuarios } = await supabaseAdmin
        .from('perfiles')
        .select('*', { count: 'exact', head: true });

      // 2. Total colaboradores (colaborador o admin)
      const { count: totalColaboradores } = await supabaseAdmin
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .in('tipo', ['colaborador', 'admin']);

      // 3. Total preguntas
      const { count: totalPreguntas } = await supabaseAdmin
        .from('preguntas')
        .select('*', { count: 'exact', head: true });

      // 4. Total respuestas
      const { count: totalRespuestas } = await supabaseAdmin
        .from('respuestas')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsuarios: totalUsuarios || 0,
        totalColaboradores: totalColaboradores || 0,
        totalPreguntas: totalPreguntas || 0,
        totalRespuestas: totalRespuestas || 0
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      showNotification('error', 'Error cargando estadísticas');
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabaseAdmin  // <-- CAMBIA supabase por supabaseAdmin
        .from('perfiles')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      showNotification('error', 'Error cargando usuarios');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabaseAdmin  // <-- CAMBIA supabase por supabaseAdmin
        .from('perfiles')
        .select('*')
        .in('tipo', ['colaborador', 'admin'])
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Error cargando colaboradores:', error);
      showNotification('error', 'Error cargando colaboradores');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPreguntasRespuestas = async () => {
    try {
      setLoadingData(true);
      const { data: preguntas, error: errorPreguntas } = await supabaseAdmin  // <-- CAMBIA supabase por supabaseAdmin
        .from('preguntas')
        .select(`
          *,
          categorias (nombre),
          zonas_la_paz (nombre),
          usuario:perfiles (nombre_completo, email),
          respuestas (
            *,
            colaborador:perfiles (nombre_completo, email)
          )
        `)
        .order('creada_en', { ascending: false });

      if (errorPreguntas) throw errorPreguntas;
      setPreguntasRespuestas(preguntas || []);
    } catch (error) {
      console.error('Error cargando preguntas y respuestas:', error);
      showNotification('error', 'Error cargando preguntas y respuestas');
    } finally {
      setLoadingData(false);
    }
  };

  // Versión mejorada que maneja múltiples archivos por usuario
  const fetchTransacciones = async () => {
    try {
      setLoadingData(true);
      const { data: transaccionesData, error } = await supabaseAdmin
        .from('transacciones_pagos')
        .select(`
          *,
          usuario:perfiles (nombre_completo, email, id)
        `)
        .order('creado_en', { ascending: false });

      if (error) throw error;

      // Obtener TODOS los archivos del bucket comprobantes
      const { data: allFiles, error: listError } = await supabase.storage
        .from('comprobantes')
        .list('');
      
      if (listError) {
        console.error('Error listando archivos:', listError);
        showNotification('warning', 'No se pudieron cargar los comprobantes');
      }

      // console.log('=== DEBUG: Archivos encontrados en storage ===');
      // if (allFiles) {
      //   allFiles.forEach((file, i) => {
      //     console.log(`${i + 1}. ${file.name}`);
      //   });
      // }

      // console.log('=== DEBUG: Transacciones cargadas ===');
      // if (transaccionesData) {
      //   transaccionesData.forEach((t, i) => {
      //     console.log(`${i + 1}. Transacción ID: ${t.id}, Usuario ID en tabla: ${t.usuario_id}, Perfil ID: ${t.usuario?.id}`);
      //   });
      // }

      // Para cada transacción, buscar su archivo correspondiente
      const transaccionesConComprobantes = await Promise.all(
        (transaccionesData || []).map(async (transaccion) => {
          // console.log(`\nBuscando comprobante para transacción: ${transaccion.id}`);
          // console.log(`- usuario_id en transacciones_pagos: ${transaccion.usuario_id}`);
          // console.log(`- id del perfil del usuario: ${transaccion.usuario?.id}`);
          
          if (!transaccion.comprobante_subido) {
            // console.log(`- comprobante_subido es false`);
            return {
              ...transaccion,
              tiene_comprobante: false,
              comprobante_url: null
            };
          }

          try {
            // IMPORTANTE: El archivo se guarda con el ID del PERFIL del usuario (userData.id en PurchaseModal)
            // Necesitamos usar el ID del perfil, no el usuario_id de la tabla transacciones_pagos
            const perfilId = transaccion.usuario?.id;
            
            if (!perfilId) {
              // console.log(`⚠️ No se encontró el perfil del usuario`);
              return {
                ...transaccion,
                tiene_comprobante: false,
                comprobante_url: null
              };
            }

            // console.log(`🔍 Buscando archivo que comience con: ${perfilId}`);
            
            // Buscar archivo que COMIENCE con el perfilId
            let fileName = null;
            
            if (allFiles && allFiles.length > 0) {
              // Formato: perfilId_timestamp.extension
              const matchingFile = allFiles.find(file => 
                file.name.startsWith(perfilId)
              );
              
              if (matchingFile) {
                fileName = matchingFile.name;
                // console.log(`✅ Archivo encontrado: ${fileName}`);
              } else {
                // console.log(`❌ No se encontró archivo que comience con ${perfilId}`);
                
                // Mostrar qué archivos sí existen
                // console.log('Archivos disponibles:', allFiles.map(f => f.name));
                
                // También buscar por usuario_id como fallback
                const fallbackFile = allFiles.find(file => 
                  file.name.startsWith(transaccion.usuario_id)
                );
                
                if (fallbackFile) {
                  fileName = fallbackFile.name;
                  // console.log(`✅ Encontrado por usuario_id: ${fileName}`);
                }
              }
            } else {
              console.log(`No hay archivos en storage`);
            }
            
            if (fileName) {
              try {
                // Generar URL firmada
                const { data: signedUrlData, error: urlError } = await supabase.storage
                  .from('comprobantes')
                  .createSignedUrl(fileName, 60 * 60);
                
                if (urlError) {
                  console.error('Error generando URL firmada:', urlError);
                  
                  // Intentar con URL pública como fallback
                  const { data: publicUrlData } = supabase.storage
                    .from('comprobantes')
                    .getPublicUrl(fileName);
                  
                  // console.log(`📄 URL pública generada: ${publicUrlData?.publicUrl ? 'Sí' : 'No'}`);
                  
                  return {
                    ...transaccion,
                    comprobante_url: publicUrlData?.publicUrl,
                    comprobante_nombre: fileName,
                    tiene_comprobante: true,
                    comprobante_tipo: detectarTipoArchivo(fileName),
                    comprobante_extension: fileName.split('.').pop().toLowerCase()
                  };
                }
                
                // Detectar tipo de archivo
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
                const isPDF = fileExtension === 'pdf';
                
                // console.log(`✅ URL firmada generada para ${fileName}`);
                
                return {
                  ...transaccion,
                  comprobante_url: signedUrlData?.signedUrl,
                  comprobante_nombre: fileName,
                  comprobante_tipo: isImage ? 'imagen' : isPDF ? 'pdf' : 'documento',
                  comprobante_extension: fileExtension,
                  tiene_comprobante: true
                };
                
              } catch (urlError) {
                console.error(`❌ Error procesando archivo ${fileName}:`, urlError);
                return {
                  ...transaccion,
                  tiene_comprobante: false,
                  comprobante_url: null
                };
              }
            } else {
              // console.log(`📝 Comprobante subido pero archivo no encontrado. Perfil ID: ${perfilId}`);
              return {
                ...transaccion,
                tiene_comprobante: false,
                comprobante_url: null
              };
            }
            
          } catch (storageError) {
            console.error('❌ Error obteniendo comprobante:', storageError);
            return {
              ...transaccion,
              tiene_comprobante: false,
              comprobante_url: null
            };
          }
        })
      );

      // console.log('=== FINAL: Transacciones procesadas ===', transaccionesConComprobantes);
      setTransacciones(transaccionesConComprobantes || []);
      
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      showNotification('error', 'Error cargando transacciones');
    } finally {
      setLoadingData(false);
    }
  };

  // Función auxiliar para detectar tipo de archivo
  const detectarTipoArchivo = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const imagenes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const documentos = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    
    if (imagenes.includes(extension)) return 'imagen';
    if (extension === 'pdf') return 'pdf';
    if (documentos.includes(extension)) return 'documento';
    return 'archivo';
  };

  // Funciones para filtrar datos
  const usuariosFiltrados = usuarios.filter(usuario => {
    const busqueda = filtroUsuarios.toLowerCase();
    return (
      (usuario.email && usuario.email.toLowerCase().includes(busqueda)) ||
      (usuario.nombre_completo && usuario.nombre_completo.toLowerCase().includes(busqueda)) ||
      (usuario.tipo && usuario.tipo.toLowerCase().includes(busqueda))
    );
  });

  const colaboradoresFiltrados = colaboradores.filter(colaborador => {
    const busqueda = filtroColaboradores.toLowerCase();
    return (
      (colaborador.email && colaborador.email.toLowerCase().includes(busqueda)) ||
      (colaborador.nombre_completo && colaborador.nombre_completo.toLowerCase().includes(busqueda)) ||
      (colaborador.tipo && colaborador.tipo.toLowerCase().includes(busqueda))
    );
  });

  const preguntasFiltradas = preguntasRespuestas.filter(pregunta => {
    const busquedaUsuario = filtroPreguntasUsuario.toLowerCase();
    const busquedaColaborador = filtroPreguntasColaborador.toLowerCase();
    
    // Filtro por usuario
    const coincideUsuario = (
      (pregunta.usuario?.nombre_completo && 
       pregunta.usuario.nombre_completo.toLowerCase().includes(busquedaUsuario)) ||
      (pregunta.usuario?.email && 
       pregunta.usuario.email.toLowerCase().includes(busquedaUsuario))
    );
    
    // Filtro por colaborador (en respuestas)
    let coincideColaborador = true;
    if (busquedaColaborador && pregunta.respuestas && pregunta.respuestas.length > 0) {
      coincideColaborador = pregunta.respuestas.some(respuesta => 
        (respuesta.colaborador?.nombre_completo && 
         respuesta.colaborador.nombre_completo.toLowerCase().includes(busquedaColaborador)) ||
        (respuesta.colaborador?.email && 
         respuesta.colaborador.email.toLowerCase().includes(busquedaColaborador))
      );
    }
    
    return coincideUsuario && coincideColaborador;
  });

  const transaccionesFiltradas = transacciones.filter(transaccion => {
    const busqueda = filtroTransacciones.toLowerCase();
    return (
      (transaccion.usuario?.nombre_completo && 
       transaccion.usuario.nombre_completo.toLowerCase().includes(busqueda)) ||
      (transaccion.usuario?.email && 
       transaccion.usuario.email.toLowerCase().includes(busqueda)) ||
      (transaccion.estado && transaccion.estado.toLowerCase().includes(busqueda))
    );
  });

  const handleSectionToggle = async (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
      
      switch (section) {
        case 'usuarios':
          await fetchUsuarios();
          break;
        case 'colaboradores':
          await fetchColaboradores();
          break;
        case 'preguntas':
          await fetchPreguntasRespuestas();
          break;
        case 'transacciones':
          await fetchTransacciones();
          break;
      }
    }
  };

  const handleEditRow = (rowId, data) => {
    setEditingRow(rowId);
    setEditingData({ ...data });
  };

  const handleSaveEdit = async (table, id) => {
    try {
      const { error } = await supabaseAdmin
        .from(table === 'usuarios' ? 'perfiles' : table)
        .update(editingData)
        .eq('id', id);

      if (error) throw error;

      showNotification('success', 'Cambios guardados exitosamente');
      setEditingRow(null);
      setEditingData({});

      // Refrescar datos
      if (table === 'usuarios') {
        await fetchUsuarios();
      } else if (table === 'colaboradores') {
        await fetchColaboradores();
      }
    } catch (error) {
      console.error('Error guardando cambios:', error);
      showNotification('error', 'Error guardando cambios');
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingData({});
  };

  const handleUpdateEstadoTransaccion = async (transaccionId, nuevoEstado) => {
    try {
      // console.log(`Actualizando transacción ${transaccionId} a estado: ${nuevoEstado}`);
      
      // Actualizar en la base de datos
      const { error } = await supabaseAdmin
        .from('transacciones_pagos')
        .update({ 
          estado: nuevoEstado,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', transaccionId);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      // console.log(`✅ Transacción ${transaccionId} actualizada a ${nuevoEstado}`);
      showNotification('success', `Transacción ${nuevoEstado} exitosamente`);
      
      // Actualizar localmente el estado
      setTransacciones(prev => prev.map(t => 
        t.id === transaccionId ? { 
          ...t, 
          estado: nuevoEstado,
          actualizado_en: new Date().toISOString()
        } : t
      ));

    } catch (error) {
      console.error('Error completo actualizando transacción:', error);
      showNotification('error', 'Error actualizando transacción');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSwitchToUser = () => navigate('/dashboard');
  const handleSwitchToCollaborator = () => navigate('/collaborator');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Notificaciones */}
      {notifications.map((notification) => (
        <NotificationComponent
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      {/* Header */}
      <header className="admin-header">
        <div className="logo" onClick={() => navigate('/home')}>
          YAhora?
        </div>
        
        <div className="profile-menu-wrapper" ref={menuRef}>
          <button 
            className="profile-menu-toggle"
            onClick={() => setShowMenu(!showMenu)}
          >
            <div className="profile-avatar admin">
              <Shield size={20} />
            </div>
            <ChevronDown size={16} />
          </button>
          
          {showMenu && (
            <div className="profile-dropdown-menu">
              <div className="menu-user-info">
                <p className="menu-user-name">{userData?.nombre_completo}</p>
                <p className="menu-user-email">{userData?.email}</p>
                <p className="menu-user-role admin-badge">
                  <Shield size={14} /> Administrador
                </p>
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
              
              <button className="menu-item" onClick={handleSwitchToUser}>
                <User size={16} />
                <span>Cambiar a Usuario</span>
              </button>
              
              <button className="menu-item" onClick={handleSwitchToCollaborator}>
                <Users size={16} />
                <span>Cambiar a Colaborador</span>
              </button>
              
              <div className="menu-divider"></div>
              
              <button className="menu-item logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Salir</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="admin-main">
        <div className="admin-welcome">
          <div className="role-icon">
            <Shield size={48} />
          </div>
          <h1>Panel de Administrador</h1>
          <p>Gestiona usuarios, colaboradores, preguntas y transacciones del sistema.</p>
        </div>
        
        {/* Estadísticas */}
        <div className="admin-stats">
          <div className="stat-card">
            <User size={32} />
            <div className="card-info">
              <h3>Usuarios Registrados</h3>
              <p className="card-number">{stats.totalUsuarios}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <Users size={32} />
            <div className="card-info">
              <h3>Colaboradores</h3>
              <p className="card-number">{stats.totalColaboradores}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <MessageSquare size={32} />
            <div className="card-info">
              <h3>Preguntas</h3>
              <p className="card-number">{stats.totalPreguntas}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <BarChart size={32} />
            <div className="card-info">
              <h3>Respuestas</h3>
              <p className="card-number">{stats.totalRespuestas}</p>
            </div>
          </div>
        </div>
        
        {/* Secciones desplegables */}
        <div className="admin-sections">
          {/* Sección Usuarios */}
          <div className="admin-section">
            <div 
              className="section-header"
              onClick={() => handleSectionToggle('usuarios')}
            >
              <div className="section-title">
                <User size={20} />
                <h3>Gestión de Usuarios</h3>
              </div>
              <ChevronRight className={`section-icon ${activeSection === 'usuarios' ? 'open' : ''}`} />
            </div>
            
            {activeSection === 'usuarios' && (
              <div className="section-content">
                {/* Filtro para usuarios */}
                <div className="filtro-container">
                  <div className="filtro-input-wrapper">
                    <Search size={18} className="filtro-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por email, nombre o tipo..."
                      value={filtroUsuarios}
                      onChange={(e) => setFiltroUsuarios(e.target.value)}
                      className="filtro-input"
                    />
                  </div>
                  <span className="filtro-count">
                    {usuariosFiltrados.length} de {usuarios.length} usuarios
                  </span>
                </div>
                
                {loadingData ? (
                  <div className="loading-data">
                    <Loader2 size={24} className="spinner" />
                    <span>Cargando usuarios...</span>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Nombre Completo</th>
                          <th>Fecha Nacimiento</th>
                          <th>Tipo</th>
                          <th>Preguntas Disponibles</th>
                          <th>Ganancias</th>
                          <th>Creado En</th>
                          <th>Tiempo Respuesta</th>
                          <th>Imágenes Permitidas</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuariosFiltrados.map((usuario) => (
                          <tr key={usuario.id}>
                            {editingRow === usuario.id ? (
                              <>
                                <td>
                                  <input
                                    type="email"
                                    value={editingData.email || ''}
                                    onChange={(e) => setEditingData({...editingData, email: e.target.value})}
                                    className="edit-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    value={editingData.nombre_completo || ''}
                                    onChange={(e) => setEditingData({...editingData, nombre_completo: e.target.value})}
                                    className="edit-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="date"
                                    value={editingData.fecha_nacimiento || ''}
                                    onChange={(e) => setEditingData({...editingData, fecha_nacimiento: e.target.value})}
                                    className="edit-input"
                                  />
                                </td>
                                <td>
                                  <select
                                    value={editingData.tipo || 'usuario'}
                                    onChange={(e) => setEditingData({...editingData, tipo: e.target.value})}
                                    className="edit-select"
                                  >
                                    <option value="usuario">Usuario</option>
                                    <option value="colaborador">Colaborador</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={editingData.preguntas_disponibles || 0}
                                    onChange={(e) => setEditingData({...editingData, preguntas_disponibles: parseInt(e.target.value)})}
                                    className="edit-input"
                                    min="0"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingData.ganancias_colaborador || 0.00}
                                    onChange={(e) => setEditingData({...editingData, ganancias_colaborador: parseFloat(e.target.value) || 0})}
                                    className="edit-input"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td>{formatDate(usuario.creado_en)}</td>
                                <td>
                                  <input
                                    type="number"
                                    value={editingData.tiempo_respuesta_minutos || 7}
                                    onChange={(e) => setEditingData({...editingData, tiempo_respuesta_minutos: parseInt(e.target.value)})}
                                    className="edit-input"
                                    min="1"
                                    max="60"
                                  />
                                </td>
                                <td>
                                  <select
                                    value={editingData.imagenes_permitidas || false}
                                    onChange={(e) => setEditingData({...editingData, imagenes_permitidas: e.target.value === 'true'})}
                                    className="edit-select"
                                  >
                                    <option value="false">No</option>
                                    <option value="true">Sí</option>
                                  </select>
                                </td>
                                <td className="actions-cell">
                                  <button
                                    className="btn-save"
                                    onClick={() => handleSaveEdit('usuarios', usuario.id)}
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    className="btn-cancel-admin"
                                    onClick={handleCancelEdit}
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{usuario.email}</td>
                                <td>{usuario.nombre_completo || '-'}</td>
                                <td>{usuario.fecha_nacimiento || '-'}</td>
                                <td>
                                  <span className={`badge tipo-${usuario.tipo}`}>
                                    {usuario.tipo}
                                  </span>
                                </td>
                                <td>{usuario.preguntas_disponibles}</td>
                                <td>
                                  Bs. {usuario.ganancias_colaborador?.toFixed(2) || '0.00'}
                                </td>
                                <td>{formatDate(usuario.creado_en)}</td>
                                <td>{usuario.tiempo_respuesta_minutos} min</td>
                                <td>
                                  <span className={`badge ${usuario.imagenes_permitidas ? 'success' : 'neutral'}`}>
                                    {usuario.imagenes_permitidas ? 'Sí' : 'No'}
                                  </span>
                                </td>
                                <td className="actions-cell">
                                  <button
                                    className="btn-edit"
                                    onClick={() => handleEditRow(usuario.id, usuario)}
                                  >
                                    <Edit size={14} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección Colaboradores */}
          <div className="admin-section">
            <div 
              className="section-header"
              onClick={() => handleSectionToggle('colaboradores')}
            >
              <div className="section-title">
                <Users size={20} />
                <h3>Gestión de Colaboradores</h3>
              </div>
              <ChevronRight className={`section-icon ${activeSection === 'colaboradores' ? 'open' : ''}`} />
            </div>
            
            {activeSection === 'colaboradores' && (
              <div className="section-content">
                {/* Filtro para colaboradores */}
                <div className="filtro-container">
                  <div className="filtro-input-wrapper">
                    <Search size={18} className="filtro-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por email, nombre o tipo..."
                      value={filtroColaboradores}
                      onChange={(e) => setFiltroColaboradores(e.target.value)}
                      className="filtro-input"
                    />
                  </div>
                  <span className="filtro-count">
                    {colaboradoresFiltrados.length} de {colaboradores.length} colaboradores
                  </span>
                </div>
                
                {loadingData ? (
                  <div className="loading-data">
                    <Loader2 size={24} className="spinner" />
                    <span>Cargando colaboradores...</span>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Nombre</th>
                          <th>Tipo</th>
                          <th>Colaborador Pro</th>
                          <th>Preguntas Disponibles</th>
                          <th>Ganancias</th>
                          <th>Creado En</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colaboradoresFiltrados.map((colaborador) => (
                          <tr key={colaborador.id}>
                            {editingRow === colaborador.id ? (
                              <>
                                <td>{colaborador.email}</td>
                                <td>
                                  <input
                                    type="text"
                                    value={editingData.nombre_completo || ''}
                                    onChange={(e) => setEditingData({...editingData, nombre_completo: e.target.value})}
                                    className="edit-input"
                                  />
                                </td>
                                <td>
                                  <select
                                    value={editingData.tipo || 'colaborador'}
                                    onChange={(e) => setEditingData({...editingData, tipo: e.target.value})}
                                    className="edit-select"
                                  >
                                    <option value="colaborador">Colaborador</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td>
                                  <select
                                    value={editingData.colaborador_pro || false}
                                    onChange={(e) => setEditingData({...editingData, colaborador_pro: e.target.value === 'true'})}
                                    className="edit-select"
                                  >
                                    <option value="false">No</option>
                                    <option value="true">Sí</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={editingData.preguntas_disponibles || 0}
                                    onChange={(e) => setEditingData({...editingData, preguntas_disponibles: parseInt(e.target.value)})}
                                    className="edit-input"
                                    min="0"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingData.ganancias_colaborador || 0.00}
                                    onChange={(e) => setEditingData({...editingData, ganancias_colaborador: parseFloat(e.target.value) || 0})}
                                    className="edit-input"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td>{formatDate(colaborador.creado_en)}</td>
                                <td className="actions-cell">
                                  <button
                                    className="btn-save"
                                    onClick={() => handleSaveEdit('colaboradores', colaborador.id)}
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    className="btn-cancel-admin"
                                    onClick={handleCancelEdit}
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{colaborador.email}</td>
                                <td>{colaborador.nombre_completo || '-'}</td>
                                <td>
                                  <span className={`badge tipo-${colaborador.tipo}`}>
                                    {colaborador.tipo}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${colaborador.colaborador_pro ? 'pro' : 'basic'}`}>
                                    {colaborador.colaborador_pro ? 'Pro' : 'Básico'}
                                  </span>
                                </td>
                                <td>{colaborador.preguntas_disponibles}</td>
                                <td>
                                  <strong>Bs. {colaborador.ganancias_colaborador?.toFixed(2) || '0.00'}</strong>
                                </td>
                                <td>{formatDate(colaborador.creado_en)}</td>
                                <td className="actions-cell">
                                  <button
                                    className="btn-edit"
                                    onClick={() => handleEditRow(colaborador.id, colaborador)}
                                  >
                                    <Edit size={14} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección Preguntas y Respuestas */}
          <div className="admin-section">
            <div 
              className="section-header"
              onClick={() => handleSectionToggle('preguntas')}
            >
              <div className="section-title">
                <MessageSquare size={20} />
                <h3>Preguntas y Respuestas</h3>
              </div>
              <ChevronRight className={`section-icon ${activeSection === 'preguntas' ? 'open' : ''}`} />
            </div>
            
            {activeSection === 'preguntas' && (
              <div className="section-content">
                {/* Filtros para preguntas y respuestas */}
                <div className="filtros-container">
                  <div className="filtro-dual">
                    <div className="filtro-group">
                      <label htmlFor="filtro-usuario">Filtrar por Usuario:</label>
                      <div className="filtro-input-wrapper">
                        <Search size={18} className="filtro-icon" />
                        <input
                          id="filtro-usuario"
                          type="text"
                          placeholder="Nombre o email del usuario..."
                          value={filtroPreguntasUsuario}
                          onChange={(e) => setFiltroPreguntasUsuario(e.target.value)}
                          className="filtro-input"
                        />
                      </div>
                    </div>
                    <div className="filtro-group">
                      <label htmlFor="filtro-colaborador">Filtrar por Colaborador:</label>
                      <div className="filtro-input-wrapper">
                        <Search size={18} className="filtro-icon" />
                        <input
                          id="filtro-colaborador"
                          type="text"
                          placeholder="Nombre o email del colaborador..."
                          value={filtroPreguntasColaborador}
                          onChange={(e) => setFiltroPreguntasColaborador(e.target.value)}
                          className="filtro-input"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="filtro-count">
                    {preguntasFiltradas.length} de {preguntasRespuestas.length} preguntas
                  </span>
                </div>
                
                {loadingData ? (
                  <div className="loading-data">
                    <Loader2 size={24} className="spinner" />
                    <span>Cargando preguntas y respuestas...</span>
                  </div>
                ) : (
                  <div className="preguntas-container">
                    {preguntasFiltradas.map((pregunta) => (
                      <div key={pregunta.id} className="pregunta-item">
                        <div className="pregunta-header">
                          <h4>{pregunta.contenido}</h4>
                          <div className="pregunta-meta">
                            <span className="meta-item">
                              <strong>Usuario:</strong> {pregunta.usuario?.nombre_completo || pregunta.usuario?.email}
                            </span>
                            <span className="meta-item">
                              <strong>Categoría:</strong> {pregunta.categorias?.nombre || 'General'}
                            </span>
                            <span className="meta-item">
                              <strong>Fecha:</strong> {formatDate(pregunta.creada_en)}
                            </span>
                          </div>
                        </div>
                        
                        {pregunta.respuestas && pregunta.respuestas.length > 0 && (
                          <div className="respuestas-container">
                            <h5>Respuestas ({pregunta.respuestas.length}):</h5>
                            {pregunta.respuestas.map((respuesta) => (
                              <div key={respuesta.id} className="respuesta-item">
                                <div className="respuesta-header">
                                  <span className="respuesta-author">
                                    <strong>Colaborador:</strong> {respuesta.colaborador?.nombre_completo || respuesta.colaborador?.email}
                                  </span>
                                  <span className="respuesta-date">
                                    {formatDate(respuesta.creada_en)}
                                  </span>
                                </div>
                                <p className="respuesta-contenido">{respuesta.contenido}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección Transacciones */}
          <div className="admin-section">
            <div 
              className="section-header"
              onClick={() => handleSectionToggle('transacciones')}
            >
              <div className="section-title">
                <CreditCard size={20} />
                <h3>Transacciones de Pagos</h3>
              </div>
              <ChevronRight className={`section-icon ${activeSection === 'transacciones' ? 'open' : ''}`} />
            </div>
            
            {activeSection === 'transacciones' && (
              <div className="section-content">
                {/* Filtro para transacciones */}
                <div className="filtro-container">
                  <div className="filtro-input-wrapper">
                    <Search size={18} className="filtro-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por usuario, email o estado..."
                      value={filtroTransacciones}
                      onChange={(e) => setFiltroTransacciones(e.target.value)}
                      className="filtro-input"
                    />
                  </div>
                  <span className="filtro-count">
                    {transaccionesFiltradas.length} de {transacciones.length} transacciones
                  </span>
                </div>
                
                {loadingData ? (
                  <div className="loading-data">
                    <Loader2 size={24} className="spinner" />
                    <span>Cargando transacciones...</span>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Preguntas Compradas</th>
                          <th>Tiempo Respuesta</th>
                          <th>Incluye Imágenes</th>
                          <th>Monto Total</th>
                          <th>Estado</th>
                          <th>Comprobante</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transaccionesFiltradas.map((transaccion) => (
                          <tr key={transaccion.id}>
                            <td>
                              {transaccion.usuario?.nombre_completo || transaccion.usuario?.email}
                              <br />
                              <small>{transaccion.usuario_id}</small>
                            </td>
                            <td>{transaccion.preguntas_compradas}</td>
                            <td>{transaccion.tiempo_respuesta_minutos} min</td>
                            <td>
                              <span className={`badge ${transaccion.incluye_imagenes ? 'success' : 'neutral'}`}>
                                {transaccion.incluye_imagenes ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td>Bs. {transaccion.monto_total?.toFixed(2) || '0.00'}</td>
                            <td>
                              <span className={`badge estado-${transaccion.estado}`}>
                                {transaccion.estado}
                              </span>
                            </td>
                            <td>
                              {transaccion.comprobante_subido ? (
                                transaccion.tiene_comprobante && transaccion.comprobante_url ? (
                                  <div className="comprobante-preview">
                                    <a
                                      href={transaccion.comprobante_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="comprobante-link"
                                      title={`Ver comprobante (${transaccion.comprobante_nombre || 'archivo'})`}
                                    >
                                      <Eye size={16} />
                                      <span>
                                        {transaccion.comprobante_tipo === 'imagen' ? 'Ver imagen' : 
                                        transaccion.comprobante_tipo === 'pdf' ? 'Ver PDF' : 
                                        'Ver documento'}
                                      </span>
                                      {transaccion.comprobante_extension && (
                                        <span className="comprobante-extension">
                                          (.{transaccion.comprobante_extension})
                                        </span>
                                      )}
                                    </a>
                                    
                                    {/* Información del archivo */}
                                    <div className="file-info">
                                      <small title={transaccion.comprobante_nombre}>
                                        📄 {transaccion.comprobante_nombre?.substring(0, 25)}...
                                      </small>
                                    </div>
                                    
                                    {transaccion.comprobante_tipo === 'imagen' && (
                                      <div className="image-preview">
                                        <img 
                                          src={transaccion.comprobante_url} 
                                          alt="Comprobante"
                                          className="comprobante-thumbnail"
                                          loading="lazy"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            const errorDiv = document.createElement('div');
                                            errorDiv.className = 'image-error';
                                            errorDiv.innerHTML = '<span>❌ Error cargando imagen</span>';
                                            e.target.parentElement.appendChild(errorDiv);
                                          }}
                                        />
                                      </div>
                                    )}
                                    
                                    {transaccion.comprobante_tipo === 'pdf' && (
                                      <div className="pdf-preview">
                                        <div className="pdf-icon">
                                          📄
                                        </div>
                                        <span className="pdf-text">Documento PDF</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="comprobante-error">
                                    <span className="error-text">⚠️ Comprobante subido pero archivo no encontrado</span>
                                    <div className="error-details">
                                      <small>Transacción ID: {transaccion.id}</small><br />
                                      <small>Usuario tabla: {transaccion.usuario_id}</small><br />
                                      <small>Perfil ID: {transaccion.usuario?.id}</small>
                                    </div>
                                    <button 
                                      className="btn-retry"
                                      onClick={() => fetchTransacciones()}
                                      style={{
                                        marginTop: '0.5rem',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.25rem',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Reintentar carga
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="no-comprobante">No subido</span>
                              )}
                            </td>
                            <td className="actions-cell">
                              <div className="estado-actions">
                                <button
                                  className={`btn-estado ${transaccion.estado === 'aprobado' ? 'active' : ''}`}
                                  onClick={() => handleUpdateEstadoTransaccion(transaccion.id, 'aprobado')}
                                  disabled={transaccion.estado === 'aprobado'}
                                >
                                  <CheckCircle size={14} />
                                  <span>Aprobar</span>
                                </button>
                                <button
                                  className={`btn-estado rechazar ${transaccion.estado === 'rechazado' ? 'active' : ''}`}
                                  onClick={() => handleUpdateEstadoTransaccion(transaccion.id, 'rechazado')}
                                  disabled={transaccion.estado === 'rechazado'}
                                >
                                  <XCircle size={14} />
                                  <span>Rechazar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default AdminPage;