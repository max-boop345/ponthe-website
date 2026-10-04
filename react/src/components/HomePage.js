import React from 'react'
import CustomNavbar from './Navbar'
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import './../App.css';

export default function HomePage (){



    return (
        <>
            <CustomNavbar/>
            <div className="main-intro-div">
                <a className="big-button" href="/galleries">Accéder aux galeries</a>
                <a className="big-button ytb-btn" href="https://www.youtube.com/@ponthe-ecoledesponts7542">Voir notre chaine Youtube</a>
                <a name="team"></a>
                <span className="team-down"><KeyboardDoubleArrowDownIcon/>Ponthé 028<KeyboardDoubleArrowDownIcon/></span>
            </div>
            <Container fluid>
                <Row>
                    <Col xs="12" sm="6" md="8" lg="8">
                        <img className="img-team" src="/static/assets/img/028_group.png"/>
                    </Col>
                    <Col xs="12" sm="6" md="4" lg="4">
                        <div className="team-desc">
                            <h2>L'équipe</h2>
                            <p>Présidente : Alice Dubreux</p>
                            <p>V-Prez Photo : Romain Soulabail</p>
                            <p>V-Prez Vidéo : Louis Cussoneau</p>
                            <p>Trez : Émilie Duccini</p>
                            <p>Respo Matos : Paul Lemeunier</p>
                            <p>Respo Galeries : Maxime Novo-Frelicot</p>
                            <p>Respo Comm : Vincent Huynh</p>
                            <p>Vidéastes : Océane Chia, Louis Laverrière, Clovis Vialard, Sophie Balmitgère</p>
                            <p>Photographes : Maxime Préel, Pétronille Sylvestre, Juliette Houriez, Mathilde David, Sélène Baudoux, Saül Buchwald, Lucie Agnese, Maxence Brechon</p>
                        </div>
                    </Col>
                </Row>

            </Container>
        </>
    )
}
