import React, { useState } from "react";
import Area from "../../../../../../lib/components/Area";
import { useAppState } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/Pagination";
import { get } from "../../../../../../lib/util/get";
import { Card } from "../../../../../cms/components/admin/Card";
import { useAlertContext } from "../../../../../../lib/components/modal/Alert";
import { Checkbox } from "../../../../../../lib/components/form/fields/Checkbox";
import axios from "axios";
import formData from "../../../../../../lib/util/formData";

const Actions = ({ selectedIds = [], setSelectedRows }) => {
    const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
    const [isLoading, setIsLoading] = useState(false);
    const context = useAppState();
    const actions = [
        {
            name: 'Delete',
            onAction: (ids) => {
                openAlert({
                    heading: `Delete ${selectedIds.length} attributes`,
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
                            let deleteUrl = context.deleteAttributesUrl;
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

export default function attributeGrid() {
    const attributes = get(useAppState(), "grid.attributes", []);
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
                        className={""}
                        id={"attributeGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                <Actions ids={attributes.map((a) => a.attribute_id)} selectedIds={selectedRows} setSelectedRows={setSelectedRows} />
                {attributes.map((a, i) => {
                    return <tr key={i}>
                        <td><Checkbox isChecked={selectedRows.includes(a.attribute_id)} onChange={(e) => {
                            if (e.target.checked)
                                setSelectedRows(selectedRows.concat([a.attribute_id]))
                            else
                                setSelectedRows(selectedRows.filter((e) => e !== a.attribute_id))
                        }} /></td>
                        <Area
                            className={""}
                            id={"attributeGridRow"}
                            row={a}
                            noOuter={true}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {attributes.length === 0 &&
            <div className='flex w-full justify-center'>There is no attribute to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </Card>;
}