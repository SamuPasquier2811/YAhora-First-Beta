import { ShoppingBag, Zap, ArrowRight } from 'lucide-react';
import './PurchaseButton.css';

function PurchaseButton({ onClick }) {
    return (
        <div className="purchase-section">
            <button className="purchase-button" onClick={onClick}>
                <div className="purchase-content">
                    <div className="purchase-header">
                        <ShoppingBag size={24} className="purchase-icon" />
                        <div className="purchase-text">
                            <h3>Adquiere más preguntas desde 2Bs</h3>
                            <p>¡Y desbloquea beneficios extra para tus consultas!</p>
                        </div>
                        <ArrowRight size={20} className="arrow-icon" />
                    </div>
                    
                    <div className="benefits-list">
                        <div className="benefit">
                            <Zap size={16} />
                            <span>Más preguntas</span>
                        </div>
                        <div className="benefit">
                            <Zap size={16} />
                            <span>Menor tiempo de respuesta</span>
                        </div>
                        <div className="benefit">
                            <Zap size={16} />
                            <span>Incluir imágenes</span>
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
}

export default PurchaseButton;