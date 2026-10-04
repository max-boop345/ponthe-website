import React, {useState, useEffect, useRef} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Cookies from 'js-cookie';
import GalleryLink from './GalleryLink';
import CustomNavbar from './Navbar'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TextField, Button, Stack, Select, MenuItem } from '@mui/material';

export default function Gallery(){
    const [addModalState, setaddModalState] = useState(false);
    const [galleriesComp, setGalleriesComp] = useState([]);

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [visibility, setVisibility] = useState('privée')
    const [type, setType] = useState('photo')
    const [view, setView] = useState('galerie')
    const [error, setError] = useState('')

    const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
      };

      const openModal = () => {
        setaddModalState(true)
      };

      const closeModal = () => {
        setaddModalState(false)
      };

      const onSubmit = () => {
        const submitOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': Cookies.get('csrftoken') },
            body: JSON.stringify({name: name, description: description, visibility: visibility,  type: type, view: view})
        };
        fetch('/api/galleries/create/', submitOptions)
              .then(res => res.json())
              .then(
                (result) => {
                  if(result.name == undefined)
                    setError('Une erreur inconnue est survenue')
                  if(result.status != undefined && result.status == 'error'){
                    setError(result.message)
                  }else
                    window.location.reload(false)
                },
                (error) => {
                  console.log(error)
                }
              );
      }
    useEffect(() => {
        let galleriesTemp = []
        let compTemp = []
        fetch('/api/get_view', requestOptions)
              .then(res => res.json())
              .then(
                (result) => {
                  for(const pic in result){
                    galleriesTemp.push(result[pic])
                  }
                  galleriesTemp.forEach((gal, index) =>{
                    compTemp.push(<GalleryLink key={gal.slug} link={'/gestion/gallery/' + gal.slug} sticker={gal.sticker_url} title={gal.name}/>)
                  })
                  setGalleriesComp(compTemp)
                },
                (error) => {
                  console.log(error)
                }
              );
      }, [])


      const ref = useRef(null);
      const ref2 = useRef(null);

        /*  useEffect(() => {
            const handleClickOutside = (event) => {
              if (ref.current && !ref.current.contains(event.target)
                 && ref2.current && !ref2.current.contains(event.target)) {
                closeModal()
              }
            };
            document.addEventListener('click', handleClickOutside, true);
            return () => {
              document.removeEventListener('click', handleClickOutside, true);
            };
          },[]);*/

    return(
      <>
        <CustomNavbar/>
        <div className="introductive-content">
          <Stack direction="row" alignItems="center" gap={1}>
            <span className='centered-button'><AddCircleOutlineIcon className="add-icon" onClick={openModal}/></span>
          </Stack>
        </div>
        <Container fluid>
          <Row className='g-1'>
              {galleriesComp}
          </Row>
        </Container>
        {addModalState && (
          <div className='pic-modal'>
            <div ref={ref} className='add-modal-content'>
            <span className='close-white-modal' onClick={closeModal}>&times;</span>
              <form ref={ref2} onSubmit={onSubmit}>
                <TextField className="add-modal-textfield" color='secondary' value={name} type="text" label="Nom" onChange={e =>  setName(e.target.value)} fullWidth/>
                <TextField className="add-modal-textfield" color='secondary' value={description} type="text" label="Description" onChange={e =>  setDescription(e.target.value)} fullWidth/>
                <Select className="add-modal-textfield" value={visibility} onChange={e => setVisibility(e.target.value)} label="Visiblité" fullWidth >
                  <MenuItem value={'privée'}>Privée</MenuItem>
                  <MenuItem value={'école'}>École</MenuItem>
                  <MenuItem value={'publique'}>Publique</MenuItem>
                </Select>
                <Select className="add-modal-textfield" value={type} onChange={e => setType(e.target.value)} label="Type" fullWidth >
                  <MenuItem value={'photo'}>Photo</MenuItem>
                  <MenuItem value={'video'}>Vidéo</MenuItem>
                </Select>
                <Select className="add-modal-textfield" value={view} onChange={e => setView(e.target.value)} label="Type" fullWidth >
                  <MenuItem value={'galerie'}>Galerie</MenuItem>
                  <MenuItem value={'exposition'}>Exposition</MenuItem>
                </Select>
                <p style={{color: 'red'}}>{error}</p>
                <Button className="add-modal-create-button" variant='outlined' color='secondary' onClick={onSubmit} fullWidth>Créer</Button>
              </form>
            </div>
          </div>
          )
        }
      </>
    )
}
