import React from "react";
import { appContext } from "../context/app";

function Area(props) {
    const getWidgets = (widgets = {}) => {
        let coreWidgets = props.coreWidgets ? props.coreWidgets : [];
        let _widgets = widgets[props.id] === undefined ? coreWidgets : coreWidgets.concat(Object.values(widgets[props.id]));

        return _widgets.sort(function (obj1, obj2) {
            return obj1.sortOrder - obj2.sortOrder;
        });
    };
    const W = React.useContext(appContext);
    const widgets = getWidgets(W.data.widgets);
    //const templateDebugMode = ReactRedux.useSelector(state => _.get(state, 'appState.template_debug_mode', 0));

    let Wrapper$Component = props.noOuter !== true ? (props.wrapper !== undefined ? props.wrapper : "div") : React.Fragment;

    let wrapperProps = {};
    if (typeof props.wrapperProps === 'object' && props.wrapperProps !== null)
        wrapperProps = { className: props.className ? props.className : "", ...props.wrapperProps };
    else if (props.noOuter === true)
        wrapperProps = {};
    else
        wrapperProps = { className: props.className ? props.className : "" };

    if (widgets.length === 0)
        return null;

    //if(parseInt(templateDebugMode) === 1)
    //    wrapperProps["className"] = wrapperProps.className += " debug-mode";

    return <Wrapper$Component {...wrapperProps}>
        {widgets.map((w) => {
            let C;
            C = w.component["default"];
            if (typeof C === 'string')
                return <C key={w.id} {...w.props} />;
            return <C key={w.id} {...w.props} areaProps={props} />;
        })}
    </Wrapper$Component>;
}

export default Area