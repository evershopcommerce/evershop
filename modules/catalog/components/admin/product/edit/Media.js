import React from "react";
import { get } from "../../../../../../lib/util/get";
import { useAppState } from "../../../../../../lib/context/app";
import ProductMediaManager from "./ProductMediaManager";
import { Card } from "../../../../../cms/components/admin/card";

export default function Media() {
    const context = useAppState();

    return <Card
        title="Media"
    >
        <Card.Session>
            <ProductMediaManager id={"productMainImages"} productImages={get(context, "product.images", [])} />
        </Card.Session>
    </Card>;
}