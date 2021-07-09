import React from "react";
import Text from '../../../../../../lib/components/form/fields/text';
import MultiSelect from '../../../../../../lib/components/form/fields/multiselect';
import Select from '../../../../../../lib/components/form/fields/select';
import Switch from '../../../../../../lib/components/form/fields/switch';
import { get } from "../../../../../../lib/util/get";
import { FORM_VALIDATED } from '../../../../../../lib/util/events';
import PubSub from "pubsub-js";
import { useAppState } from "../../../../../../lib/context/app";
import uniqid from "uniqid";
import ProductMediaManager from "./media";

function isDuplicated(attrs1, attrs2) {
  let flag = true;
  attrs1.forEach((a1) => {
    let a2 = attrs2.find((a) => a.attribute_code === a1.attribute_code);
    if (!a2 || (parseInt(a2.option_id) !== parseInt(a1.option_id)))
      flag = false;
  });

  return flag;
}

function Variant({ attributes, variant, removeVariant, updateVariant }) {
  const graphqlApi = "";

  const onUnlink = (e) => {
    e.preventDefault();
    let formData = new FormData();
    formData.append('query', `mutation UnlinkVariant { unlinkVariant (productId: ${variant.id}) {status}}`);

    Fetch(
      graphqlApi,
      false,
      "POST",
      formData,
      null,
      (response) => {
        if (get(response, 'payload.data.unlinkVariant.status') === true) {
          removeVariant(variant);
        }
      }
    );
  };
  return <div className="variant-item">
    <input type="hidden" value={variant.variant_product_id} name={`variant_group[variants][${variant.id}][productId]`} />
    <div className="row">
      <div className="col-6">
        <ProductMediaManager id={variant.id} productImages={variant.images || []} />
      </div>
      <div className="col-6">
        <div className="row">
          {attributes.map((a, i) => {
            return <div key={a.attribute_id} className="mt-3 col">
              <div><label>{a.attribute_name}</label></div>
              <input type="hidden" value={a.attribute_id} name={`variant_group[variants][${variant.id}][attributes][${i}][attribute]`} />
              <Select
                name={`variant_group[variants][${variant.id}][attributes][${i}][value]`}
                validationRules={['notEmpty']}
                value={get(get(variant, "attributes", []).find((e) => parseInt(e.attribute_id) === parseInt(a.attribute_id)), "option_id", "")}
                options={(() => {
                  return a.options.map((o, i) => { return { value: parseInt(o.attribute_option_id), text: o.option_text } })
                })()}
                handler={(e) => {
                  updateVariant(
                    variant.id,
                    {
                      ...variant, attributes: attributes.map((at) => {
                        let attr = variant.attributes.find((ax) => ax.attribute_code === at.attribute_code) ? variant.attributes.find((ax) => ax.attribute_code === at.attribute_code) : { attribute_code: at.attribute_code, attribute_id: at.attribute_id };
                        if (at.attribute_code === a.attribute_code) {
                          attr.option_id = e.target.value;
                          attr.value_text = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                        }
                        return attr;
                      })
                    }
                  );
                }}
              />
            </div>
          })}
        </div>
        <div className="row">
          <div className="col">
            <div>SKU</div>
            <Text
              name={`variant_group[variants][${variant.id}][sku]`}
              formId="product-edit-form"
              validationRules={['notEmpty']}
              value={variant.sku}
            />
          </div>
          <div className="col">
            <div>Price</div>
            <Text
              name={`variant_group[variants][${variant.id}][price]`}
              formId="product-edit-form"
              validationRules={['notEmpty']}
              value={variant.price}
            />
          </div>
          <div className="col">
            <div>Qty</div>
            <Text
              name={`variant_group[variants][${variant.id}][qty]`}
              formId="product-edit-form"
              validationRules={['notEmpty']}
              value={variant.qty}
              handler={(e) => {

              }}
            />
          </div>
        </div>

        <div className="row">
          <div className="col">
            <div>Status</div>
            <Switch
              name={`variant_group[variants][${variant.id}][status]`}
              formId="product-edit-form"
              value={variant.status}
            />
          </div>
          <div className="col">
            <div>Visibility</div>
            <Switch
              name={`variant_group[variants][${variant.id}][visibility]`}
              formId="product-edit-form"
              value={variant.visibility}
            />
          </div>

          <div className="col">
            <div>Actions</div>
            <div><a href="#" className="text-danger" onClick={(e) => { e.preventDefault(); onUnlink(e) }}>Unlink</a></div>
            <div>{variant.editUrl && <a href={variant.editUrl} target="_blank">Edit</a>}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

function Search({ addVariant, variants }) {
  const searchUrl = get(useAppState(), "searchVariantUrl");
  const [potentialVariants, setPotentialVariants] = React.useState([]);
  const [typeTimeout, setTypeTimeout] = React.useState(null);
  const searchInput = React.useRef();

  const search = (e) => {
    e.persist();
    if (typeTimeout) clearTimeout(typeTimeout);
    setTypeTimeout(setTimeout(() => {
      let url = new URL(searchUrl, window.location.origin);
      if (e.target.value)
        url.searchParams.set('keyword', e.target.value);

      fetch(
        url,
        {
          method: "GET",
          headers: {
            "X-Requested-With": "XMLHttpRequest"
          }
        }
      ).then(response => {
        if (!response.headers.get("content-type") || !response.headers.get("content-type").includes("application/json"))
          throw new TypeError("Something wrong. Please try again");

        return response.json();
      })
        .then(response => {
          if (get(response, "success") === true)
            setPotentialVariants(get(response, 'data.variants').filter(v => variants.find(vari => parseInt(vari.variant_product_id) === parseInt(v.variant_product_id)) === undefined));
          else {
            setPotentialVariants([]);
          }
        })
        .catch(
          error => {
            //toast.error(get(error, "message", "Failed!"));
          }
        )
        .finally(() => e.target.value = null);
    }, 1500));
  };

  return <div className="sml-flex-space-between mt-4">
    <div><a href="#" onClick={(e) => addVariant(e)}><i className="fas fa-plus"></i><span className="pl-1">Add a new variant</span></a></div>
    <div>
      <div className="autocomplete-search">
        <input ref={searchInput} type="text" className="form-control search-input" placeholder="Search for variant" onChange={(e) => search(e)} />
        <a className="search-clear" href={"#"} onClick={(e) => { e.preventDefault(); setPotentialVariants([]); searchInput.current.value = null; }}><i className="fas fa-times"></i></a>
        {potentialVariants.length > 0 && <div className="search-result">
          <table className="table table-bordered">
            {potentialVariants.map((v) => {
              return <tr>
                <td>{v.image.url && <img src={v.image.url} />}</td>
                <td><span>{v.name}</span></td>
                <td><span>{v.sku}</span></td>
                <td><span>{v.price}</span></td>
                <td><a href="#" onClick={(e) => {
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
                  })
                }}><i className="fas fa-plus"></i></a></td>
              </tr>
            })}
          </table>
        </div>}
      </div>
    </div>
  </div>
}

