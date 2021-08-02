import React from 'react';

function Card({ title, actions = [], subdued = false, children }) {
    return (
        <div className={subdued ? "card shadow subdued" : "card shadow"}>
            {(title || actions.length > 0) && <div className="flex justify-between card-header">
                {title && <h2 className='card-title'>{title}</h2>}
                {actions.length > 0 && <div className='flex space-x-md'>
                    {actions.map((action, index) => {
                        return <div key={index} className="card-action"><a href="#" onClick={(e) => {
                            e.preventDefault();
                            if (action.onAction)
                                action.onAction.call();
                        }} className='text-interactive'>{action.name}</a>
                        </div>
                    })}
                </div>}
            </div>}
            {children}
        </div >
    );
}

Card.Session = ({ title, children }) => {
    return <div className='card-section border-b box-border border-border'>
        {title && <h3 className='card-session-title'>{title}</h3>}
        <div className='card-session-content pt-lg'>{children}</div>
    </div>
}

export { Card };