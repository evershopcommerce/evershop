import React, { useState } from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/pagination";
import { get } from "../../../../../../lib/util/get";
import { Checkbox } from "../../../../../../lib/components/form/fields/Checkbox";
import { Card } from "../../../../../cms/components/admin/card";
import formData from "../../../../../../lib/util/formData";
import axios from "axios";
import { useAlertContext } from "../../../../../../lib/components/modal/Alert";

const Actions = ({ selectedIds = [], setSelectedRows }) => {
    const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
    const [isLoading, setIsLoading] = useState(false);
    const context = useAppState();
    const actions = [
        {
            name: 'Disable',
            onAction: (ids) => {
                openAlert({
                    heading: `Disable ${selectedIds.length} products`,
                    content: "Are you sure?",
                    primaryAction: {
                        'title': 'Cancel',
                        'onAction': closeAlert,
                        'variant': 'primary'
                    },
                    secondaryAction: {
                        'title': 'Disable',
                        'onAction': async () => {
                            setIsLoading(true);
                            dispatchAlert({ type: 'update', payload: { secondaryAction: { isLoading: true } } })
                            let disableUrl = context.disableProductUrl;
                            let response = await axios.post(disableUrl, formData().append('ids', selectedIds).build());
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
    const orders = get(useAppState(), "grid.orders", []);
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
                            setSelectedRows(orders.map((o) => o.product_id))
                        else
                            setSelectedRows([])
                    }} /></th>
                    <Area
                        className={""}
                        id={"orderGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                <Actions ids={orders.map(() => orders.order_id)} selectedIds={selectedRows} setSelectedRows={setSelectedRows} />
                {orders.map((o, i) => {
                    return <tr key={i}>
                        <td><Checkbox isChecked={selectedRows.includes(o.order_id)} onChange={(e) => {
                            if (e.target.checked)
                                setSelectedRows(selectedRows.concat([o.order_id]))
                            else
                                setSelectedRows(selectedRows.filter((e) => e !== o.order_id))
                        }} /></td>
                        <Area
                            className={""}
                            id={"orderGridRow"}
                            row={o}
                            noOuter={true}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {orders.length === 0 &&
            <div className='flex w-full justify-center'>There is no order to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </Card>;
}