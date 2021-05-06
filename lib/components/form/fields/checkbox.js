import { Error } from "./error"
import { formContext } from "../form";

export default function Checkbox(props) {
    const [isChecked, setChecked] = React.useState(props.isChecked);
    const context = React.useContext(formContext);
    const field = context.fields.find((f) => f.name === name);
    React.useEffect(() => {
        context.addField(props.name, props.value, props.validationRules);

        return () => {
            context.removeField(name);
        };
    }, []);

    const onChange = (e) => {
        setChecked(e.target.checked);
        if (props.handler) props.handler.call(window, e, props);
    };

    return <div className="form-group nodejscart-checkbox">
        <div>
            <label htmlFor={props.name}><input
                type="checkbox"
                className="uk-checkbox"
                id={props.name}
                name={props.name}
                value={props.value}
                onChange={onChange}
                disabled={isDisabled}
                checked={isChecked}
            />
                {!isChecked && <i className="fas fa-square font-color-primary"></i>}
                {isChecked && <i className="fas fa-check-square font-color-primary"></i>}
                {props.label}
            </label>
        </div>
        {props.comment &&
            <p><i>{props.comment}</i></p>
        }
        <Error error={field ? field.error : undefined} />
    </div>
}