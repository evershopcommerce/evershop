import PropTypes from 'prop-types';
import React from 'react';
import './Rating.scss';
import StartIcon from '@heroicons/react/solid/esm/StarIcon';

function Rating({ rating }) {
  return (
    <div>
      <div className="rating__stars">
        {[...Array(5)].map((_, i) => (
          <StartIcon
            width={20}
            height={20}
            key={i}
            fill={rating > i ? '#ff5501' : '#989898'}
          />
        ))}
      </div>
    </div>
  );
}

Rating.propTypes = {
  rating: PropTypes.number.isRequired
};

export default Rating;
