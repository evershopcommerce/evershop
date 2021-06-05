import React from "react";
import Area from "../../../../../../lib/components/area";
import { Form } from "../../../../../../lib/components/form/form";

export default function categoryEditForm(props) {
    return <Form {...props} submitBtn={false}>
        <div className="form-head sticky">
            <div className="child-align-middle">
                <a href={props.gridUrl} className="">
                    <i className="fas fa-arrow-left"></i>
                    <span className="pl-1">Category list</span>
                </a>
            </div>
            <div className="buttons">
                <a className="btn btn-danger" href={props.gridUrl}>Cancel</a>
                <button type="submit" className="btn btn-primary">Submit</button>
            </div>
        </div>
        <div className="row">
            <div className="col-6">
                <Area id="left.side" noOuter={true} />
            </div>
            <div className="col-6">
                <Area id="right.side" noOuter={true} />
            </div>
        </div>
    </Form>;
}