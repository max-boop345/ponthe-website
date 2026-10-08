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
import GallerySticker from './GallerySticker'
import Cookies from 'js-cookie';
import CustomNavbar from './Navbar';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import {Stack, Select, MenuItem} from '@mui/material';

export default function Gallery({props}){

    //Modal open state
    const [state, setState] = useState(false);
    //Current loaded picture in modal
    const [current, setCurrent] = useState(null);
    const [picsData, setPicsData] = useState([]);
    const [pics, setPics] = useState([]);
    const [name, setName] = useState('');
    const [addModalState, setaddModalState] = useState(false);
    const [visibility, setVisibility] = useState('privée');
    const [view, setView] = useState('gallery');
    const [uploadError, setUploadError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isCompact, setIsCompact] = useState(false);

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
      setUploadError('');
      setSelectedFile(null);
      setaddModalState(true)
    }

    const closeAddModal = () => {
      setaddModalState(false)
    }

    const handleUpload = async (e) => {
      e.preventDefault();
      setUploadError('');

      if (!selectedFile) {
        setUploadError('Veuillez sélectionner un fichier .zip.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('zipfile', selectedFile);

      try {
        const response = await fetch('/gestion/gallery/' + gallery_slug, {
          method: 'POST',
          headers: {
            'X-CSRFToken': Cookies.get('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: formData,
        });

        let data = {};
        try {
          data = await response.json();
        } catch (parseError) {
          // Réponse non JSON (page d'erreur d'un proxy, ...) : data reste vide
        }

        if (!response.ok || data.status === 'error') {
          setUploadError(data.message || 'Une erreur est survenue lors de l\'envoi.');
        } else {
          // Succès : fermer le modal et recharger la page
          closeAddModal();
          window.location.reload(false);
        }
      } catch (err) {
        console.log(err)
        setUploadError('Erreur réseau : impossible de contacter le serveur.');
      } finally {
        setUploading(false);
      }
    };

    const toggleCompact = () => {
      setIsCompact(prev => !prev);
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
      let picsTemp = []
      fetch('/api/gallery/pics/', requestOptions)
      .then(res => res.json())
      .then(
        (result) => {
          for(const pic in result){
            picsTemp.push(result[pic].link + '/uploads/' + result[pic].file_full_name)
          }
          setPicsData(result)
          setPics(picsTemp)
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
    return (
      <>
      <CustomNavbar/>
      <div className="introductive-content">
        <h1 className="gallery-title">{name}</h1>
          <Stack direction="row" alignItems="center" gap={1}>
            <span className='centered-button'>
              <AddCircleOutlineIcon className="icon" onClick={openAddModal}/>
              <DeleteIcon onClick={deleteGallery} className="icon"/>
              {isCompact
                ? <ZoomInIcon className="icon" onClick={toggleCompact} titleAccess="Vue normale"/>
                : <ZoomOutIcon className="icon" onClick={toggleCompact} titleAccess="Vue dézoomée"/>
              }
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
            {picsData.map((pic, index) => (
              <Col key={index} xs={isCompact ? "3" : "4"} sm={isCompact ? "2" : "3"} lg={isCompact ? "1" : "2"}>
                <GallerySticker img={pic.link + '/uploads/' + pic.file_full_name}
                                thumb={pic.link + '/thumbnails/' + pic.file_full_name}
                                modal_func={toggleModal}
                                compact={isCompact}/>
              </Col>
            ))}
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
              <form className="post-form" onSubmit={handleUpload}>
                  <input
                    type='file'
                    name='zipfile'
                    accept='.zip'
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  />
                  {uploadError && <p className="upload-error" role="alert">{uploadError}</p>}
                  <button
                    type="submit"
                    className="login-button"
                    disabled={uploading}
                  >
                    {uploading ? 'Envoi en cours...' : "Lancer l'envoi"}
                  </button>
                </form>
            </div>
          </div>
          )
        }
      </>


      );
    }
