import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import './NotificationComponent.css';

function NotificationComponent({ type, message, onClose }) {
    useEffect(() => {
        // Auto-cerrar la notificación después de 4 segundos
        const timer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const config = {
        success: {
            icon: <CheckCircle size={24} />,
            bgColor: 'var(--color-success)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            iconColor: '#10B981'
        },
        error: {
            icon: <XCircle size={24} />,
            bgColor: 'var(--color-danger)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            iconColor: '#EF4444'
        },
        info: {
            icon: <Info size={24} />,
            bgColor: 'var(--color-primary)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            iconColor: '#3B82F6'
        }
    };

    const { icon, bgColor, borderColor, iconColor } = config[type] || config.info;

    return (
        <div 
            className="notification"
            style={{
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
            }}
        >
            <div className="notification-content">
                <div className="notification-icon" style={{ color: iconColor }}>
                    {icon}
                </div>
                <div className="notification-message">
                    {message}
                </div>
                <button 
                    className="notification-close" 
                    onClick={onClose}
                    aria-label="Cerrar notificación"
                >
                    <X size={18} />
                </button>
            </div>
            
            {/* Barra de progreso */}
            <div className="notification-progress">
                <div 
                    className="notification-progress-bar"
                    style={{ backgroundColor: iconColor }}
                />
            </div>
        </div>
    );
}

export default NotificationComponent;