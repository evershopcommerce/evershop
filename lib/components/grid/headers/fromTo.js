import React from "react";
import { appContext } from "../../../context/app";
import { get } from "../../../util/get";

export default function FromToColumnHeader({ title, id }) {
    const filterFrom = React.useRef(null);
    const filterTo = React.useRef(null);
    const context = React.useContext(appContext);

    const onKeyPress = (e) => {
        let url = new URL(document.location);
        if (e.key === "Enter") {
            if (filterTo.current.value === "" && filterFrom.current.value === "")
                url.searchParams.delete(id);
            else
                url.searchParams.set(id, `${filterFrom.current.value}-${filterTo.current.value}`);
            window.location.href = url.href;
        }
    };

    React.useEffect(() => {
        filterFrom.current.value = get(context, `data.grid.currentFilter.${id}.from`, "");
        filterTo.current.value = get(context, `data.grid.currentFilter.${id}.to`, "");
    }, []);

    return <th>
        <div className="table-header price-header">
            <div className={"title"}><span>{title}</span></div>
            <div className={"filter range"}>
                <div>
                    <input
                        type={"text"}
                        ref={filterFrom}
                        onKeyPress={(e) => onKeyPress(e)}
                        placeholder={"From"}
                        className="form-control"
                    />
                </div>
                <div>
                    <input
                        type={"text"}
                        ref={filterTo}
                        onKeyPress={(e) => onKeyPress(e)}
                        placeholder={"To"}
                        className="form-control"
                    />
                </div>
            </div>
        </div>
    </th>;
}