import React from "react";
import Area from "../../../../../lib/components/Area";
import Button from "../../../../../lib/components/form/Button";
import { useAppState } from "../../../../../lib/context/app";
import { get } from "../../../../../lib/util/get";

const Name = () => {
    return <h1 className="page-name text-center mt-25 mb-15">404 Page Not Found</h1>
};

const Content = ({ continueShoppingUrl }) => {
    return <div className="page-content">
        <div className="text-center">The page you requested does not exist.</div>
        <div className="mt-2 text-center">
            <Button title="Continue shopping" url={continueShoppingUrl} outline={true} />
        </div>
    </div>
};

export default function NotFound(props) {
    return <div className="page-width mt-25">
        <div className="pt-15">
            <Area
                id={"notfound-page"}
                coreComponents={[
                    {
                        component: { default: Name },
                        props: {},
                        sortOrder: 10,
                        id: "notfound-page-title"
                    },
                    {
                        component: { default: Content },
                        props: { continueShoppingUrl: props.continueShoppingUrl },
                        sortOrder: 20,
                        id: "notfound-page-content"
                    }
                ]}
            />
        </div>
    </div>
}