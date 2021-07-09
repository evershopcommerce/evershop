import React from "react";
import Area from "../../../../../../lib/components/area";
import { useAppState } from "../../../../../../lib/context/app";
import { get } from "../../../../../../lib/util/get";

const Name = ({ name }) => {
    return <h1 className="category-name">{name}</h1>
};

const Description = ({ description }) => {
    return <div className="category-description" dangerouslySetInnerHTML={{ __html: description }}></div>
};

export default function CategoryInfo() {
    const category = get(useAppState(), "category");

    return <div className="container">
        <Area
            id={"category-general-info"}
            className="category-general-info"
            coreWidgets={[
                {
                    component: { default: Name },
                    props: { name: category.name },
                    sortOrder: 10,
                    id: "category-name"
                },
                {
                    component: { default: Description },
                    props: { description: category.description },
                    sortOrder: 20,
                    id: "category-description"
                }
            ]}
        />
    </div>
}

export function describe() {

}