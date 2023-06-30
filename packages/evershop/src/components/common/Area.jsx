/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
import { useAppState } from '@components/common/context/app';
import PropTypes from 'prop-types';
import React from 'react';

const getAreaComponents = ({id, coreComponents, components}) => {
  const areaCoreComponents = coreComponents || [];
  const cs = components[id] ? areaCoreComponents.concat(Object.values(components[id])) : areaCoreComponents;

  return cs.sort((obj1, obj2) => obj1.sortOrder - obj2.sortOrder);
}
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

  const areaComponents = getAreaComponents({id, coreComponents, components});

  // eslint-disable-next-line no-nested-ternary
  const WrapperComponent = noOuter ? React.Fragment : wrapper ?? 'div';

  let areaWrapperProps;
  if (noOuter) {
    areaWrapperProps = {};
  } else if (wrapperProps && typeof wrapperProps === 'object') {
    areaWrapperProps = {
      className: className || '', 
      ...wrapperProps 
    };
  } else {
    areaWrapperProps = { className: className || '' };
  }

  const {propsMap, graphqlResponse: propsData} = useAppState();

  return (
    <WrapperComponent {...areaWrapperProps}>
      {areaComponents.map((comp) => {
        const {
          component,
          id: compId,
          props: compProps
        } = comp ?? {};

        const {
          default: Component
        } = component ?? {};

        const propKeys = propsMap[compId] || [];

        const componentProps = propKeys.reduce((acc, map) => {
          const { origin, alias } = map;
          acc[origin] = propsData[alias];
          return acc;
        }, {});

        if (compProps) {
          Object.assign(componentProps, compProps);
        }

        return <Component 
          {...componentProps} 
          areaProps={typeof C === 'string' ? undefined :  props} 
          key={`component-${compId}`} 
        />;
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
  wrapperProps: PropTypes.shape({}),
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
