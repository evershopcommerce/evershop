import React from "react";
import { useAppState } from "../../../context/app";
import { get } from "../../../util/get";
import { Input } from "../../form/fields/Input";

export default function BasicColumnHeader({ title, id }) {
    const filterInput = React.useRef(null);
    const context = useAppState();

    const onKeyPress = (e) => {
        let url = new URL(document.location);
        if (e.key === "Enter") {
            if (e.target.value === "")
                url.searchParams.delete(id);
            else
                url.searchParams.set(id, e.target.value);
            window.location.href = url.href;
        }
    };

    React.useEffect(() => {
        filterInput.current.value = get(context, `grid.currentFilter.${id}`, "");
    }, []);

    return <th className={"column"}>
        <div className="table-header id-header">
            <div className={"title"} style={{ marginBottom: '1rem' }}><span>{title}</span></div>
            <div className={"filter"}>
                <Input
                    ref={filterInput}
                    onKeyPress={(e) => onKeyPress(e)}
                    placeholder={title}
                />
            </div>
        </div>
    </th>;
}