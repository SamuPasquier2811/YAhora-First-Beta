import { MessageSquare, MapPin, Tag, ChevronLeft, ChevronRight, Clock, AlertCircle, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './QuestionsList.css';

function QuestionsList({ questions, tiempoRespuestaUsuario = 7, userData, onPreguntaCerrada}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleCards, setVisibleCards] = useState(1);
    const containerRef = useRef(null);
    
    // Determinar cuántas tarjetas mostrar según el ancho del contenedor
    useEffect(() => {
        const updateVisibleCards = () => {
        if (!containerRef.current) return;
        
        const containerWidth = containerRef.current.offsetWidth;
        
        if (containerWidth < 640) { // Móvil
            setVisibleCards(1);
        } else if (containerWidth < 1024) { // Tablet
            setVisibleCards(2);
        } else { // Desktop
            setVisibleCards(3);
        }
        };
        
        updateVisibleCards();
        window.addEventListener('resize', updateVisibleCards);
        
        return () => window.removeEventListener('resize', updateVisibleCards);
    }, []);
    
    if (!questions || questions.length === 0) {
        return (
        <div className="questions-list empty">
            <div className="empty-card">
            <MessageSquare size={48} className="empty-icon" />
            <h3>Aún no has hecho preguntas</h3>
            <p>¡Haz tu primera pregunta y recibe respuestas de nuestros colaboradores!</p>
            </div>
        </div>
        );
    }

    const totalQuestions = questions.length;
    const maxIndex = Math.max(0, totalQuestions - visibleCards);
    const clampedIndex = Math.min(currentIndex, maxIndex);
    const visibleQuestions = questions.slice(clampedIndex, clampedIndex + visibleCards);
    const showNavigation = totalQuestions > visibleCards;
    
    const handlePrev = () => {
        setCurrentIndex(prev => {
        const newIndex = prev - visibleCards;
        return newIndex < 0 ? maxIndex : newIndex;
        });
    };

    const handleNext = () => {
        setCurrentIndex(prev => {
        const newIndex = prev + visibleCards;
        return newIndex > maxIndex ? 0 : newIndex;
        });
    };



    return (
        <>
            {showNavigation && totalQuestions > 0 && (
                <div className="pagination-indicator">
                Pregunta {clampedIndex + 1}-{Math.min(clampedIndex + visibleCards, totalQuestions)} de {totalQuestions}
                </div>
            )}
            <div className="questions-list" ref={containerRef}>
                {showNavigation && (
                    <button className="nav-button prev" onClick={handlePrev}>
                        <ChevronLeft size={24} />
                    </button>
                )}
                
                <div className="cards-wrapper">
                    <div className="cards-grid" style={{ '--visible-cards': visibleCards }}>
                        {visibleQuestions.map((question, index) => (
                            <QuestionCard 
                              key={question.id || index} 
                              question={question} 
                              tiempoRespuestaUsuario={tiempoRespuestaUsuario}
                              userData={userData}
                              onPreguntaCerrada={onPreguntaCerrada}
                            />
                        ))}
                    </div>
                </div>

                {showNavigation && (
                    <button className="nav-button next" onClick={handleNext}>
                    <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </>
    );
}

// Componente separado para tarjeta
function QuestionCard({ question, tiempoRespuestaUsuario, userData, onPreguntaCerrada }) {
  // Hacer userData opcional con valor por defecto
  const safeUserData = userData || {
    id: '',
    preguntas_disponibles: 0
  };
  
  // Estado para controlar si ya procesamos el cierre
  const [procesadoCierre, setProcesadoCierre] = useState(false);
  // Estado local para el estado de la pregunta
  const [estadoPregunta, setEstadoPregunta] = useState(question.estado);
  // Estado para el usuario_id de la pregunta
  const [usuarioIdPregunta, setUsuarioIdPregunta] = useState(null);
  
  // Calcular tiempo transcurrido desde la creación
  const calcularTiempoRestante = () => {
      if (!question.creada_en) {
          return tiempoRespuestaUsuario * 60;
      }
      
      const creadaEn = new Date(question.creada_en + 'Z');
      const ahora = new Date();
      
      const diferenciaMs = ahora - creadaEn;
      const tiempoTranscurridoSegundos = Math.floor(diferenciaMs / 1000);
      const tiempoTotalSegundos = tiempoRespuestaUsuario * 60;
      const tiempoRestanteSegundos = tiempoTotalSegundos - tiempoTranscurridoSegundos;
      
      return Math.max(0, tiempoRestanteSegundos);
  };

  const [tiempoRestante, setTiempoRestante] = useState(() => calcularTiempoRestante());
  const [answers, setAnswers] = useState([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  // Cargar usuario_id de la pregunta y respuestas
  useEffect(() => {
    const fetchQuestionDetails = async () => {
      try {
        // Obtener el usuario_id de la pregunta
        const { data: preguntaData, error } = await supabase
          .from('preguntas')
          .select('usuario_id')
          .eq('id', question.id)
          .single();
        
        if (!error && preguntaData) {
          setUsuarioIdPregunta(preguntaData.usuario_id);
        }
      } catch (error) {
        console.error('Error obteniendo usuario_id de la pregunta:', error);
      }
    };

    fetchQuestionDetails();
    fetchAnswers();
    
    const channel = supabase
      .channel(`answers-${question.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'respuestas',
          filter: `pregunta_id=eq.${question.id}`
        }, 
        (payload) => {
          setAnswers(prev => [...prev, payload.new]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [question.id]);
  
  const fetchAnswers = async () => {
    try {
      setLoadingAnswers(true);
      
      // MÉTODO SIMPLE Y DIRECTO: Usar JOIN
      const { data: respuestasConPerfiles, error } = await supabase
        .from('respuestas')
        .select(`
          *,
          perfiles!inner (
            nombre_completo,
            email,
            colaborador_pro
          )
        `)
        .eq('pregunta_id', question.id)
        .order('creada_en', { ascending: true });
      
      if (error) {
        console.error('Error cargando respuestas:', error);
        throw error;
      }
      
      if (!respuestasConPerfiles || respuestasConPerfiles.length === 0) {
        setAnswers([]);
        return;
      }
      
      // Procesar los datos del JOIN
      const respuestasProcesadas = respuestasConPerfiles.map(item => ({
        ...item,
        colaborador: item.perfiles ? {
          nombre_completo: item.perfiles.nombre_completo,
          email: item.perfiles.email,
          colaborador_pro: item.perfiles.colaborador_pro || false
        } : null
      }));
      
      // Ordenar: colaboradores pro primero
      const sortedData = respuestasProcesadas.sort((a, b) => {
        const aIsPro = a.colaborador?.colaborador_pro || false;
        const bIsPro = b.colaborador?.colaborador_pro || false;
        return aIsPro === bIsPro ? 0 : aIsPro ? -1 : 1;
      });
      
      setAnswers(sortedData);
      
    } catch (error) {
      console.error('Error en fetchAnswers:', error);
      setAnswers([]);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Suscribirse a cambios en la pregunta
  useEffect(() => {
    const channel = supabase
      .channel(`question-${question.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'preguntas',
          filter: `id=eq.${question.id}`
        }, 
        (payload) => {
          if (payload.new.estado) {
            setEstadoPregunta(payload.new.estado);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [question.id]);
  
  // Verificar si la pregunta debe cerrarse automáticamente (SOLO UNA VEZ)
  useEffect(() => {
    const verificarCierreAutomatico = async () => {
      // Si ya está cerrada, no hacer nada
      if (estadoPregunta !== 'pendiente') return;
      
      const tieneRespuestas = answers.length > 0;
      const tiempoAgotado = tiempoRestante === 0;
      
      // Solo procesar si no ha sido procesado
      if (procesadoCierre) return;
      
      // Condiciones para cerrar
      const debeCerrarPorRespuestas = answers.length >= 5;
      const debeCerrarPorTiempo = tiempoAgotado;
      
      if (debeCerrarPorRespuestas || debeCerrarPorTiempo) {
        try {
          // Marcar como procesado inmediatamente
          setProcesadoCierre(true);
          
          // Actualizar pregunta en la BD
          const { error } = await supabase
            .from('preguntas')
            .update({ 
              estado: 'cerrada',
              actualizada_en: new Date().toISOString()
            })
            .eq('id', question.id);
          
          if (error) throw error;
          
          // Actualizar estado local
          setEstadoPregunta('cerrada');

          // NOTIFICAR AL COMPONENTE PADRE QUE LA PREGUNTA SE CERRÓ
          if (onPreguntaCerrada) {
              onPreguntaCerrada(question.id, 'cerrada');
          }
          
          // Si se cerró por tiempo sin respuestas, retornar pregunta
          if (debeCerrarPorTiempo && !tieneRespuestas && safeUserData.id && usuarioIdPregunta === safeUserData.id) {
            // console.log('🔄 Retornando 1 pregunta al usuario porque no hubo respuestas:', safeUserData.id);
            
            // Obtener el valor actual de preguntas_disponibles
            const { data: perfilActual, error: perfilError } = await supabase
              .from('perfiles')
              .select('preguntas_disponibles')
              .eq('id', safeUserData.id)
              .single();
            
            if (!perfilError && perfilActual) {
              const nuevoValor = perfilActual.preguntas_disponibles + 1;
              
              await supabase
                .from('perfiles')
                .update({ 
                  preguntas_disponibles: nuevoValor
                })
                .eq('id', safeUserData.id);
              
              // console.log(`💰 Preguntas disponibles actualizadas: ${nuevoValor}`);
            }
          } else if (debeCerrarPorTiempo && tieneRespuestas) {
            // console.log('⏸️ No se retorna pregunta porque hubo respuestas');
          }
          
        } catch (error) {
          console.error('Error cerrando pregunta:', error);
          // Si hay error, permitir reintento
          setProcesadoCierre(false);
        }
      }
    };
    
    verificarCierreAutomatico();
  }, [tiempoRestante, answers.length, procesadoCierre, estadoPregunta, question.id, safeUserData.id, usuarioIdPregunta, onPreguntaCerrada]);

  // Actualizar el tiempo restante cada segundo
  useEffect(() => {
    if (estadoPregunta === 'pendiente' && tiempoRestante > 0) {
      const timer = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [estadoPregunta, tiempoRestante]);
  
  // Formatear el tiempo para mostrar
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const tiempoFormateado = formatTime(tiempoRestante);

  // Determinar mensaje para mostrar
  const getBodyMessage = () => {
    // Si hay respuestas, mostrar cuántas
    if (answers.length > 0) {
      return `Tienes ${answers.length} respuesta(s).`;
    }
    
    // Si está cerrada y no tuvo respuestas
    if (estadoPregunta === 'cerrada' && answers.length === 0) {
      return 'Lo sentimos, no pudimos responder tu pregunta. Se te ha retornado 1 pregunta a tu cuenta. Recarga la página.';
    }
    
    // Si está cerrada con respuestas
    if (estadoPregunta === 'cerrada') {
      return 'Esta pregunta ha sido cerrada. Gracias por participar.';
    }
    
    // Si está respondida
    if (estadoPregunta === 'respondida') {
      return '¡Pregunta respondida! Gracias por usar nuestro servicio.';
    }
    
    // Si está pendiente y tiene tiempo
    if (estadoPregunta === 'pendiente' && tiempoRestante > 0) {
      return 'En unos momentos recibirás respuestas de nuestros colaboradores...';
    }
    
    // Si está pendiente y tiempo agotado (pero aún no se cerró)
    if (estadoPregunta === 'pendiente' && tiempoRestante === 0) {
      return 'Esperando respuestas...';
    }
    
    return 'En unos momentos recibirás respuestas de nuestros colaboradores...';
  };

  return (
    <div className="question-card">
      <div className="card-header">
        <h3>{truncateText(question.contenido, 100)}</h3>
        {/* Mostrar imagen si existe */}
        {question.imagen_url && (
            <div className="question-image-container">
                <img 
                    src={question.imagen_url} 
                    alt="Imagen de la pregunta" 
                    className="question-image"
                    onClick={() => window.open(question.imagen_url, '_blank')}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        const container = e.target.parentElement;
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'image-error';
                        errorDiv.innerHTML = '<span>❌ Error cargando imagen</span>';
                        container.appendChild(errorDiv);
                    }}
                />
            </div>
        )}
      </div>
      
      <div className="card-body">
        {/* Mostrar respuestas */}
        {answers.length > 0 ? (
          <div className="answers-container">
            {answers.map((answer) => (
              <div key={answer.id} className="answer-item">
                <div className="answer-header">
                  <span className="answer-author">
                    {answer.colaborador?.nombre_completo || 
                     answer.colaborador?.email?.split('@')[0] || 
                     'Colaborador'}
                  </span>
                  {answer.colaborador?.colaborador_pro && (
                      <span className="pro-badge-answer">
                          <Shield size={10} />
                          Pro
                      </span>
                  )}
                </div>
                <p className="answer-content">{answer.contenido}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-answers">
            <AlertCircle size={32} className="empty-icon" />
            <p className="empty-message">{getBodyMessage()}</p>
            {estadoPregunta === 'pendiente' && (
              <p className="waiting-note">
                Los colaboradores están revisando tu pregunta...
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <div className="card-meta">
          <span className="meta-item">
            <Tag size={14} />
            {question.categoria || 'Sin categoría'}
          </span>
          {question.zona && question.zona !== 'No especificada' && (
            <span className="meta-item">
              <MapPin size={14} />
              {question.zona}
            </span>
          )}
          <span className="meta-item">
            <MessageSquare size={14} />
            {answers.length} respuesta(s)
          </span>
        </div>
        
        <div className="card-status">
          <span className={`status ${estadoPregunta === 'pendiente' ? 'abierta' : estadoPregunta}`}>
            {getStatusText(estadoPregunta)}
          </span>
          
          {estadoPregunta === 'pendiente' && tiempoRestante > 0 && (
            <div className="status-timer">
              <Clock size={12} className="timer-icon" />
              <span>{tiempoFormateado}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para truncar texto
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Función para traducir estados
function getStatusText(status) {
  const statusMap = {
    'pendiente': 'Abierta',
    'respondida': 'Respondida',
    'cerrada': 'Cerrada'
  };
  return statusMap[status] || status;
}

export default QuestionsList;