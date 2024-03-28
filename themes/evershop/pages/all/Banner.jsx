import React from "react";

export default function Banner({ message }) {
    const epoch = new Date(0)
    const [show, setShow] = React.useState(false)
    const [bannerLastHidden, setBannerLastHidden] = React.useState(null);

    React.useEffect(() => {
        if (bannerLastHidden === null) {
            // Initial render
            const stored = new Date(window.localStorage.getItem("bannerLastHidden"))
            const url = new URL(window.location.href)
            
            if (url.pathname == "/")
                setBannerLastHidden(new Date(0))
            else
                setBannerLastHidden(stored)

            const now = new Date()
            if (now - stored > 1000 * 60 * 60 * 24 || url.pathname == "/")
                setShow(true);

        }
        else {
            window.localStorage.setItem("bannerLastHidden", bannerLastHidden.toJSON())
        }
    }, [bannerLastHidden])

    return (
        <div className={show ? "block" : "hidden"}>
            <header className="grid grid-cols-3 border-b bg-[#cbdfbd] border-header-border">
                <div></div>
                <div className="text-center self-center">{message}</div>
                <div className="justify-self-end px-2 self-center cursor-pointer" onClick={() => { setShow(false); setBannerLastHidden(new Date()) }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                </div>
            </header>
        </div>
    );
}