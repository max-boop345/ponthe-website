import React from 'react'
import CustomNavbar from './Navbar'
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import './../App.css';

export default function HomePage (){

    return (
        <>
            <CustomNavbar/>
            <main>
                <section
                    className="hero-section"
                    style={{
                        backgroundImage:
                            "linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0.75) 100%), url('/static/assets/img/028_group.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="hero-content">
                        <div className="poster-title-container">
                            <div className="badge-hero-yellow">028</div>
                            <h1 className="poster-title">PONTHÉ</h1>
                            <div className="poster-title-outline" aria-hidden="true">PONTHÉ</div>
                        </div>
                        <p className="hero-subtitle">Club photo &amp; vidéo de l'École des Ponts</p>
                        <div className="hero-pills">
                            <a className="pill-btn pill-yellow" href="/galleries">Accéder aux galeries</a>
                            <a className="pill-btn pill-white" href="https://www.youtube.com/@ponthe-ecoledesponts7542">Chaîne Youtube</a>
                        </div>
                        <a className="scroll-chevron" href="#team" aria-label="Voir l'équipe">
                            <KeyboardDoubleArrowDownIcon/>
                        </a>
                    </div>
                </section>

                <a name="team"></a>
                <section className="team-section">
                    <div className="team-section-inner">
                        <img className="team-img-rounded" src="/static/assets/img/028_group.jpg" alt="L'équipe Ponthé 028"/>
                        <h2 className="team-section-title">L'équipe</h2>
                        <div className="roster-grid">
                            <div className="roster-column">
                                <h3 className="roster-group-title">Le Bureau</h3>
                                <div className="roster-card-item">
                                    <p><strong>Présidente :</strong> Alice Dubreux</p>
                                    <p><strong>V-Prez Photo :</strong> Romain Soulabail</p>
                                    <p><strong>V-Prez Vidéo :</strong> Louis Cussoneau</p>
                                    <p><strong>Trez :</strong> Émilie Duccini</p>
                                </div>
                                <h3 className="roster-group-title">Responsables</h3>
                                <div className="roster-card-item">
                                    <p><strong>Respo Matos :</strong> Paul Lemeunier</p>
                                    <p><strong>Respo Galeries :</strong> Maxime Novo-Frelicot</p>
                                    <p><strong>Respo Comm :</strong> Vincent Huynh</p>
                                </div>
                            </div>
                            <div className="roster-column">
                                <h3 className="roster-group-title">Pôle Création</h3>
                                <div className="roster-card-item">
                                    <p className="roster-subtitle">Vidéastes</p>
                                    <p className="roster-names">Océane Chia, Louis Laverrière, Clovis Vialard, Sophie Balmitgère</p>
                                    <p className="roster-subtitle">Photographes</p>
                                    <p className="roster-names">Maxime Préel, Pétronille Sylvestre, Juliette Houriez, Mathilde David, Sélène Baudoux, Saül Buchwald, Lucie Agnese, Maxence Brechon</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="site-footer">
                <p>© 2026 Club Ponthé — École des Ponts ParisTech</p>
            </footer>
        </>
    )
}
