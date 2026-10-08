import React, {useState, useEffect, useRef} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import FlagIcon from '@mui/icons-material/Flag';
import ReportList from './ReportList';
import GallerySticker from './GallerySticker'
import Cookies from 'js-cookie';
import CustomNavbar from './Navbar';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {Stack, Select, MenuItem} from '@mui/material';

export default function Gallery({props}){

    //Modal open state
    const [state, setState] = useState(false);
    //Current loaded picture in modal
    const [current, setCurrent] = useState(null);
    const [picsList, setPicsList] = useState([]);
    const [pics, setPics] = useState([]);
    const [name, setName] = useState('');
    const [addModalState, setaddModalState] = useState(false);
    const [visibility, setVisibility] = useState('privée');
    const [view, setView] = useState('gallery');
    //Reports received state
    const [reports, setReports] = useState(null);

    const cookie = Cookies.get('csrftoken')

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': Cookies.get('csrftoken') },
      body: JSON.stringify({ slug: gallery_slug })
    };

    //Open image in full screen when vignette is clicked
    const toggleModal = (e, img) => {
      setCurrent(img)
      setState(true)
    };

    //Close image modal
    const closeModal = () => {
      setState(false)
    };

    const openAddModal = () => {
      setaddModalState(true)
    }

    const closeAddModal = () => {
      setaddModalState(false)
    }

    //Goto next picture in modal
    const nextPicture = () => {
      console.log(pics)
      let nextId = pics.indexOf(current)+1;
      if(nextId == pics.length) nextId = 0
      setCurrent(pics[nextId]);
    };

    const deleteCurrent = () => {
      const array = current.split('/')
      const deleteOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ name: name, file_full_name: array[array.length-1] })
      };
      fetch('/api/gallery/pics/delete/', deleteOptions)
            .then(res => res.json())
            .then(
              (result) => {
                window.location.reload(false)
              },
              (error) => {
                console.log(error)
              }
            );
    };

    const deleteGallery = () => {
      if (!window.confirm('Supprimer la galerie « ' + name + ' » et toutes ses photos ?')) return
      const deleteOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ name: name})
      };
      fetch('/api/gallery/delete/', deleteOptions)
            .then(res => res.json())
            .then(
              (result) => {
                window.location.href = '/gestion/'
              },
              (error) => {
                console.log(error)
              }
            );
    };
    //Goto previous picture in modal
    const previousPicture = () => {
      let nextId = pics.indexOf(current)-1;
      if(nextId == -1) nextId = pics.length-1
      setCurrent(pics[nextId]);
    };

    useEffect(() => {
      let picsDiv = []
      let picsTemp = []
      fetch('/api/gallery/pics/', requestOptions)
      .then(res => res.json())
      .then(
        (result) => {
          for(const pic in result){
            picsTemp.push(result[pic].link + '/uploads/' + result[pic].file_full_name)
            picsDiv.push(
            <Col key={pic} xs="4" sm="3" lg="2">
              <GallerySticker img={result[pic].link + '/uploads/' + result[pic].file_full_name}
                              thumb={result[pic].link + '/thumbnails/' + result[pic].file_full_name}
                              modal_func={toggleModal}/>
            </Col>
            )
          }
          setPicsList(picsDiv)
          setPics(picsTemp)
          console.log(pics)
        },
        (error) => {
          console.log(error)
        }
      );
      fetch('/api/gallery/', requestOptions)
            .then(res => res.json())
            .then(
                (result) => {
                  setName(result.name)
                  setVisibility(result.visibility)
                  setView(result.view)
                },
                (error) => {
                  console.log(error)
                }
              );

    }, [])


    const ref = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null)
    const ref4 = useRef(null)
    const ref5 = useRef(null)

          useEffect(() => {
            const handleClickOutside = (event) => {
              if (ref.current && !ref.current.contains(event.target)
                && ref2.current && !ref2.current.contains(event.target)
                && ref3.current && !ref3.current.contains(event.target)
                && ref4.current && !ref4.current.contains(event.target)
                && ref5.current && !ref5.current.contains(event.target)) {
                closeModal()
              }
            };
            document.addEventListener('click', handleClickOutside, true);
            return () => {
              document.removeEventListener('click', handleClickOutside, true);
            };
          },[]);


    const changeVisibility = (visibility) => {
      const visibilityOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, visibility: visibility})
      };

      fetch('/api/gallery/change_visibility/', visibilityOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setVisibility(result.visibility)
              },
              (error) => {
                console.log(error)
              }
          );
    }

    const changeView = (view) => {
      const visibilityOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, view: view})
      };

      fetch('/api/gallery/change_view/', visibilityOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setVisibility(result.visibility)
              },
              (error) => {
                console.log(error)
              }
          );
    }

    const loadReports = () => {
      const reportOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug })
      };
      fetch('/api/gallery/reports/', reportOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setReports(result)
              },
              (error) => {
                console.log(error)
              }
            );
    }
    return (
      <>
      <CustomNavbar/>
      <div className="introductive-content">
        <h1 className="gallery-title">{name}</h1>
          <Stack direction="row" alignItems="center" gap={1}>
            <span className='centered-button'>
              <AddCircleOutlineIcon className="icon" onClick={openAddModal}/>
              <DeleteIcon onClick={deleteGallery} className="icon"/>
              <FlagIcon onClick={loadReports} className="icon" titleAccess="Signalements"/>
              <Select style={{padding:0, height: "40px"}}value={visibility} onChange={e =>
              {
                setVisibility(e.target.value)
                changeVisibility(e.target.value)
              }} label="Visiblité">
                  <MenuItem value={'privée'}>Privée</MenuItem>
                  <MenuItem value={'école'}>École</MenuItem>
                  <MenuItem value={'publique'}>Publique</MenuItem>
                </Select>
                <Select style={{padding:0, height: "40px"}}value={view} onChange={e =>
              {
                setView(e.target.value)
                changeView(e.target.value)
              }} label="Visiblité">
                  <MenuItem value={'galerie'}>Galerie</MenuItem>
                  <MenuItem value={'exposition'}>Exposition</MenuItem>
                </Select>
              </span>
          </Stack>
        </div>
        <Container fluid>
          <Row className='g-1'>
            {picsList}
          </Row>
        </Container>

        {state && (
          <div className='pic-modal'>
            <ArrowBackIcon ref={ref2} onClick={previousPicture} className='arrow left-arrow'/>
            <ArrowForwardIcon ref={ref3} onClick={nextPicture} className='arrow right-arrow'/>
            <div className="pic-modal-nav">
              <span className='close' onClick={closeModal}>&times;</span>
              <a href={current} download={current}><span ref={ref4}><DownloadIcon className="download"/></span></a>
              <span ref={ref5}><DeleteIcon onClick={deleteCurrent} className="download" /></span>
            </div>
            <div className='pic-modal-content'>
              <div ref={ref} className="img-browser">
                <img src={current} className='img-modal'/>
              </div>
            </div>
          </div>
          )
        }

        {addModalState && (
          <div className='pic-modal'>
            <div ref={ref} className='add-modal-content'>
              <span className='close-white-modal' onClick={closeAddModal}>&times;</span>
              <form method="POST" class="post-form" enctype="multipart/form-data">
                  <input type="hidden" name="csrfmiddlewaretoken" value={cookie} />
                  <input type='file' name='zipfile'/>
                  <button type="submit" className="login-button">Lancer l'envoi</button>
                </form>
            </div>
          </div>
          )
        }

        {reports !== null && (
          <div className='pic-modal'>
            <div ref={ref} className='add-modal-content'>
              <span className='close-white-modal' onClick={() => setReports(null)}>&times;</span>
              <h3>Signalements</h3>
              <ReportList reports={reports}/>
            </div>
          </div>
          )
        }
      </>


      );
    }
