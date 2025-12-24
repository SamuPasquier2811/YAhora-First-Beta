import { useState, useEffect } from 'react';
import { X, Send, MapPin, Tag, AlertCircle, Image, Upload, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import './QuestionModal.css';

function QuestionModal({ isOpen, onClose, userData, onSubmit, showNotification }) {
    const [categorias, setCategorias] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        contenido: '',
        categoria_id: '',
        zona_id: '',
        imagen: null
    });
    const [errors, setErrors] = useState({});
    const [showCategoryTooltip, setShowCategoryTooltip] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageError, setImageError] = useState('');
    const [showImageTooltip, setShowImageTooltip] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Cargar categorías y zonas al abrir el modal
    useEffect(() => {
        if (isOpen) {
            fetchCategorias();
            fetchZonas();
            setErrors({});
            // Resetear imagen al abrir el modal
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
                setImagePreview(null);
            }
            setFormData(prev => ({ ...prev, imagen: null }));
        }
    }, [isOpen]);

    // Limpiar preview al desmontar
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const fetchCategorias = async () => {
        try {
            const { data, error } = await supabase
                .from('categorias')
                .select('*')
                .eq('activa', true)
                .order('orden');

            if (error) throw error;
            setCategorias(data || []);
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    };

    const fetchZonas = async () => {
        try {
            const { data, error } = await supabase
                .from('zonas_la_paz')
                .select('*')
                .eq('activa', true)
                .order('orden');

            if (error) throw error;
            setZonas(data || []);
        } catch (error) {
            console.error('Error cargando zonas:', error);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Verificar si el usuario puede subir imágenes
        if (!userData.imagenes_permitidas) {
            setShowImageTooltip(true);
            setTimeout(() => setShowImageTooltip(false), 4000);
            e.target.value = ''; // Limpiar input
            return;
        }

        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setImageError('Solo se permiten imágenes (JPEG, PNG, JPG, WEBP, GIF)');
            e.target.value = '';
            return;
        }

        // Validar tamaño (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setImageError('La imagen es muy grande (máximo 5MB)');
            e.target.value = '';
            return;
        }

        setImageError('');
        setFormData(prev => ({ ...prev, imagen: file }));

        // Crear preview
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
    };

    const removeImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
        setFormData(prev => ({ ...prev, imagen: null }));
        setImageError('');
        // Limpiar input file
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.categoria_id) {
            newErrors.categoria_id = 'Debes seleccionar una categoría';
        }
        
        if (!formData.contenido.trim()) {
            newErrors.contenido = 'Debes escribir tu pregunta';
        } else if (formData.contenido.trim().length < 10) {
            newErrors.contenido = 'La pregunta debe tener al menos 10 caracteres';
        } else if (formData.contenido.trim().length > 500) {
            newErrors.contenido = 'La pregunta no puede tener más de 500 caracteres';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadImageToStorage = async (file, prefix) => {
        try {
            setUploadingImage(true);
            
            // Crear nombre único para la imagen
            const fileExt = file.name.split('.').pop();
            const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('imagenes-preguntas')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Error de upload:', uploadError);
                throw new Error('Error subiendo imagen');
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('imagenes-preguntas')
                .getPublicUrl(fileName);

            // console.log('Imagen subida exitosamente:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            throw error;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            if (!formData.categoria_id) {
                setShowCategoryTooltip(true);
                setTimeout(() => setShowCategoryTooltip(false), 3000);
            }
            return;
        }

        setLoading(true);
        let imagenUrl = null;

        try {
            // Validar que tenga preguntas disponibles
            if (userData.preguntas_disponibles <= 0) {
                showNotification('error', 'No tienes preguntas disponibles');
                return;
            }

            // Subir imagen primero si existe y el usuario tiene permiso
            if (formData.imagen && userData.imagenes_permitidas) {
                try {
                    // Subir imagen a storage
                    imagenUrl = await uploadImageToStorage(formData.imagen, 'temp');
                } catch (imageError) {
                    console.error('Error subiendo imagen:', imageError);
                    showNotification('error', 'Error subiendo imagen');
                    return;
                }
            }

            // Preparar datos para enviar
            const preguntaData = {
                contenido: formData.contenido,
                categoria_id: formData.categoria_id,
                zona_id: formData.zona_id || null,
                imagen_url: imagenUrl || null // Incluir URL de imagen si existe
            };
            
            // Llamar a onSubmit con los datos completos
            await onSubmit(preguntaData);
            
            // Resetear formulario
            setFormData({
                contenido: '',
                categoria_id: '',
                zona_id: '',
                imagen: null
            });
            setErrors({});
            
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
                setImagePreview(null);
            }
            
            onClose();
        } catch (error) {
            console.error('Error enviando pregunta:', error);
            showNotification('error', 'Error al enviar la pregunta');
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryFocus = () => {
        if (!formData.categoria_id && Object.keys(errors).length > 0) {
            setShowCategoryTooltip(true);
            setTimeout(() => setShowCategoryTooltip(false), 3000);
        }
    };

    const handleImageClick = () => {
        if (!userData.imagenes_permitidas) {
            setShowImageTooltip(true);
            setTimeout(() => setShowImageTooltip(false), 4000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>¿Cuál es tu pregunta?</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="question-form">
                    {/* Categoría y Zona en fila */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>
                                <Tag size={16} /> Categoría
                            </label>
                            <div className="select-wrapper">
                                <select
                                    value={formData.categoria_id}
                                    onChange={(e) => {
                                        setFormData({...formData, categoria_id: e.target.value});
                                        if (errors.categoria_id) {
                                            setErrors(prev => ({...prev, categoria_id: ''}));
                                        }
                                    }}
                                    onFocus={handleCategoryFocus}
                                    className={errors.categoria_id ? 'error' : ''}
                                    disabled={loading}
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nombre}
                                        </option>
                                    ))}
                                </select>
                                
                                {showCategoryTooltip && (
                                    <div className="validation-tooltip">
                                        <AlertCircle size={14} />
                                        {errors.categoria_id || 'Debes seleccionar una categoría'}
                                    </div>
                                )}
                            </div>
                            {errors.categoria_id && !showCategoryTooltip && (
                                <div className="error-message">
                                    <AlertCircle size={14} />
                                    {errors.categoria_id}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>
                                <MapPin size={16} /> Zona de La Paz (opcional)
                            </label>
                            <select
                                value={formData.zona_id}
                                onChange={(e) => setFormData({...formData, zona_id: e.target.value})}
                                disabled={loading}
                            >
                                <option value="">Selecciona una zona</option>
                                {zonas.map(zona => (
                                    <option key={zona.id} value={zona.id}>
                                        {zona.nombre}
                                    </option>
                                ))}
                            </select>
                            <p className="form-hint">
                                Ayuda a los colaboradores a ubicar mejor tu consulta
                            </p>
                        </div>
                    </div>

                    {/* Sección para subir imagen */}
                    <div className="form-group">
                        <label className={!userData.imagenes_permitidas ? 'disabled-label' : ''}>
                            <Image size={16} /> 
                            Subir imagen (opcional)
                            {!userData.imagenes_permitidas && (
                                <span className="premium-badge">NUEVO</span>
                            )}
                        </label>
                        
                        <div 
                            className={`image-upload-area ${!userData.imagenes_permitidas ? 'disabled' : ''}`}
                            // onClick={handleImageClick}
                        >
                            <input
                                type="file"
                                accept="image/jpeg, image/png, image/jpg, image/webp, image/gif"
                                onChange={handleImageChange}
                                disabled={!userData.imagenes_permitidas || loading}
                                className="file-input"
                                id="image-upload-input"
                            />
                            
                            {!imagePreview ? (
                                <label 
                                    htmlFor="image-upload-input" 
                                    className="upload-placeholder"
                                    onClick={() => {
                                        // Mostrar tooltip si no tiene permiso
                                        if (!userData.imagenes_permitidas) {
                                            setShowImageTooltip(true);
                                            setTimeout(() => setShowImageTooltip(false), 4000);
                                        }
                                    }}
                                >
                                    {userData.imagenes_permitidas ? (
                                        <>
                                            <Upload size={24} className="upload-icon" />
                                            <span>Haz clic para subir una imagen</span>
                                            <small>Solo imágenes (max. 5MB)</small>
                                        </>
                                    ) : (
                                        <>
                                            <Image size={24} className="upload-icon disabled" />
                                            <span>Adquiere esta función en beneficios extras</span>
                                        </>
                                    )}
                                </label>
                            ) : (
                                <div className="image-preview-container">
                                    <img 
                                        src={imagePreview} 
                                        alt="Vista previa" 
                                        className="image-preview" 
                                    />
                                    <button 
                                        type="button" 
                                        className="remove-image-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeImage();
                                        }}
                                        disabled={loading}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {showImageTooltip && (
                            <div className="image-tooltip">
                                <AlertCircle size={14} />
                                <span>Para subir imágenes, adquiere esta función en los beneficios extras de abajo de la página</span>
                            </div>
                        )}
                        
                        {imageError && (
                            <div className="error-message">
                                <AlertCircle size={14} />
                                {imageError}
                            </div>
                        )}
                    </div>

                    {/* Contenido */}
                    <div className="form-group">
                        <label htmlFor="contenido">Escribe tu pregunta</label>
                        <textarea
                            id="contenido"
                            placeholder="Ej: ¿Qué puedo regalar para navidad? ¿Alguna idea original que no sea muy cara?"
                            rows="6"
                            value={formData.contenido}
                            onChange={(e) => {
                                setFormData({...formData, contenido: e.target.value});
                                if (errors.contenido) {
                                    setErrors(prev => ({...prev, contenido: ''}));
                                }
                            }}
                            maxLength="500"
                            className={errors.contenido ? 'error' : ''}
                            disabled={loading}
                        />
                        <div className="textarea-footer">
                            <div className="char-counter">
                                {formData.contenido.length}/500 caracteres
                            </div>
                            {errors.contenido && (
                                <div className="error-message">
                                    <AlertCircle size={14} />
                                    {errors.contenido}
                                </div>
                            )}
                        </div>
                        <p className='note'>Nota: Los beneficios como 'subir imágenes' y 'reducción de tiempo de respuesta' se reinician cuando tus preguntas llegan a cero.</p>
                    </div>

                    {/* Botones */}
                    <div className="form-actions">
                        <div className="actions-right">
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="btn-primary"
                                disabled={loading || userData.preguntas_disponibles <= 0}
                            >
                                {loading ? (
                                    'Enviando...'
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Enviar Pregunta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="form-footer">
                        <p className="questions-info">
                            Tienes <strong>{userData.preguntas_disponibles}</strong> preguntas disponibles
                        </p>
                        {userData.preguntas_disponibles === 0 && (
                            <p className="no-questions-warning">
                                No tienes preguntas disponibles. ¡Adquiere más preguntas!
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export default QuestionModal;