import './HomePage.css'
import { useNavigate } from 'react-router-dom';
function HomePage() {
    const navigate = useNavigate();
    return (
        <div className="home-page">
            {/* Navbar */}
            <nav className="navbar" aria-label='Navegación principal'>
                <div className="logo" role='heading' aria-level="1">YAhora?</div>
                <div className="nav-links">
                    <button onClick={() => navigate('/login')} className="btn btn-outline">Ingresar</button>
                    <button onClick={() => navigate('/register')} className="btn btn-primary">Comenzar</button>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero" aria-labelledby='main-heading'>
                <h3>Si algo no sale como esperabas, seguramente te has preguntado:</h3>
                <h1 id='main-heading'>¿Y ahora?</h1>
                <p>
                    Estamos aquí para ayudarte, resolviendo tus dudas en tiempo récord.
                </p>
                <button onClick={() => navigate('/register')} className="btn btn-primary btn-large">
                    Comenzar Gratis
                </button>
            </section>
            {/* Footer */}
            <footer className="footer">
                <p>© 2025 YAhora? - Respuestas rápidas para Bolivia</p>
            </footer>
        </div>
    )
}

export default HomePage
