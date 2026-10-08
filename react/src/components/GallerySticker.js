import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const GallerySticker = (props) => {
    const compactClass = props.compact ? ' compact' : '';
    return(
            <div className={'gallery-sticker' + compactClass} onClick={(event) => props.modal_func(event, props.img)}>
                <img loading='lazy' className={'gallery-img' + compactClass} src={props.thumb} width="100%"/>
            </div>
    );
};

export default GallerySticker;
