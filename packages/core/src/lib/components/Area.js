/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '../context/app';

function Area(props) {
  const {
    id, coreComponents, wrapperProps, noOuter, wrapper, className
  } = props;

  const getComponents = (contextComponents = {}) => {
    const areaCoreComponents = coreComponents || [];
    const components = contextComponents[id] === undefined
      ? areaCoreComponents
      : areaCoreComponents.concat(Object.values(contextComponents[id]));

    return components.sort((obj1, obj2) => obj1.sortOrder - obj2.sortOrder);
  };
  const context = useAppState();
  const components = getComponents(context.components);

  // eslint-disable-next-line no-nested-ternary
  const WrapperComponent = noOuter !== true ? (wrapper !== undefined ? wrapper : 'div') : React.Fragment;

  let areaWrapperProps = {};
  if (noOuter === true) {
    areaWrapperProps = {};
  } else if (typeof wrapperProps === 'object' && wrapperProps !== null) {
    areaWrapperProps = { className: className || '', ...wrapperProps };
  } else {
    areaWrapperProps = { className: className || '' };
  }

  if (components.length === 0) return null;

  return (
    <WrapperComponent {...areaWrapperProps}>
      {components.map((w) => {
        console.log(w.id);
        const C = w.component.default;
        if (typeof C === 'string') return <C key={w.id} {...w.props} />;
        return <C key={w.id} {...w.props} areaProps={props} />;
      })}
    </WrapperComponent>
  );
}

Area.propTypes = {
  className: PropTypes.string,
  coreComponents: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    sortOrder: PropTypes.number,
    component: PropTypes.shape({
      default: PropTypes.elementType
    })
  })),
  id: PropTypes.string.isRequired,
  noOuter: PropTypes.bool,
  wrapper: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  // eslint-disable-next-line react/forbid-prop-types
  wrapperProps: PropTypes.object
};

Area.defaultProps = {
  className: undefined,
  coreComponents: [],
  noOuter: false,
  wrapper: 'div',
  wrapperProps: {}
};

export default Area;
