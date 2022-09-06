import PropTypes from "prop-types"
import React from 'react';

export default function Films({ allFilms: { films } }) {
  return <div>
    <h1>All Films</h1>
    <ul>
      {
        films.map((film) => <li key={film.id}>
          <h2>{film.title}</h2>
          <p>{film.director}</p>
        </li>)
      }
    </ul>
  </div>;
}

Films.propTypes = {
  films: PropTypes.any
}

export const layout = {
  areaId: "content",
  sortOrder: 1
}

export const query = `
  query {
    categories {
      name
      id
    }
  }
`;
