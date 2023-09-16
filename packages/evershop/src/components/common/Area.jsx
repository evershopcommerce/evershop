/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
import PropTypes from 'prop-types';
import React from 'react';
import { useAppState } from '@components/common/context/app';

function Area(props) {
  const {
    id,
    coreComponents,
    wrapperProps,
    noOuter,
    wrapper,
    className,
    components
  } = props;

  const areaComponents = (() => {
    const areaCoreComponents = coreComponents || [];
    const cs =
      components[id] === undefined
        ? areaCoreComponents
        : areaCoreComponents.concat(Object.values(components[id]));

    return cs.sort((obj1, obj2) => obj1.sortOrder - obj2.sortOrder);
  })();

  let WrapperComponent = React.Fragment;
  if (noOuter !== true) {
    if (wrapper !== undefined) {
      WrapperComponent = wrapper;
    } else {
      WrapperComponent = 'div';
    }
  }

  let areaWrapperProps = {};
  if (noOuter === true) {
    areaWrapperProps = {};
  } else if (typeof wrapperProps === 'object' && wrapperProps !== null) {
    areaWrapperProps = { className: className || '', ...wrapperProps };
  } else {
    areaWrapperProps = { className: className || '' };
  }

  const context = useAppState();

  return (
    <WrapperComponent {...areaWrapperProps}>
      {areaComponents.map((w, index) => {
        const C = w.component.default;
        // eslint-disable-next-line no-shadow
        const { id } = w;
        const { propsMap } = context;
        const propsData = context.graphqlResponse;
        const propKeys = propsMap[id] || [];
        const componentProps = propKeys.reduce((acc, map) => {
          const { origin, alias } = map;
          acc[origin] = propsData[alias];
          return acc;
        }, {});
        if (w.props) {
          Object.assign(componentProps, w.props);
        }
        // Check if C is a React component
        if (React.isValidElement(C)) {
          return C;
        }

        if (typeof C === 'string') {
          // eslint-disable-next-line react/no-array-index-key
          return <C key={index} {...componentProps} />;
        }

        // eslint-disable-next-line react/no-array-index-key
        return <C key={index} areaProps={props} {...componentProps} />;
      })}
    </WrapperComponent>
  );
}

Area.propTypes = {
  className: PropTypes.string,
  coreComponents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      sortOrder: PropTypes.number,
      component: PropTypes.shape({
        default: PropTypes.elementType
      })
    })
  ),
  id: PropTypes.string.isRequired,
  noOuter: PropTypes.bool,
  wrapper: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
  // eslint-disable-next-line react/forbid-prop-types
  wrapperProps: PropTypes.object,
  components: PropTypes.shape({}).isRequired
};

Area.defaultProps = {
  className: undefined,
  coreComponents: [],
  noOuter: false,
  wrapper: 'div',
  wrapperProps: {}
};

export default Area;
