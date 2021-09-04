import React, { createRef, useRef, useState } from "react";
import Dot from "../../../../../lib/components/Dot";
import { Input } from "../../../../../lib/components/form/fields/Input";
import { get } from "../../../../../lib/util/get";

const NoResult = ({ keyword, resourseLinks = [] }) => {
    return <div className='no-result items-center text-center'>
        <h3>No results for "{keyword}"</h3>
        <div>TRY OTHER RESOURCES</div>
        <div className='grid grid-cols-2 mt-1'>
            {resourseLinks.map((link, index) => {
                return <div key={index} className='flex space-x-1 justify-center items-center'>
                    <Dot variant='info' />
                    <a href={link.url} className='text-divider hover:underline'>{link.name}</a>
                </div>
            })}
        </div>
    </div>
}

const Results = ({ keyword, results = [] }) => {
    return <div className='results'>
        <h3>Results for "{keyword}"</h3>
        <div className='item-list'>
            {results.map((category, index) => {
                return <div key={index} className='item-category flex flex-col space-x-1'>
                    <div className='result-category'>{category.name}</div>
                    {category.items.map((item, key) => {
                        return <a href={item.url} key={key}>
                            <div className='font-bold'>{item.name}</div>
                            <div>{item.description}</div>
                        </a>
                    })}
                </div>
            })}
        </div>
    </div>
}

const useClickOutside = (ref, callback) => {
    const handleClick = e => {
        if (ref.current && !ref.current.contains(e.target)) {
            callback();
        }
    };
    React.useEffect(() => {
        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        };
    });
};

export default function SearchBox({ searchAPI, resourceLinks }) {
    const InputRef = useRef();
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [typeTimeout, setTypeTimeout] = React.useState(null);

    const clickRef = React.useRef();
    const onClickOutside = () => {
        if (InputRef.current === document.activeElement) {
            return
        } else
            setShowResult(false);
    }
    useClickOutside(clickRef, onClickOutside);

    const search = () => {
        setLoading(true);
        if (typeTimeout) clearTimeout(typeTimeout);
        setTypeTimeout(setTimeout(() => {
            let url = new URL(searchAPI, window.location.origin);
            url.searchParams.set('keyword', InputRef.current.value);

            fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    }
                }
            ).then(response => {
                if (!response.headers.get("content-type") || !response.headers.get("content-type").includes("application/json"))
                    throw new TypeError("Something wrong. Please try again");

                return response.json();
            })
                .then(response => {
                    if (get(response, "success") === true) {
                        setResults(get(response, 'data.payload', []));
                    }
                    else {
                        setResults([]);
                    }
                })
                .catch(
                    error => {
                        //toast.error(get(error, "message", "Failed!"));
                    }
                )
                .finally(() => {
                    //e.target.value = null
                    setLoading(false)
                });
        }, 1500));
    };

    return <div className='search-box'>
        <Input
            prefix={<svg xmlns="http://www.w3.org/2000/svg" style={{ width: '1.8rem', height: '1.8rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>}
            placeholder="Search"
            ref={InputRef}
            onChange={() => search()}
            onFocus={() => { setShowResult(true) }}
        />
        {showResult === true && <div className='search-result' ref={clickRef}>
            {loading === true && <div className='loading'>
                <svg style={{ background: 'rgb(255, 255, 255, 0)', display: 'block', shapeRendering: 'auto' }} width="2rem" height="2rem" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
                    <circle cx="50" cy="50" fill="none" stroke="var(--primary)" strokeWidth="10" r="43" strokeDasharray="202.63272615654165 69.54424205218055">
                        <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1"></animateTransform>
                    </circle>
                </svg>
            </div>}
            {(!InputRef.current.value) && <div className='text-center'><span>Search for products, order and other resources</span></div>}
            {(results.length === 0 && InputRef.current.value && loading === false) && <NoResult keyword={InputRef.current && InputRef.current.value} resourseLinks={resourceLinks} />}
            {results.length > 0 && <Results keyword={InputRef.current && InputRef.current.value} results={results} />}
        </div>}
    </div>;
}