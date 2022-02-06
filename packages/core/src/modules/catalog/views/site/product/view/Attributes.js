function Attributes({ attributes, areaProps }) {
  React.useEffect(() => {
    areaProps.registerTab({ name: 'Specification', id: 'specification' });
  }, []);

  return areaProps.currentTab == 'specification' ? (
    <div className="specification">
      <ul className="list-basic">
        {attributes.map((attribute, index) => (
          <li key={index}>
            <strong>
              {attribute.attribute_name}
              {' '}
              :
              {' '}
            </strong>
            {' '}
            <span>{attribute.option_text}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : (null);
}
export default Attributes;
