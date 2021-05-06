import React from "react";

export default function Pagination({ total, limit, currentPage, currentUrl }) {
    const [isOnEdit, setIsOnEdit] = React.useState(false);
    const [inputVal, setInPutVal] = React.useState(currentPage);

    React.useEffect(() => {
        setInPutVal(currentPage);
    }, [currentPage]);

    const onKeyPress = (e) => {
        if (e.which !== 13)
            return;
        e.preventDefault();
        let page = parseInt(e.target.value);
        if (page < 1) page = 1;
        if (page > Math.ceil(total / limit)) page = Math.ceil(total / limit);
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set('page', page);
        window.location.href = url;
        setIsOnEdit(false);
    };

    const onPrev = (e) => {
        e.preventDefault();
        let prev = currentPage - 1;
        if (currentPage === 1)
            return;
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set('page', prev);
        window.location.href = url;
    };

    const onNext = (e) => {
        e.preventDefault();
        let next = currentPage + 1;
        if (currentPage * limit >= total)
            return;
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set('page', next);
        window.location.href = url;
    };

    const onFirst = (e) => {
        e.preventDefault();
        if (currentPage === 1)
            return;
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set('page', 1);
        window.location.href = url;
    };

    const onLast = (e) => {
        e.preventDefault();
        if (currentPage === Math.ceil(total / limit))
            return;
        let url = new URL(currentUrl, window.location.origin);
        url.searchParams.set('page', Math.ceil(total / limit));
        window.location.href = url;
    };

    return <div className="products-pagination">
        <ul className="pagination">
            {currentPage > 1 && <li className="page-item prev"><a className={"page-link"} href={"#"} onClick={(e) => onPrev(e)}><span>Previous</span></a></li>}
            <li className="page-item first"><a className={"page-link"} href="#" onClick={(e) => onFirst(e)}>1</a></li>
            <li className="page-item current">
                {isOnEdit === false && <a className="page-link pagination-input-fake uk-input uk-form-small" href="#" onClick={(e) => { e.preventDefault(); setIsOnEdit(true) }}>{currentPage}</a>}
                {isOnEdit === true && <input className="page-link uk-input uk-form-small" value={inputVal} onChange={(e) => setInPutVal(e.target.value)} type="text" onKeyPress={(e) => onKeyPress(e)} />}
            </li>
            <li className="page-item last"><a className={"page-link"} href="#" onClick={(e) => onLast(e)}>{Math.ceil(total / limit)}</a></li>
            {(currentPage * limit) < total && <li className="page-item next"><a className={"page-link"} href={"#"} onClick={(e) => onNext(e)}><span>Next</span></a></li>}
        </ul>
    </div>
}