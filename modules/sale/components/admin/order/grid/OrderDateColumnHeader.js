import React from "react";
import { Date } from "../../../../../../lib/components/form/fields/Date";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { DateTime } from "luxon";

export default function FromToColumnHeader({ title, id }) {
    const filterFrom = React.useRef(null);
    const filterTo = React.useRef(null);
    const context = useAppState();

    const onChange = () => {
        let url = new URL(document.location);
        if (filterTo.current.value === "" && filterFrom.current.value === "")
            url.searchParams.delete(id);
        else {
            let form = DateTime.fromISO(filterFrom.current.value).toFormat("D").toString();
            let to = DateTime.fromISO(filterTo.current.value).toFormat("D").toString();
            url.searchParams.set(id, `${form}-${to}`);
        }
        window.location.href = url.href;
    };

    React.useEffect(() => {
        let form = DateTime.fromISO(get(context, `grid.currentFilter.${id}.from`, "")).isValid ?
            DateTime.fromISO(get(context, `grid.currentFilter.${id}.from`, "")).toFormat("yyyy-MM-dd").toString() :
            '';
        let to = DateTime.fromISO(get(context, `grid.currentFilter.${id}.to`, "")).isValid ?
            DateTime.fromISO(get(context, `grid.currentFilter.${id}.to`, "")).toFormat("yyyy-MM-dd").toString() :
            "";
        filterFrom.current.value = form;
        filterTo.current.value = to;
    }, []);

    return <th>
        <div className="table-header price-header">
            <div className={"title"} style={{ marginBottom: '1rem' }}><span>{title}</span></div>
            <div className={"flex space-x-1"}>
                <div style={{ width: '10rem' }}>
                    <Date
                        ref={filterFrom}
                        onChange={(e) => onChange(e)}
                        placeholder={"From"}
                        className="form-control"
                    />
                </div>
                <div style={{ width: '10rem' }}>
                    <Date
                        ref={filterTo}
                        onChange={(e) => onChange(e)}
                        placeholder={"To"}
                        className="form-control"
                    />
                </div>
            </div>
        </div>
    </th>;
}