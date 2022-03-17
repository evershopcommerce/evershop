/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
import PropTypes from 'prop-types';
import React from 'react';

function Area(props) {
  const {
    id, coreComponents, wrapperProps, noOuter, wrapper, className, components
  } = props;

  const areaComponents = (() => {
    const areaCoreComponents = coreComponents || [];
    const cs = components[id] === undefined
      ? areaCoreComponents
      : areaCoreComponents.concat(Object.values(components[id]));

    return cs.sort((obj1, obj2) => obj1.sortOrder - obj2.sortOrder);
  })();

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
  if (areaComponents.length === 0) return null;
  return (
    <WrapperComponent {...areaWrapperProps}>
      {areaComponents.map((w) => {
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
  wrapperProps: PropTypes.object,
  components: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string,
    components: PropTypes.node,
    sortOrder: PropTypes.number
  }))
};

Area.defaultProps = {
  className: undefined,
  coreComponents: [],
  noOuter: false,
  wrapper: 'div',
  wrapperProps: {},
  components: {}
};

export default Area;
