class Quantity extends React.Component {
  constructor(props) {
    super(props);
    this.props.dispatch({
      type: 'ADD_VALIDATION_RULE',
      field_name: 'qty',
      callback(value) {
        if (value === '') return false;
      },
      message: 'This is required field'
    });
    this.props.dispatch({
      type: 'ADD_VALIDATION_RULE',
      field_name: 'qty',
      callback(value) {
        const regex = /^\d+$/;
        return regex.test(value);
      },
      message: 'Not valid quantity'
    });
  }

  render() {
    return (
      <div className="qty">
        <label>
          Quantity
          <input name="qty" type="text" defaultValue="" />
        </label>
        {this.props.error !== undefined && (
          <div className="error"><span>{this.props.error}</span></div>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  error: state.form_validation_errors.qty
});
export default ReactRedux.connect(mapStateToProps)(Quantity);
