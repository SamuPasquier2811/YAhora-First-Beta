import { useState, useEffect, useRef } from 'react';
import { X, Clock, Image as ImageIcon, Upload, Check, FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import './PurchaseModal.css';

function PurchaseModal({ isOpen, onClose, userData, showNotification }) {
    const [numPreguntas, setNumPreguntas] = useState(1);
    const [tiempoRespuesta, setTiempoRespuesta] = useState(7);
    const [incluyeImagenes, setIncluyeImagenes] = useState(false);
    const [total, setTotal] = useState(2);
    const [showQR, setShowQR] = useState(false);
    const [comprobante, setComprobante] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [subiendo, setSubiendo] = useState(false);
    const [error, setError] = useState('');
    
    // Precios fijos
    const PRECIO_PREGUNTA = 2;
    const PRECIO_TIEMPO = { 7: 0, 6: 1, 5: 2, 4: 3, 3: 4 };
    const PRECIO_IMAGENES = 4;
    
    // Calcular total automáticamente
    useEffect(() => {
        let calculoTotal = numPreguntas * PRECIO_PREGUNTA;
        calculoTotal += PRECIO_TIEMPO[tiempoRespuesta] || 0;
        if (incluyeImagenes) calculoTotal += PRECIO_IMAGENES;
        setTotal(calculoTotal);
    }, [numPreguntas, tiempoRespuesta, incluyeImagenes]);
    
    // Resetear cuando se cierra el modal
    useEffect(() => {
        if (!isOpen) {
            setShowQR(false);
            setComprobante(null);
            setPreviewURL(null);
            setNumPreguntas(1);
            setTiempoRespuesta(7);
            setIncluyeImagenes(false);
            setError('');
        }
    }, [isOpen]);
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tipo de archivo
            const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!tiposPermitidos.includes(file.type)) {
                setError('Solo se permiten imágenes (JPEG, PNG, JPG) o PDF');
                return;
            }
            
            // Validar tamaño (5MB máximo)
            if (file.size > 5 * 1024 * 1024) {
                setError('El archivo es muy grande (máximo 5MB)');
                return;
            }
            
            setComprobante(file);
            setError('');
            
            // Crear preview
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewURL(url);
            } else {
                setPreviewURL(null);
            }
        }
    };
    
    // Limpiar preview al desmontar
    useEffect(() => {
        return () => {
            if (previewURL) {
                URL.revokeObjectURL(previewURL);
            }
        };
    }, [previewURL]);
    
    const handleSubmit = async () => {
        if (!comprobante) {
            setError('Por favor, sube tu comprobante de pago');
            return;
        }
        
        try {
            setSubiendo(true);
            
            // 1. Subir archivo a Supabase Storage
            const fileExt = comprobante.name.split('.').pop();
            const fileName = `${userData.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('comprobantes')
                .upload(fileName, comprobante);
            
            if (uploadError) throw uploadError;
            
            // 2. Crear registro en la base de datos
            const { error: dbError } = await supabase
                .from('transacciones_pagos')
                .insert({
                    usuario_id: userData.id,
                    preguntas_compradas: numPreguntas,
                    tiempo_respuesta_minutos: tiempoRespuesta,
                    incluye_imagenes: incluyeImagenes,
                    monto_total: total,
                    comprobante_subido: true,
                    estado: 'pendiente'
                });
            
            if (dbError) throw dbError;
            
            // 3. Notificar éxito
            showNotification('success', '¡Pago registrado! Revisaremos tu comprobante pronto.');
            
            // 4. Cerrar modal y resetear
            onClose();
            
        } catch (err) {
            console.error('Error:', err);
            setError('Error al procesar el pago. Intenta nuevamente.');
        } finally {
            setSubiendo(false);
        }
    };
    
    const handleClose = () => {
        // Resetear todo al cerrar
        setShowQR(false);
        setComprobante(null);
        setPreviewURL(null);
        setNumPreguntas(1);
        setTiempoRespuesta(7);
        setIncluyeImagenes(false);
        setError('');
        onClose();
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="purchase-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose}>
                    <X size={24} />
                </button>
                
                <h2 className="modal-title">Adquirir Preguntas</h2>
                
                {!showQR ? (
                    <>
                        {/* Sección 1: Cantidad de preguntas */}
                        <div className="purchase-section">
                            <div className="price-display">
                                <span className="price-label">Pregunta = 2Bs</span>
                            </div>
                            
                            <div className="input-group">
                                <label className="input-label">¿Cuántas pregunta(s) quieres?</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={numPreguntas}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Permitir borrar y escribir
                                        if (value === '') {
                                            setNumPreguntas('');
                                        } else {
                                            const num = parseInt(value);
                                            if (!isNaN(num) && num >= 1 && num <= 100) {
                                                setNumPreguntas(num);
                                            }
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (e.target.value === '' || e.target.value < 1) {
                                            setNumPreguntas(1);
                                        }
                                    }}
                                    className="purchase-number-input"
                                />
                            </div>
                        </div>
                        
                        {/* Título Beneficios */}
                        <h3 className="benefits-title">Beneficios Extras</h3>
                        <p className="simple-benefit-note">
                            ⓘ Estos beneficios se mantienen activos mientras tengas preguntas disponibles.
                            Se reinician solo cuando tus preguntas llegan a cero.
                        </p>
                        {/* Sección 2: Tiempo de respuesta */}
                        <div className="purchase-section">
                            <h3 className="section-title">
                                <Clock size={18} />
                                Reducción en tiempo de respuesta
                            </h3>
                            
                            <div className="radio-group">
                                {[7, 6, 5, 4, 3].map((minutos) => (
                                    <label key={minutos} className="radio-option">
                                        <input
                                            type="radio"
                                            name="tiempoRespuesta"
                                            value={minutos}
                                            checked={tiempoRespuesta === minutos}
                                            onChange={() => setTiempoRespuesta(minutos)}
                                        />
                                        <span className="radio-custom"></span>
                                        <span className="radio-label">
                                            {minutos} minutos {minutos < 7 && `(+${PRECIO_TIEMPO[minutos]}Bs)`}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        {/* Sección 3: Imágenes */}
                        <div className="purchase-section">
                            <h3 className="section-title">
                                <ImageIcon size={18} />
                                Subir imágenes junto a tus preguntas
                                <span className="price-tag">(+4Bs)</span>
                            </h3>
                            
                            <div className="radio-group-horizontal">
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="incluyeImagenes"
                                        checked={!incluyeImagenes}
                                        onChange={() => setIncluyeImagenes(false)}
                                    />
                                    <span className="radio-custom"></span>
                                    <span className="radio-label">No</span>
                                </label>
                                
                                <label className="radio-option">
                                    <input
                                        type="radio"
                                        name="incluyeImagenes"
                                        checked={incluyeImagenes}
                                        onChange={() => setIncluyeImagenes(true)}
                                    />
                                    <span className="radio-custom"></span>
                                    <span className="radio-label">Sí</span>
                                </label>
                            </div>
                        </div>
                        
                        {/* Total */}
                        <div className="total-section">
                            <div className="total-line"></div>
                            <div className="total-display">
                                <span className="total-label">Total:</span>
                                <span className="total-amount">Bs. {total.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {/* Botón Hecho */}
                        <button 
                            className="btn-done" 
                            onClick={() => setShowQR(true)}
                            disabled={!numPreguntas || numPreguntas < 1}
                        >
                            Hecho
                        </button>
                    </>
                ) : (
                    <>
                        {/* Botón para volver atrás */}
                        <button 
                            className="btn-back" 
                            onClick={() => setShowQR(false)}
                        >
                            <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                            Volver
                        </button>
                        
                        {/* Vista del QR */}
                        <div className="qr-section">
                            <h3 className="qr-title">Realiza el pago al siguiente QR</h3>
                            <p className="qr-subtitle">Para recibir los siguientes beneficios:</p>
                            
                            <div className="qr-code-placeholder">
                                {/* Tu imagen QR aquí */}
                                <div className="qr-image">
                                    {/* Reemplaza esto con tu imagen QR */}
                                    <img 
                                        src="/QR.jpeg" 
                                        alt="QR Code para pago"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.parentElement.innerHTML = '<span>QR Code</span>';
                                        }}
                                    />
                                </div>
                            </div>
                            
                            {/* Resumen de compra */}
                            <div className="purchase-summary">
                                <h4>Resumen de tu compra:</h4>
                                <div className="summary-item">
                                    <span>Preguntas:</span>
                                    <span>{numPreguntas} ({numPreguntas * PRECIO_PREGUNTA}Bs)</span>
                                </div>
                                <div className="summary-item">
                                    <span>Tiempo de respuesta:</span>
                                    <span>{tiempoRespuesta} min {tiempoRespuesta < 7 && `(+${PRECIO_TIEMPO[tiempoRespuesta]}Bs)`}</span>
                                </div>
                                {incluyeImagenes && (
                                    <div className="summary-item">
                                        <span>Incluye imágenes:</span>
                                        <span>Sí (+4Bs)</span>
                                    </div>
                                )}
                                <div className="summary-total">
                                    <span>Total a pagar:</span>
                                    <span>Bs. {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <p className="qr-subtitle-note">Una vez procesado el pago, recibirás tus beneficios en un lapso de 30-45 minutos en horario laboral.</p>
                            
                            {/* Subir comprobante */}
                            <div className="upload-section">
                                <h4>Sube tu comprobante</h4>
                                <label className="file-upload-label">
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleFileChange}
                                        className="file-input"
                                    />
                                    <div className="upload-area">
                                        <Upload size={24} />
                                        <span>{comprobante ? comprobante.name : 'Haz clic para subir comprobante'}</span>
                                        {comprobante && <Check size={16} className="check-icon" />}
                                        
                                        {/* Preview del archivo */}
                                        {previewURL && comprobante?.type.startsWith('image/') && (
                                            <div className="file-preview">
                                                <img src={previewURL} alt="Preview del comprobante" />
                                            </div>
                                        )}
                                        
                                        {comprobante && comprobante?.type === 'application/pdf' && (
                                            <div className="file-preview-pdf">
                                                <FileText size={48} />
                                                <span>Archivo PDF: {comprobante.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </label>
                                {error && <p className="error-message">{error}</p>}
                            </div>
                            
                            {/* Botón Enviar */}
                            <button 
                                className="btn-submit" 
                                onClick={handleSubmit}
                                disabled={subiendo || !comprobante}
                            >
                                {subiendo ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PurchaseModal;
