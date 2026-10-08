import React, {useState, useEffect, useRef} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Cookies from 'js-cookie';
import CustomNavbar from './Navbar';
import PictureMosaic from './PictureMosaic';
import ChecklistIcon from '@mui/icons-material/Checklist';

export default function Gallery({props}){

    //Modal open state
    const [state, setState] = useState(false);
    //Current loaded picture in modal
    const [current, setCurrent] = useState(null);
    const [picsList, setPicsList] = useState([]);
    const [pics, setPics] = useState([]);
    const [name, setName] = useState('');
    const [result, setResult] = useState([]);
    //List of picture in the gallery
    // Mode sélection multiple
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState(new Set());

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

    //Goto next picture in modal
    const nextPicture = () => {
      console.log(pics)
      let nextId = pics.indexOf(current)+1;
      if(nextId == pics.length) nextId = 0
      setCurrent(pics[nextId]);
    };

    //Goto previous picture in modal
    const previousPicture = () => {
      let nextId = pics.indexOf(current)-1;
      if(nextId == -1) nextId = pics.length-1
      setCurrent(pics[nextId]);
    };

    //Enter/leave the multi-selection mode; leaving clears the selection
    const toggleSelectionMode = () => {
      setSelectionMode(prev => !prev);
      setSelected(new Set());
    };

    //Add/remove one picture from the selection
    const toggleSelect = (fileFullName) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(fileFullName)) {
          next.delete(fileFullName);
        } else {
          next.add(fileFullName);
        }
        return next;
      });
    };

    //Download the selection as a single zip built by the backend
    const downloadSelected = async () => {
      if (selected.size === 0) return;
      const downloadOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': Cookies.get('csrftoken') },
        body: JSON.stringify({ slug: gallery_slug, file_full_names: Array.from(selected) })
      };
      try {
        const response = await fetch('/api/gallery/pics/download/', downloadOptions);
        if (!response.ok) {
          alert('Impossible de télécharger les photos sélectionnées.');
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = gallery_slug + '-selection.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.log(err);
        alert('Erreur réseau : impossible de contacter le serveur.');
      }
    };

    useEffect(() => {
      let picsDiv = []
      let picsTemp = []
      fetch('/api/gallery/pics/', requestOptions)
            .then(res => res.json())
            .then(
              (result) => {
                setResult(result)
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

    useEffect(() => {
            const handleClickOutside = (event) => {
              if (ref.current && !ref.current.contains(event.target)
                && ref2.current && !ref2.current.contains(event.target)
                && ref3.current && !ref3.current.contains(event.target)
                && ref4.current && !ref4.current.contains(event.target)) {
                closeModal()
              }
            };
            document.addEventListener('click', handleClickOutside, true);
            return () => {
              document.removeEventListener('click', handleClickOutside, true);
            };
          },[]);

    return (
      <>
      <CustomNavbar/>
        <div className="introductive-content">
          <h2 className="gallery-title">{name}</h2>
          <ChecklistIcon className="select-toggle-icon" onClick={toggleSelectionMode}
            titleAccess={selectionMode ? 'Quitter le mode sélection' : 'Sélectionner des photos'}/>
        </div>
        {selectionMode && (
          <div className="selection-bar">
            <span>{selected.size} photo(s) sélectionnée(s)</span>
            <button type="button" className="login-button" onClick={downloadSelected}
              disabled={selected.size === 0}>
              Télécharger la sélection
            </button>
          </div>
        )}
        <PictureMosaic result={result} selectionMode={selectionMode}
          selected={selected} onToggleSelect={toggleSelect}/>
      </>


      );
    }
