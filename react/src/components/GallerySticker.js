import React from 'react';
import './../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GallerySticker = (props) => {
    const compactClass = props.compact ? ' compact' : '';
    const selectedClass = props.selected ? ' selected' : '';
    const handleClick = (event) => {
      if (props.selectionMode) {
        props.onToggleSelect(props.fileFullName);
      } else {
        props.modal_func(event, props.img);
      }
    };
    return(
            <div className={'gallery-sticker' + compactClass + selectedClass} onClick={handleClick}>
                {props.selectionMode && (
                  <span className={'sticker-check' + (props.selected ? '' : ' sticker-check-off')}>
                    <CheckCircleIcon titleAccess={props.selected ? 'Sélectionnée' : 'Non sélectionnée'}/>
                  </span>
                )}
                <img loading='lazy' className={'gallery-img' + compactClass} src={props.thumb} width="100%"/>
            </div>
    );
};

export default GallerySticker;
