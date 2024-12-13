import PropTypes from 'prop-types';

RenderIfTrue.propTypes = {
  condition: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired
};

export default function RenderIfTrue({ condition, children }) {
  return condition ? children : null;
}
