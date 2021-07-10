import React from "react";
import { useAppState } from "../context/app";

function Area(props) {
    const getComponents = (widgets = {}) => {
        let coreComponents = props.coreComponents ? props.coreComponents : [];
        let _widgets = widgets[props.id] === undefined ? coreComponents : coreComponents.concat(Object.values(widgets[props.id]));

        return _widgets.sort(function (obj1, obj2) {
            return obj1.sortOrder - obj2.sortOrder;
        });
    };
    const context = useAppState();
    const components = getComponents(context.components);

    let Wrapper$Component = props.noOuter !== true ? (props.wrapper !== undefined ? props.wrapper : "div") : React.Fragment;

    let wrapperProps = {};
    if (typeof props.wrapperProps === 'object' && props.wrapperProps !== null)
        wrapperProps = { className: props.className ? props.className : "", ...props.wrapperProps };
    else if (props.noOuter === true)
        wrapperProps = {};
    else
        wrapperProps = { className: props.className ? props.className : "" };

    if (components.length === 0)
        return null;

    return <Wrapper$Component {...wrapperProps}>
        {components.map((w) => {
            let C;
            C = w.component["default"];
            if (typeof C === 'string')
                return <C key={w.id} {...w.props} />;
            return <C key={w.id} {...w.props} areaProps={props} />;
        })}
    </Wrapper$Component>;
}

export default Area