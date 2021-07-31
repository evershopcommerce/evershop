import React from 'react';

function PageHeader({ backUrl, heading, children }) {
    return (
        <div className='flex'>
            {backUrl && <a href={backUrl} className='border block border-border'>
                <span className='flex items-center'><svg className='text-icon' viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path d="M17 9H5.414l3.293-3.293a.999.999 0 1 0-1.414-1.414l-5 5a.999.999 0 0 0 0 1.414l5 5a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414L5.414 11H17a1 1 0 1 0 0-2z"></path></svg></span>
            </a>}
            {children}
        </div>
    );
}

export { PageHeader };