import React, {useState} from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Col from 'react-bootstrap/Col';

const GalleryLink = (props) => {
    return(
        <>
          <Col xs="6" md="4" lg="3">
          <div className='img-foreground'>
              <a href={props.link}>
                <img className='galleries-img' src={props.sticker} width="100%"/>
                <div className='img-legend'>
                  <h3 className='img-legend-text'>{props.title}</h3>
                </div>
              </a>
            </div>
          </Col>
        </>
    );
};

export default GalleryLink;