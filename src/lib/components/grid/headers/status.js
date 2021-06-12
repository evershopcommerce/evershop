import React from "react";
import { useAppState } from "../../../context/app";
import { get } from "../../../util/get";

export default function StatusColumnHeader({ title, id }) {
    const [current, setCurrent] = React.useState("");
    const context = useAppState();

    const onChange = (e) => {
        let url = new URL(document.location);
        if (e.target.value === "all")
            url.searchParams.delete(id);
        else
            url.searchParams.set(id, e.target.value);
        window.location.href = url.href;
    };

    React.useEffect(() => {
        setCurrent(get(context, `grid.currentFilter.${id}`, "all"));
    }, []);

    return <th className={"column"}>
        <div className="table-header status-header">
            <div className={"title"}><span>{title}</span></div>
            <div className={"filter"}>
                <select
                    onChange={(e) => onChange(e)}
                    className="form-control"
                    value={current}
                >
                    <option value={"all"}>All</option>
                    <option value={1}>Enabled</option>
                    <option value={0}>Disabled</option>
                </select>
            </div>
        </div>
    </th>;
}