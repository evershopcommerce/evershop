
import React from 'react';

function Title({ step }) {
    return < div className="flex step-title" >
        {step.isCompleted === true && <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check-circle">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>}
        {step.isCompleted === false && <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-circle">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>}
        <h2 className="mb-4 pl-4">{step.title}</h2>
        {step.isCompleted === true && <button className="btn btn-light">Edit</button>}
    </div >
}

export { Title }