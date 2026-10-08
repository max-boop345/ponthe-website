import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

const CustomNavbar = ({props}) => {
    return (
        <Navbar collapseOnSelect expand="lg" data-bs-theme="dark" className='c-nav'>
          <Container>
            <Navbar.Brand href="/">
                <img src="/static/assets/img/logo-ponthe.png" height="40px"/>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="me-auto justify-content-center">
                <a className="nav-text" href="/galleries">Galeries</a>
                <a className="nav-text" href="/expositions">Expositions</a>
                <a className="nav-text" href="/#team">Équipe</a>
                <a className="nav-text" href="/material">Matériel</a>
                {is_staff && (<a className="nav-text" href="/gestion">Gestion</a> )}
                {is_superuser && (<a className="nav-text" href="/admin">Admin</a> )}
              </Nav>
              <Nav>
                {!is_authenticated && (<a className="nav-text" href="/login">Connexion</a> )}
                {is_authenticated && (<a className="nav-text" href="/logout">Déconnexion</a> )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      );
    }
export default CustomNavbar;