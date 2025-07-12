import { useAppState } from '@components/common/context/app.jsx';
import React from 'react';
import type { ElementType } from 'react';

interface Component {
  id?: string;
  sortOrder?: number;
  props?: Record<string, any>;
  component: {
    default: React.ElementType | React.ReactNode;
  };
}

type AreaID = string;
type ComponentID = string;

interface Components {
  [key: AreaID]: {
    [key: ComponentID]: Component;
  };
}

interface AreaProps {
  className?: string;
  coreComponents?: Component[];
  id: string;
  noOuter?: boolean;
  wrapper?: React.ReactNode | string;
  wrapperProps?: Record<string, any>;
  components?: Components;
}

interface Widget extends Component {
  props: Record<string, any>;
  type: string;
  areaId: string[];
}

function Area(props: AreaProps) {
  const context = useAppState();
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
    const widgets = context.widgets || [];
    const wildCardWidgets = components?.['*'] || {};
    const assignedWidgets: Component[] = [];

    widgets.forEach((widget: Widget) => {
      const w = wildCardWidgets[widget.type];
      if (widget.areaId.includes(id) && w !== undefined) {
        assignedWidgets.push({
          id: widget.id,
          sortOrder: widget.sortOrder,
          props: widget.props,
          component: w.component
        });
      }
    });
    const cs =
      components?.[id] === undefined
        ? areaCoreComponents.concat(assignedWidgets)
        : areaCoreComponents
            .concat(Object.values(components[id]))
            .concat(assignedWidgets);
    return cs.sort(
      (obj1, obj2) => (obj1.sortOrder || 0) - (obj2.sortOrder || 0)
    );
  })();
  const { propsMap } = context;
  let WrapperComponent: ElementType = React.Fragment;
  if (noOuter !== true) {
    if (wrapper !== undefined) {
      WrapperComponent = wrapper as ElementType;
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

  return (
    <WrapperComponent {...areaWrapperProps}>
      {areaComponents.map((w, index) => {
        const C = w.component.default;

        const { id } = w;
        const propsData = context.graphqlResponse;
        const propKeys = id !== undefined ? propsMap[id] || [] : [];

        const componentProps = propKeys.reduce(
          (acc: Record<string, any>, map: Record<string, any>) => {
            const { origin, alias } = map;
            acc[origin] = propsData[alias];
            return acc;
          },
          {}
        );
        if (w.props) {
          Object.assign(componentProps, w.props);
        }
        // Check if C is a React component
        if (React.isValidElement(C)) {
          return <React.Fragment key={index}>{C}</React.Fragment>;
        }

        if (typeof C === 'string') {
          return <C key={index} {...componentProps} />;
        }

        return typeof C === 'function' ? (
          <C key={index} areaProps={props} {...componentProps} />
        ) : null;
      })}
    </WrapperComponent>
  );
}

Area.defaultProps = {
  className: undefined,
  coreComponents: [],
  noOuter: false,
  wrapper: 'div',
  wrapperProps: {}
};

export { Area };
export default Area;
