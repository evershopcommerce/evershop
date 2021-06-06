import A from "../../../../../../js/production/a.js";

function GuestGreeting({loginUrl}) {
    return <div className="">
        <A url={loginUrl}><span>Login</span></A>
    </div>
}

function UserGreeting({logoutUrl, myAccountUrl}) {
    const customerInfo = ReactRedux.useSelector(state => _.get(state, 'appState.customer'));
    return <div className="">
        <A url={myAccountUrl}><span>Hello </span> <span>{_.get(customerInfo, 'full_name')}!</span></A> | <A url={logoutUrl}><span>Log out</span></A>
    </div>
}

export default function HeaderBlock(props) {
    const isLoggedIn = props.isLoggedIn;

    return <div className="customer-header">
        {isLoggedIn && <UserGreeting {...props}/>}
        {!isLoggedIn && <GuestGreeting {...props}/>}
    </div>
}