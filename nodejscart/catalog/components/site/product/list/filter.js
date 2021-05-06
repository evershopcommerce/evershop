import React from "react";
import Area from "../../../../../../lib/components/area";
import { appContext } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

function Price({ activeFilters, updateFilter, minPrice = 0, maxPrice = 0 }) {
    const firstRender = React.useRef(true);
    const [from, setFrom] = React.useState(() => {
        let index = activeFilters.findIndex(f => f.key === "price");
        if (index === -1)
            return minPrice;
        else {
            return activeFilters[index]["value"].split("-")[0] ? activeFilters[index]["value"].split("-")[0] : minPrice;
        }
    });
    const [to, setTo] = React.useState(() => {
        let index = activeFilters.findIndex(f => f.key === "price");
        if (index === -1)
            return maxPrice;
        else {
            return activeFilters[index]["value"].split("-")[1] ? activeFilters[index]["value"].split("-")[1] : maxPrice;
        }
    });
    const currency = "usd";
    const language = "en";
    React.useLayoutEffect(() => {
        const timeoutID = setTimeout(() => {
            if (firstRender.current) {
                firstRender.current = false;
                return;
            } else {
                let value = "";
                if (from === minPrice) value = `-${to}`;
                else if (to === maxPrice) value = `${from}-`;
                else value = `${from}-${to}`;
                let index = activeFilters.findIndex(f => f.key === "price");
                if (index === -1)
                    updateFilter(activeFilters.concat({ key: "price", value: value }));
                else
                    updateFilter(activeFilters.map(f => {
                        if (f.key !== "price")
                            return f;
                        else
                            return { key: "price", value: value };
                    }))
            }
        }, 1000);

        return () => clearTimeout(timeoutID);
    }, [from, to]);

    const onChange = (e, direction) => {
        e.persist();
        let value = e.target.value;
        if (direction === 'min') {
            if (value > to - 5)
                setFrom(to - 5);
            else
                setFrom(value);
        }

        if (direction === 'max') {
            if (value - 5 < from)
                setTo(from + 5);
            else
                setTo(value);
        }
    }

    const f = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(minPrice);
    const t = new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(maxPrice);

    return <div>
        <div><strong>Price</strong></div>
        <div className="rangeslider">
            <input
                className="min"
                type="range"
                min={minPrice}
                max={maxPrice}
                value={from}
                onChange={(e) => onChange(e, "min")}
            />
            <input
                className="max"
                type="range"
                min={minPrice}
                max={maxPrice}
                value={to}
                onChange={(e) => onChange(e, "max")}
            />
            <span className="range_min light left">{from}</span>
            <span className="range_max light right">{to}</span>
        </div>
    </div>
}

function Attributes({ activeFilters, attributes, updateFilter }) {
    const onChange = (e, attributeCode, optionId) => {
        if (e.target.checked === false) {
            updateFilter(activeFilters.filter(f => f.key !== attributeCode || (f.key === attributeCode && parseInt(f.value) !== parseInt(optionId))));
        } else {
            updateFilter(activeFilters.concat({ key: attributeCode, value: optionId }));
        }
    };

    return <div className={"filter-attributes"}>
        {attributes.map((a, i) => {
            return <div key={i}>
                <div><strong>{a.attribute_name}</strong></div>
                <ul className="list-basic">
                    {a.options.map((o, j) => {
                        let isChecked = activeFilters.find((f) => f["key"] === a.attribute_code && parseInt(f.value) === parseInt(o.option_id));
                        return <li key={j}><label>
                            <input
                                className=""
                                type={"checkbox"}
                                checked={isChecked}
                                onChange={(e) => onChange(e, a.attribute_code, o.option_id)} /><span className="option-name">{o.option_text}</span></label>
                        </li>
                    })}
                </ul>
            </div>
        })}
    </div>
}

export default function Filter({ title }) {
    const data = get(React.useContext(appContext), "data.productsFilter", []);
    const activeFilters = get(React.useContext(appContext), "data.activeProductsFilters", []);
    const currentUrl = get(React.useContext(appContext), "data.currentUrl", "");

    const updateFilter = (filters) => {
        let url = new URL(currentUrl, window.location.origin);
        for (let i = 0; i < activeFilters.length; i++) {
            url.searchParams.delete(activeFilters[i]["key"]);
        }

        for (let i = 0; i < filters.length; i++) {
            url.searchParams.append(filters[i]["key"], filters[i]["value"]);
        }
        window.location.href = url
    };

    const cleanFilter = () => {
        let url = new URL(currentUrl, window.location.origin);
        for (let i = 0; i < activeFilters.length; i++) {
            url.searchParams.delete(activeFilters[i]["key"]);
        }

        window.location.href = url
    };

    return <Area
        id={"category-info"}
        updateFilter={updateFilter}
        cleanFilter={cleanFilter}
        activeFilters={activeFilters}
        className={"product-filter-tool"}
        coreWidgets={[
            {
                component: { default: () => <div className="filter-title">{title}</div> },
                props: { activeFilters },
                sortOrder: 0,
                id: "filter-tool-title"
            },
            {
                component: { default: Price },
                props: { activeFilters, updateFilter, minPrice: get(data, 'price.min', ""), maxPrice: get(data, 'price.max', "") },
                sortOrder: 10,
                id: "filter-price"
            },
            {
                component: { default: Attributes },
                props: { activeFilters, updateFilter, attributes: get(data, 'attributes', []) },
                sortOrder: 20,
                id: "filter-attributes"
            }
        ]}
    />
}