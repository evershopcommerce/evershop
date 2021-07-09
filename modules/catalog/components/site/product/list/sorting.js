import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

export default function Sorting() {
    // TODO: make this list configurable
    const sortingOptions = get(useAppState(), "sortingOptions", [{ code: "price", "name": "Price" }, { code: "name", "name": "Name" }]);
    const sortOrder = get(useAppState(), "sortOrder", "asc");
    const sortBy = get(useAppState(), "sortBy", "");
    const currentUrl = get(useAppState(), "currentUrl");

    const onChangeSort = (e) => {
        e.preventDefault();
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set("sortBy", e.target.value);
        window.location.href = url;
    };

    const onChangeDirection = (e) => {
        e.preventDefault();
        let url = new URL(currentUrl, window.location.origin);
        if (sortOrder === "asc") {
            url.searchParams.set("sortOrder", "desc");
            window.location.href = url;
        } else {
            url.searchParams.set("sortOrder", "asc");
            window.location.href = url;
        }
    };

    if (sortingOptions.length === 0)
        return (null);

    return <div className="product-sorting">
        <div className="product-sorting-inner d-flex justify-content-end">
            <div><span className="label">Sort By</span></div>
            <select
                className="form-control"
                onChange={(e) => onChangeSort(e)}
                value={sortBy}
            >
                <option value="" disabled={true}>Please select</option>
                {sortingOptions.map((s, i) => {
                    return <option value={s.code} key={i}>{s.name}</option>
                })}
            </select>
            <div className="sort-direction">
                <a onClick={(e) => onChangeDirection(e)} href={"#"}>
                    {sortOrder === "desc" ? (<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        className="feather feather-arrow-up">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className="feather feather-arrow-down">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>)}</a>
            </div>
        </div>
    </div>
}