function Variants({ variantAttributes, variantProducts }) {
  const [variants, setVariants] = React.useState(variantProducts);

  const validate = (formId, errors) => {
    setVariants(variants.map((v) => {
      v.duplicate = false;
      variants.forEach((variant) => {
        if (v.id !== variant.id && isDuplicated(v.attributes, variant.attributes)) {
          v.duplicate = true;
          errors['variants'] = "Duplicated variant";
        }
      });

      return v;
    }))
  };

  React.useEffect(() => {
    let token = PubSub.subscribe(FORM_VALIDATED, function (message, data) {
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
    if (variant === null)
      setVariants(variants.concat({
        id: uniqid(),
        attributes: [],
        image: {},
        sku: "",
        price: 0,
        qty: "",
        status: 1,
        visibility: 0,
        isNew: true
      }));
    else
      setVariants(variants.concat(variant));
  };

  const removeVariant = (variant) => {
    setVariants(variants.filter((v) => parseInt(v.id) !== parseInt(variant.id)));
  };

  const updateVariant = (id, value) => {
    setVariants(variants.map((v) => {
      if (v.id === id)
        return value;
      return v;
    }))
  };

  return <div>
    {variantAttributes.map((a) => {
      return <input key={a.attribute_id} type="hidden" value={a.attribute_id} name="variant_group[variant_group_attributes][]" />
    })}
    <div className="variant-list">
      {variants.map((v) => {
        return <Variant
          key={v.id}
          variant={v}
          attributes={variantAttributes}
          removeVariant={removeVariant}
          updateVariant={updateVariant}
        />
      })}
    </div>
    <Search addVariant={addVariant} variants={variants} />
  </div>
}

function CreateVariantGroup() {
  const variantableAttributes = get(useAppState(), "variantableAttributes", []);

  const [attributes, setAttributes] = React.useState([]);
  const [creating, setCreating] = React.useState(false);

  const onCreate = (e) => {
    e.preventDefault();
    setCreating(true);
  };

  return <div>
    {creating === true && <Variants
      variantProducts={[]}
      variantAttributes={variantableAttributes.filter(v => attributes.includes(v.attribute_id))}
    />}
    {creating === false && <div>
      {variantableAttributes.length > 0 && <div>
        <MultiSelect
          name={'variant_group_attributes[]'}
          label={'Variant attributes'}
          formId="product-edit-form"
          value={undefined}
          options={(() => {
            return variantableAttributes.map((a, i) => { return { value: a.attribute_id, text: a.attribute_name } })
          })()}
          validationRules={['notEmpty']}
          handler={(e) => {
            let val = [...e.target.options].filter(o => o.selected).map(o => parseInt(o.value));
            setAttributes(val);
          }}
        />
        <div className="sml-flex">
          <button className="btn btn-primary" onClick={(e) => onCreate(e)}>Create</button>
        </div>
      </div>}
      {variantableAttributes.length === 0 && <div className="alert alert-danger" role="alert">
        There is no "Select" attribute available.
      </div>}
    </div>}
  </div>
}

function Edit() {
  const context = useAppState();
  return <Variants
    variantProducts={get(context, "product.variants", [])}
    variantAttributes={get(context, "product.variantAttributes", [])}
  />
}

function New() {
  const [action, setAction] = React.useState(undefined);
  return <div>
    {action === undefined && <div>
      <div className="text-center">
        <div className="mb-4">This product has some variants like color or size?</div>
        <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); setAction("create"); }}>Create a variant group</a>
      </div>
    </div>}
    {action === "create" && <div>
      <CreateVariantGroup />
      <button className="btn-danger btn">Cancel</button>
    </div>}
  </div>
}

export default function VariantGroup({ searchVariantUrl }) {
  const variantGroupId = get(useAppState(), "product.variant_group_id");
  return <div className="sml-block mt-4 variants-block">
    <div className="sml-block-title"><span>Variant</span></div>
    {!variantGroupId && <New />}
    {variantGroupId && <div>
      <input type="hidden" value={variantGroupId} name="variant_group[variant_group_id]" />
      <Edit />
    </div>}
  </div>
}