/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import uniqid from 'uniqid';
import { Input } from '@components/common/form/fields/Input';
import { useAppState } from '@components/common/context/app';
import { get } from '@evershop/evershop/src/lib/util/get';
import { VariantType } from '@components/admin/catalog/productEdit/variants/VariantType';

export function SearchModal({ keyword, variants, addVariant, searchAPI }) {
  const [potentialVariants, setPotentialVariants] = React.useState([]);
  const [typeTimeout, setTypeTimeout] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const context = useAppState();

  const search = (kw) => {
    if (typeTimeout) clearTimeout(typeTimeout);
    setTypeTimeout(
      setTimeout(() => {
        setLoading(true);
        const url = new URL(searchAPI, window.location.origin);
        if (kw) {
          url.searchParams.set('keyword', kw);
        }

        fetch(url, {
          method: 'GET',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
          .then((response) => {
            if (
              !response.headers.get('content-type') ||
              !response.headers.get('content-type').includes('application/json')
            ) {
              throw new TypeError('Something wrong. Please try again');
            }

            return response.json();
          })
          .then((response) => {
            if (get(response, 'success') === true) {
              setPotentialVariants(
                get(response, 'data.variants').filter(
                  (v) =>
                    variants.find(
                      (vari) =>
                        parseInt(vari.variant_product_id, 10) ===
                        parseInt(v.variant_product_id, 10)
                    ) === undefined
                )
              );
            } else {
              setPotentialVariants([]);
            }
          })
          .catch((error) => {
            toast.error(get(error, 'message', 'Failed!'));
          })
          .finally(() => {
            // e.target.value = null
            setLoading(false);
          });
      }, 1500)
    );
  };

  useEffect(() => {
    setPotentialVariants([]);
    search(keyword);
  }, []);

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
            <svg
              style={{
                background: 'rgb(255, 255, 255, 0)',
                display: 'block',
                shapeRendering: 'auto'
              }}
              width="2rem"
              height="2rem"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid"
            >
              <circle
                cx="50"
                cy="50"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="10"
                r="43"
                strokeDasharray="202.63272615654165 69.54424205218055"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  repeatCount="indefinite"
                  dur="1s"
                  values="0 50 50;360 50 50"
                  keyTimes="0;1"
                />
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
                    <td>{v.image.url && <img src={v.image.url} alt="" />}</td>
                    <td>
                      <a
                        className="text-interactive"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPotentialVariants(
                            potentialVariants.map((a) => {
                              if (
                                parseInt(a.variant_product_id, 10) ===
                                parseInt(v.variant_product_id, 10)
                              ) {
                                return { ...a, selected: true };
                              } else {
                                return a;
                              }
                            })
                          );
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
                    <td>
                      <span>
                        {new Intl.NumberFormat(context.language, {
                          style: 'currency',
                          currency: context.currency
                        }).format(v.price)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {potentialVariants.length <= 0 && (
          <div className="flex justify-center p-4">
            There is no product to show
          </div>
        )}
      </div>
    </div>
  );
}

SearchModal.propTypes = {
  addVariant: PropTypes.func.isRequired,
  keyword: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(VariantType).isRequired,
  searchAPI: PropTypes.string.isRequired
};
