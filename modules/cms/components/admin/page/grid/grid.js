import React, { useState } from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import Pagination from "../../../../../../lib/components/grid/pagination";
import { get } from "../../../../../../lib/util/get";
import { useAlertContext } from "../../../../../../lib/components/modal/Alert";
import formData from "../../../../../../lib/util/formData";
import { Checkbox } from "../../../../../../lib/components/form/fields/Checkbox";
import { Card } from "../../card";
import axios from "axios";

const Actions = ({ selectedIds = [], setSelectedRows }) => {
    const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
    const [isLoading, setIsLoading] = useState(false);
    const context = useAppState();
    const actions = [
        {
            name: 'Delete',
            onAction: (ids) => {
                openAlert({
                    heading: `Delete ${selectedIds.length} pages`,
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
                            let deleteUrl = context.deleteCmsPagesUrl;
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

export default function CMSPageGrid() {
    const pages = get(useAppState(), "grid.pages", []);
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
                            setSelectedRows(pages.map((p) => p.cms_page_id))
                        else
                            setSelectedRows([])
                    }} /></th>
                    <Area
                        className={""}
                        id={"pageGridHeader"}
                        noOuter={true}
                    />
                </tr>
            </thead>
            <tbody>
                <Actions ids={pages.map((p) => p.cms_page_id)} selectedIds={selectedRows} setSelectedRows={setSelectedRows} />
                {pages.map((p, i) => {
                    return <tr key={i}>
                        <td style={{ width: '2rem' }}><Checkbox isChecked={selectedRows.includes(p.cms_page_id)} onChange={(e) => {
                            if (e.target.checked)
                                setSelectedRows(selectedRows.concat([p.cms_page_id]))
                            else
                                setSelectedRows(selectedRows.filter((e) => e !== p.cms_page_id))
                        }} /></td>
                        <Area
                            className={""}
                            id={"pageGridRow"}
                            row={p}
                            noOuter={true}
                        />
                    </tr>;
                })}
            </tbody>
        </table>
        {pages.length === 0 &&
            <div className='flex w-full justify-center'>There is no page to display</div>
        }
        <Pagination total={total} limit={limit} page={page} />
    </Card>;
}