import React from 'react';
import Area from '../../../../lib/components/area';
import { useAppState } from '../../../../lib/context/app';
import { get } from '../../../../lib/util/get';

const BreadcrumbIcon = ({ backUrl }) => {
    if (!backUrl)
        return null;
    return <a href={backUrl} className='breadcrum-icon border block border-border rounded mr-075'>
        <span className='flex items-center justify-center'><svg className='text-icon' viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M17 9H5.414l3.293-3.293a.999.999 0 1 0-1.414-1.414l-5 5a.999.999 0 0 0 0 1.414l5 5a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414L5.414 11H17a1 1 0 1 0 0-2z"></path></svg></span>
    </a>;
}

const Heading = ({ heading }) => <div className='self-center'><h1 className='page-heading-title'>{heading}</h1></div>

function PageHeading({ backUrl }) {
    const context = useAppState();
    const heading = get(context, 'page.heading');
    if (!heading)
        return null;

    return (
        <div className='page-heading flex justify-between items-center'>
            <div className='flex justify-start space-x-1 items-center'>
                <Area
                    id='pageHeadingLeft'
                    noOuter={true}
                    coreComponents={[
                        {
                            component: { default: BreadcrumbIcon },
                            props: {
                                backUrl: backUrl
                            },
                            sortOrder: 0,
                            id: "breadcrumb"
                        },
                        {
                            component: { default: Heading },
                            props: {
                                heading: heading
                            },
                            sortOrder: 0,
                            id: "heading"
                        }
                    ]}
                />
            </div>
            <div className='flex justify-end space-x-1 items-center'>
                <Area
                    id='pageHeadingRight'
                    noOuter={true}
                    coreComponents={[]}
                />
            </div>
        </div>
    );
}

export default PageHeading;