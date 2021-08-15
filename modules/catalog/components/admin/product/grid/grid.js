import React, { useState } from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/pagination";
import { get } from "../../../../../../lib/util/get";
import { Card } from "../../../../../cms/components/admin/card";
import { Checkbox } from "../../../../../../lib/components/form/fields/Checkbox";
import { useAlertContext } from "../../../../../../lib/components/modal/Alert";
import axios from "axios";
import formData from "../../../../../../lib/util/formData";

const Actions = ({ ids = [], selectedIds = [], setSelectedRows }) => {
    const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
    const [isLoading, setIsLoading] = useState(false);
    const context = useAppState();
    const actions = [
        {
            name: 'Disable',
            onAction: (ids) => { }
        },
        {
            name: 'Enable',
            onAction: (ids) => {
                openAlert({
                    heading: `Enable ${selectedIds.length} products`,
                    content: "Are you sure?",
                    primaryAction: {
                        'title': 'Cancel',
                        'onAction': closeAlert,
                        'variant': 'primary'
                    },
                    secondaryAction: {
                        'title': 'Enable',
                        'onAction': async () => {
                            setIsLoading(true);
                            dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } })
                            let enableUrl = context.enableProductsUrl;
                            let response = await axios.post(enableUrl, formData().append('ids', selectedIds).build());
                            //setIsLoading(false);
                            if (response.data.success === true) {
                                window.location.href = context.currentUrl;
                                //TODO: Should display a message and delay for 1 - 2 second
                            } else {

                            }
                        },
                        'variant': 'critical',
                        isLoading: false
                    }
                }
                )
            }
        },
        {
            name: 'Delete',
            onAction: (ids) => {
                openAlert({
                    heading: `Delete ${selectedIds.length} products`,
                    content: <div>Can't be undone</div>,
                    primaryAction: {
                        'title': 'Cancel',
                        'onAction': closeAlert,
                        'variant': 'primary'
                    },
                    secondaryAction: {
                        'title': 'Delete',
                        'onAction': async () => {
                            setIsLoading(true);
                            dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } })
                            let deleteUrl = context.deleteProductsUrl;
                            let response = await axios.post(deleteUrl, formData().append('ids', selectedIds).build());
                            //setIsLoading(false);
                            if (response.data.success === true) {
                                window.location.href = context.currentUrl;
                                //TODO: Should display a message and delay for 1 - 2 second
                            } else {

                            }
                        },
                        'variant': 'critical',
                        isLoading: isLoading
                    }
                }
                )
            }
        }
    ];

    return <tr>
        {selectedIds.length === 0 && (null)}
        {selectedIds.length > 0 && <td style={{ borderTop: 0 }} colSpan='100'>
            <div className='inline-flex border border-divider rounded justify-items-start'>
                <a href="#" className='font-semibold pt-075 pb-075 pl-15 pr-15'>{selectedIds.length} selected</a>
                {actions.map((action) => {
                    return <a href="#" onClick={(e) => { e.preventDefault(); action.onAction() }} className='font-semibold pt-075 pb-075 pl-15 pr-15 block border-l border-divider self-center'><span>{action.name}</span></a>
                })}
            </div>
        </td>}
    </tr>
}

export default function ProductGrid() {
    const products = get(useAppState(), "grid.products", []);
    const total = get(useAppState(), "grid.total", 0);
    const limit = get(useAppState(), "grid.limit", 20);
    const page = get(useAppState(), "grid.page", 1);
    const [selectedRows, setSelectedRows] = useState([]);

    return <Card>
        <table className="listing sticky">
            <thead>
                <tr>
                    <th className='align-bottom'><Checkbox onChange={(e) => {
                        if (e.target.checked)
                            setSelectedRows(products.map((p) => p.product_id))
                        else
                            setSelectedRows([])
                    }} /></th>
                    <Area
                        id={"productGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                <Actions ids={products.map(() => products.product_id)} selectedIds={selectedRows} setSelectedRows={setSelectedRows} />
                {products.map((p, i) => {
                    return <tr key={i}>
                        <td><Checkbox isChecked={selectedRows.includes(p.product_id)} onChange={(e) => {
                            if (e.target.checked)
                                setSelectedRows(selectedRows.concat([p.product_id]))
                            else
                                setSelectedRows(selectedRows.filter((e) => e !== p.product_id))
                        }} /></td>
                        <Area
                            id={"productGridRow"}
                            row={p}
                            noOuter={true}
                            selectedRows={selectedRows}
                            setSelectedRows={setSelectedRows}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {products.length === 0 &&
            <div>There is no product to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </Card>;
}