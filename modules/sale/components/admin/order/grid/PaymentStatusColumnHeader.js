import React from "react";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";
import { Select } from "../../../../../../lib/components/form/fields/Select";

export default function PaymentStatusColumnHeader({ title, id }) {
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
        <div className="table-header payment-status-header">
            <div className={"title"} style={{ marginBottom: '1rem' }}><span>{title}</span></div>
            <div className={"filter"}>
                <Select
                    onChange={(e) => onChange(e)}
                    value={current}
                    options={get(context, 'paymentStatus', []).map((status) => {
                        return {
                            value: status.code,
                            text: status.name
                        }
                    })}
                />
            </div>
        </div>
    </th>;
}