import React, { useEffect } from 'react';
import PubSub from 'pubsub-js';
import uniqid from 'uniqid';
import axios from 'axios';
import { get } from '../../../../../../lib/util/get';
import { FORM_VALIDATED } from '../../../../../../lib/util/events';
import { useAppState } from '../../../../../../lib/context/app';
import ProductMediaManager from './ProductMediaManager';
import { Field } from '../../../../../../lib/components/form/Field';
import { Card } from '../../../../../cms/views/admin/Card';
import { useAlertContext } from '../../../../../../lib/components/modal/Alert';
import { Input } from '../../../../../../lib/components/form/fields/Input';

function isDuplicated(attrs1, attrs2) {
  let flag = true;
  attrs1.forEach((a1) => {
    const a2 = attrs2.find((a) => a.attribute_code === a1.attribute_code);
    if (!a2 || (parseInt(a2.option_id) !== parseInt(a1.option_id))) { flag = false; }
  });

  return flag;
}

function Variant({
  attributes, variant, removeVariant, updateVariant
}) {
  const unlinkApi = get(useAppState(), 'unlinkVariant');

  const onUnlink = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', variant.variant_product_id);
    axios.post(unlinkApi, formData).then((response) => {
      if (response.data.success === true) {
        removeVariant(variant);
      } else {
        // TODO: Toast an error message
      }
    });
  };

  return (
    <div className="variant-item pb-15 border-b border-solid border-divider mb-15 last:border-b-0 last:pb-0">
      <input type="hidden" value={variant.variant_product_id} name={`variant_group[variants][${variant.id}][productId]`} />
      <div className="grid grid-cols-2 gap-x-1">
        <div className="col-span-1">
          <ProductMediaManager id={variant.id} productImages={variant.images || []} />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-1 border-b border-divider pb-15 mb-15">
            {attributes.map((a, i) => (
              <div key={a.attribute_id} className="mt-1 col">
                <div><label>{a.attribute_name}</label></div>
                <input type="hidden" value={a.attribute_id} name={`variant_group[variants][${variant.id}][attributes][${i}][attribute]`} />
                <Field
                  name={`variant_group[variants][${variant.id}][attributes][${i}][value]`}
                  validationRules={['notEmpty']}
                  value={get(get(variant, 'attributes', []).find((e) => parseInt(e.attribute_id) === parseInt(a.attribute_id)), 'option_id', '')}
                  options={(() => a.options.map((o, i) => ({ value: parseInt(o.attribute_option_id), text: o.option_text })))()}
                  onChange={(e) => {
                    updateVariant(
                      variant.id,
                      {
                        ...variant,
                        attributes: attributes.map((at) => {
                          const attr = variant.attributes.find((ax) => ax.attribute_code === at.attribute_code) ? variant.attributes.find((ax) => ax.attribute_code === at.attribute_code) : { attribute_code: at.attribute_code, attribute_id: at.attribute_id };
                          if (at.attribute_code === a.attribute_code) {
                            attr.option_id = e.target.value;
                            attr.value_text = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                          }
                          return attr;
                        })
                      }
                    );
                  }}
                  type="select"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-1 border-b border-divider pb-15 mb-15">
            <div>
              <div>SKU</div>
              <Field
                name={`variant_group[variants][${variant.id}][sku]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.sku}
                type="text"
              />
            </div>
            <div>
              <div>Price</div>
              <Field
                name={`variant_group[variants][${variant.id}][price]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.price}
                type="text"
              />
            </div>
            <div>
              <div>Qty</div>
              <Field
                name={`variant_group[variants][${variant.id}][qty]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.qty}
                type="text"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-1">
            <div>
              <div>Status</div>
              <Field
                name={`variant_group[variants][${variant.id}][status]`}
                formId="product-edit-form"
                value={variant.status}
                type="toggle"
              />
            </div>
            <div>
              <div>Visibility</div>
              <Field
                name={`variant_group[variants][${variant.id}][visibility]`}
                formId="product-edit-form"
                value={variant.visibility}
                type="toggle"
              />
            </div>

            <div>
              <div>Actions</div>
              <div><a href="#" className="text-critical" onClick={(e) => { e.preventDefault(); onUnlink(e); }}>Unlink</a></div>
              <div>{variant.editUrl && <a href={variant.editUrl} target="_blank" rel="noreferrer">Edit</a>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchModal({ keyword, variants, addVariant }) {
  const context = useAppState();
  const [potentialVariants, setPotentialVariants] = React.useState([]);
  const [typeTimeout, setTypeTimeout] = React.useState(null);
  const searchUrl = get(useAppState(), 'searchVariantUrl');
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    setPotentialVariants([]);
    search(keyword);
  }, []);

  const search = (keyword) => {
    if (typeTimeout) clearTimeout(typeTimeout);
    setTypeTimeout(setTimeout(() => {
      setLoading(true);
      const url = new URL(searchUrl, window.location.origin);
      if (keyword) { url.searchParams.set('keyword', keyword); }

      fetch(
        url,
        {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      ).then((response) => {
        if (!response.headers.get('content-type') || !response.headers.get('content-type').includes('application/json')) { throw new TypeError('Something wrong. Please try again'); }

        return response.json();
      })
        .then((response) => {
          if (get(response, 'success') === true) { setPotentialVariants(get(response, 'data.variants').filter((v) => variants.find((vari) => parseInt(vari.variant_product_id) === parseInt(v.variant_product_id)) === undefined)); } else {
            setPotentialVariants([]);
          }
        })
        .catch(
          (error) => {
            // toast.error(get(error, "message", "Failed!"));
          }
        )
        .finally(() => {
          // e.target.value = null
          setLoading(false);
        });
    }, 1500));
  };

  return (
    <div>
      <Input
        type="text"
        onChange={(e) => {
          e.persist();
          search(e.target.value);
        }}
        value={keyword}
      />
      <div className="variant-search-result">
        {loading && (
          <div className="variant-search-loading">
            <svg style={{ background: 'rgb(255, 255, 255, 0)', display: 'block', shapeRendering: 'auto' }} width="2rem" height="2rem" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
              <circle cx="50" cy="50" fill="none" stroke="var(--primary)" strokeWidth="10" r="43" strokeDasharray="202.63272615654165 69.54424205218055">
                <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;360 50 50" keyTimes="0;1" />
              </circle>
            </svg>
          </div>
        )}
        {potentialVariants.length > 0 && (
          <div className="search-result">
            <table className="listing">
              <tbody>
                {potentialVariants.map((v) => (
                  <tr className={v.selected === true ? 'selected' : ''}>
                    <td>{v.image.url && <img src={v.image.url} />}</td>
                    <td>
                      <a
                        className="text-interactive"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPotentialVariants(potentialVariants.map((a) => {
                            if (parseInt(a.variant_product_id) === parseInt(v.variant_product_id)) return { ...a, selected: true };
                            else return a;
                          }));
                          addVariant(e, {
                            id: uniqid(),
                            variant_product_id: v.variant_product_id,
                            attributes: v.setAttributes,
                            image: v.image,
                            sku: v.sku,
                            price: v.price,
                            qty: v.qty,
                            status: v.status,
                            visibility: 0,
                            editUrl: v.editUrl
                          });
                        }}
                      >
                        <span>{v.name}</span>
                      </a>
                    </td>
                    <td><span>{new Intl.NumberFormat(context.language, { style: 'currency', currency: context.currency }).format(v.price)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {potentialVariants.length <= 0 && <div className="flex justify-center p-1">There is no product to show</div>}
      </div>
    </div>
  );
}

function Search({ addVariant, variants }) {
  const searchInput = React.useRef();
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();

  const openModal = (e) => {
    e.persist();
    openAlert({
      heading: 'Search for variant',
      content: <SearchModal
        keyword={e.target.value}
        variants={variants}
        addVariant={addVariant}
      />,
      primaryAction: {
        title: 'Done',
        onAction: closeAlert,
        variant: 'primary'
      }
    });
  };

  return (
    <div className="flex justify-between mt-1">
      <div className="self-center">
        <a href="#" onClick={(e) => addVariant(e)}><span className="text-interactive hover:underline">Add a new variant</span></a>
      </div>
      <div className="self-center">
        <div className="autocomplete-search">
          <Input
            ref={searchInput}
            type="text"
            placeholder="Search for variant"
            onChange={(e) => openModal(e)}
          />
        </div>
      </div>
    </div>
  );
}

function variantReducer(variants, action) {
  switch (action.type) {
    case 'add':
      if (action.payload.variant) { return variants.concat(action.payload.variant); } else {
        return variants.concat({
          id: uniqid(),
          attributes: [],
          image: {},
          sku: '',
          price: 0,
          qty: '',
          status: 1,
          visibility: 0,
          isNew: true
        });
      }
    case 'remove':
      return variants.filter((v) => v.id !== action.payload.id);
    case 'update':
      return variants.map((v) => {
        if (v.id === action.payload.id) {
          return action.payload.variant;
        } else {
          return v;
        }
      });
    default:
      throw new Error();
  }
}

function Variants({ variantAttributes, variantProducts }) {
  const [variants, dispatch] = React.useReducer(variantReducer, variantProducts);

  const validate = (formId, errors) => { // TODO: Fix validation variants when editing product
    // setVariants(variants.map((v) => {
    //   v.duplicate = false;
    //   variants.forEach((variant) => {
    //     if (v.id !== variant.id && isDuplicated(v.attributes, variant.attributes)) {
    //       v.duplicate = true;
    //       errors['variants'] = "Duplicated variant";
    //     }
    //   });

    //   return v;
    // }))
  };

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_VALIDATED, (message, data) => {
      validate(data.formId, data.errors);
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
    };
  }, [variants]);

  // React.useEffect(() => {
  //   setVariants(variants.map((v) => {
  //     if (v.current === true) {
  //       let attributes = [];
  //       variantAttributes.forEach((a) => {
  //         attributes.push({
  //           attribute_code: a.attribute_code,
  //           attribute_id: a.attribute_id,
  //           option_id: parseInt(attributeGroup.attributes.find((e) => e.attribute_code === a.attribute_code)["selected_option"]),
  //           value_text: attributeGroup.attributes.find((e) => e.attribute_code === a.attribute_code)["value_text"]
  //         });
  //       });
  //       v.attributes = attributes;
  //     }
  //
  //     return v;
  //   }));
  // }, [attributeGroup]);

  const addVariant = (e, variant = null) => {
    e.preventDefault();
    dispatch({
      type: 'add',
      payload: {
        variant
      }
    });
  };

  const removeVariant = (variant) => {
    dispatch({
      type: 'remove',
      payload: {
        id: variant.id
      }
    });
  };

  const updateVariant = (id, value) => {
    dispatch({
      type: 'update',
      payload: {
        id,
        variant: value
      }
    });
  };

  return (
    <div>
      {variantAttributes.map((a) => <input key={a.attribute_id} type="hidden" value={a.attribute_id} name="variant_group[variant_group_attributes][]" />)}
      <Card.Session>
        <div className="variant-list">
          {variants.map((v) => (
            <Variant
              key={v.id}
              variant={v}
              attributes={variantAttributes}
              removeVariant={removeVariant}
              updateVariant={updateVariant}
            />
          ))}
        </div>
      </Card.Session>
      <Card.Session>
        <Search addVariant={addVariant} variants={variants} />
      </Card.Session>
    </div>
  );
}

function CreateVariantGroup() {
  const variantableAttributes = get(useAppState(), 'variantableAttributes', []);

  const [attributes, setAttributes] = React.useState([]);
  const [creating, setCreating] = React.useState(false);

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
  };

  return (
    <div>
      {creating === true && (
        <Variants
          variantProducts={[]}
          variantAttributes={variantableAttributes.filter((v) => attributes.includes(v.attribute_id))}
        />
      )}
      {creating === false && (
        <div>
          {variantableAttributes.length > 0 && (
            <div>
              <div><span>Select the list of attribute</span></div>
              {variantableAttributes.map((a) => (
                <Field
                  key={a.attribute_id}
                  type="checkbox"
                  label={a.attribute_name}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAttributes(attributes.concat(a.attribute_id));
                    } else {
                      setAttributes(attributes.filter((a) => a !== a.attribute_id));
                    }
                  }}
                />
              ))}
              <div className="mt-1">
                <a className="text-interactive hover:underline" href="#" onClick={(e) => onCreate(e)}>Create</a>
              </div>
            </div>
          )}
          {variantableAttributes.length === 0 && (
            <div className="alert alert-danger" role="alert">
              There is no "Select" attribute available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Edit() {
  const context = useAppState();
  return (
    <Variants
      variantProducts={get(context, 'product.variants', [])}
      variantAttributes={get(context, 'product.variantAttributes', [])}
    />
  );
}

function New() {
  const [action, setAction] = React.useState(undefined);
  return (
    <>
      <Card.Session>
        {action === undefined && (
          <div>
            <div className="justify-center text-center">
              <div className="mb-4">
                <span className="pr-1">This product has some variants like color or size?</span>
                <a className="text-interactive hover:underline" href="#" onClick={(e) => { e.preventDefault(); setAction('create'); }}>Create a variant group</a>
              </div>
            </div>
          </div>
        )}
        {action === 'create' && (
          <div>
            <CreateVariantGroup />
          </div>
        )}
      </Card.Session>
      {action === 'create' && (
        <Card.Session>
          <a className="text-critical hover:underline" href="#" onClick={(e) => { e.preventDefault(); setAction(undefined); }}>Cancel</a>
        </Card.Session>
      )}
    </>
  );
}

export default function VariantGroup() {
  const variantGroupId = get(useAppState(), 'product.variant_group_id');
  return (
    <Card
      title="Variant"
    >
      {!variantGroupId && <New />}
      {variantGroupId && (
        <div>
          <input type="hidden" value={variantGroupId} name="variant_group[variant_group_id]" />
          <Edit />
        </div>
      )}
    </Card>
  );
}
