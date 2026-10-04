import React, { useEffect, useState, useRef} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import GallerySticker from './GallerySticker'
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';

const PictureMosaic = (props) => {

    const [picsList, setPicsList] = useState([]);
    const [state, setState] = useState(false);
    //Current loaded picture in modal
    const [current, setCurrent] = useState(null);
    const [pics, setPics] = useState([]);

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
        let nextId = pics.indexOf(current) + 1;
        if (nextId == pics.length) nextId = 0
        setCurrent(pics[nextId]);
    };

    //Goto previous picture in modal
    const previousPicture = () => {
        let nextId = pics.indexOf(current) - 1;
        if (nextId == -1) nextId = pics.length - 1
        setCurrent(pics[nextId]);
    };

    // Swipe detection
    const [touchStart, setTouchStart] = useState(null)
    const [touchEnd, setTouchEnd] = useState(null)

    // the required distance between touchStart and touchEnd to be detected as a swipe
    const minSwipeDistance = 50

    const onTouchStart = (e) => {
        setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance
        if (isLeftSwipe){
        nextPicture()
        } else if (isRightSwipe){
        previousPicture()
        }
    }

    useEffect(() => {
        const picsTemp = []
        const picsDiv = []
        for (const pic in props.result) {
            picsTemp.push(props.result[pic].link + '/uploads/' + props.result[pic].file_full_name)
            picsDiv.push(
                <Col key={pic} xs="4" sm="3" lg="2">
                    <GallerySticker img={props.result[pic].link + '/uploads/' + props.result[pic].file_full_name}
                        thumb={props.result[pic].link + '/thumbnails/' + props.result[pic].file_full_name}
                        modal_func={toggleModal} />
                </Col>
            )
        }
        setPicsList(picsDiv)
        setPics(picsTemp)
    }, [props.result]);

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

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'ArrowRight') {
                nextPicture()
            } else if (event.key === 'ArrowLeft') {
                previousPicture()
            } else if (event.key === 'Escape') {
                closeModal()
            }
        }
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [current]);

    const ref = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null)
    const ref4 = useRef(null)

    return (
        <>
            <Container fluid>
                <Row className='g-1'>
                    {picsList}
                </Row>
            </Container>
            {state && (
                <div className='pic-modal'>
                    <ArrowBackIcon ref={ref2} onClick={previousPicture} className='arrow left-arrow' />
                    <ArrowForwardIcon ref={ref3} onClick={nextPicture} className='arrow right-arrow' />
                    <div className="pic-modal-nav">
                        <span className='close' onClick={closeModal}>&times;</span>
                        <a href={current} download={current}><span ref={ref4}><DownloadIcon className="download" /></span></a>
                    </div>
                    <div className='pic-modal-content' onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                        <div ref={ref} className="img-browser">
                            <img src={current} className='img-modal' />
                        </div>
                    </div>
                </div>
            )
            }
        </>
    );
};

export default PictureMosaic;