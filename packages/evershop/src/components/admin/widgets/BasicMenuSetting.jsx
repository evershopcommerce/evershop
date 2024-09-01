import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from 'urql';
import uniqid from 'uniqid';
import { useModal } from '@components/common/modal/useModal';
import './BasicMenuSetting.scss';
import CreatableSelect from 'react-select/creatable';
import Spinner from '@components/common/Spinner';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Card } from '../cms/Card';

const menuQuery = `
  query Query ($filters: [FilterInput]) {
    categories (filters: $filters) {
      items {
        value: uuid,
        label: name
        path {
          name
        }
      }
    }
    cmsPages (filters: $filters) {
      items {
        value: uuid,
        label: name
      }
    }
  }
`;

async function loadSwappable() {
  const { Swappable } = await import('@shopify/draggable');
  return Swappable;
}

function MenuSettingPopup({ item, updateItem }) {
  const [currentItem, setCurrentItem] = React.useState(item);
  const [err, setErr] = React.useState(null);

  const [result] = useQuery({
    query: menuQuery,
    variables: {
      filters: []
    }
  });
  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <div className="flex justify-center items-center">
        <Spinner width={30} height={30} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center">
        <p className="text-critical">{error.message}</p>
      </div>
    );
  }

  const groupOptions = [
    {
      label: 'Categories',
      options: data.categories.items.map((i) => ({
        ...i,
        label: i.path.map((p) => p.name).join(' > ')
      }))
    },
    {
      label: 'CMS Pages',
      options: data.cmsPages.items
    },
    {
      label: 'Custom',
      options:
        currentItem.type === 'custom'
          ? [
              {
                value: currentItem.uuid,
                label: currentItem.uuid
              }
            ]
          : []
    }
  ];
  const handleCreate = (inputValue) => {
    setCurrentItem({
      ...item,
      uuid: inputValue,
      label: inputValue,
      url: inputValue,
      type: 'custom'
    });
  };

  return (
    <Card title="Menu item">
      <Card.Session>
        <div className="grid grid-flow-row gap-8">
          <div>
            <Field
              type="input"
              label="Name"
              value={currentItem.name}
              onChange={(e) =>
                setCurrentItem({
                  ...currentItem,
                  name: e.target.value
                })
              }
            />
          </div>
          <div>
            <CreatableSelect
              isClearable
              onChange={(newValue) => {
                setCurrentItem({
                  ...currentItem,
                  uuid: newValue.value,
                  label: newValue.label,
                  // eslint-disable-next-line no-underscore-dangle
                  type: newValue.__typename === 'Category' ? 'category' : 'page'
                });
              }}
              onCreateOption={handleCreate}
              options={groupOptions}
              value={{
                value: currentItem.uuid,
                label:
                  currentItem.type === 'custom'
                    ? currentItem.uuid
                    : [
                        ...groupOptions[0].options,
                        ...groupOptions[1].options
                      ].find((option) => option.value === currentItem.uuid)
                        ?.label || ''
              }}
            />
          </div>
          {err && <div className="text-critical">{err}</div>}
          <div className="flex justify-end">
            <Button
              title="Save"
              onAction={() => {
                if (currentItem.uuid === '') {
                  setErr('Please select a menu item');
                  return;
                }
                if (currentItem.name === '') {
                  setErr('Please enter a name');
                  return;
                }
                updateItem(currentItem);
              }}
            />
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

MenuSettingPopup.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string,
    uuid: PropTypes.string,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string,
        type: PropTypes.string,
        uuid: PropTypes.string
      })
    )
  }).isRequired,
  updateItem: PropTypes.func.isRequired
};

function MenuItem({ item, updateItem, deleteItem }) {
  const modal = useModal();
  const [itemInEdit, setItemInEdit] = React.useState(item);

  const addChildren = (i) => {
    updateItem({
      ...item,
      children: [...item.children, i]
    });
  };

  const updateItemFunc = (i) => {
    if (i.id === item.id) {
      updateItem(i);
    } else {
      addChildren(i);
    }
    modal.closeModal();
  };
  return (
    <div className="flex justify-between">
      <div className="flex justify-start gap-5">
        <a
          className={
            item.children
              ? 'dragIcon cursor-move'
              : 'dragIcon_child cursor-move'
          }
        >
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="#949494"
            width={20}
            height={20}
          >
            <g>
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                fillRule="nonzero"
                d="M14 6h2v2h5a1 1 0 0 1 1 1v7.5L16 13l.036 8.062 2.223-2.15L20.041 22H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zm8 11.338V21a1 1 0 0 1-.048.307l-1.96-3.394L22 17.338zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z"
              />
            </g>
          </svg>
        </a>
        <div>{item.name}</div>
      </div>
      <div className="flex justify-end gap-5">
        <a
          className="text-interactive"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setItemInEdit(item);
            modal.openModal();
          }}
        >
          Edit
        </a>
        {item.children && (
          <a
            className="text-interactive"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setItemInEdit({
                id: uniqid(),
                name: '',
                uuid: ''
              });
              modal.openModal();
            }}
          >
            Add child
          </a>
        )}
        <a
          className="text-critical"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            deleteItem(item);
          }}
        >
          Delete
        </a>
      </div>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <MenuSettingPopup
                item={itemInEdit}
                updateItem={(i) => {
                  updateItemFunc(i);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

MenuItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string,
    uuid: PropTypes.string,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string,
        type: PropTypes.string,
        uuid: PropTypes.string
      })
    )
  }).isRequired,
  updateItem: PropTypes.func.isRequired,
  deleteItem: PropTypes.func.isRequired
};

export default function BasicMenuSetting({
  basicMenuWidget: { menus, isMain, className }
}) {
  const [items, setItems] = React.useState(menus);
  const modal = useModal();
  // eslint-disable-next-line no-unused-vars
  const swappable = React.useRef(null);
  const swappableChild = React.useRef({});
  React.useEffect(() => {
    async function initSwappable() {
      const Swappable = await loadSwappable();
      // eslint-disable-next-line new-cap
      const swappable = new Swappable(
        document.querySelectorAll(`div.menu__container`),
        {
          draggable: 'div.draggable',
          mirror: {
            constrainDimensions: true
          },
          handle: '.dragIcon'
        }
      );
      let source = null;
      let destination = null;
      swappable.on('swappable:swapped', (event) => {
        source = event.data.dragEvent.data.source.id;
        destination = event.data.dragEvent.data.over.id;
      });

      swappable.on('swappable:stop', () => {
        if (!source || !destination) {
          return;
        }
        setItems((originItems) => {
          const newItems = Array.from(originItems);
          const sr = originItems.find((item) => item.id === source);
          newItems[originItems.findIndex((item) => item.id === source)] =
            originItems.find((item) => item.id === destination);
          newItems[originItems.findIndex((item) => item.id === destination)] =
            sr;
          return newItems;
        });
      });
      swappable.current = swappable;
    }
    initSwappable();
  }, []);

  React.useEffect(() => {
    async function initChildSwappable() {
      const Swappable = await loadSwappable();
      // eslint-disable-next-line new-cap
      items.forEach((item) => {
        if (swappableChild.current[item.id]) {
          swappableChild.current[item.id].destroy();
        }
        const swappable = new Swappable(
          document.querySelectorAll(`div#${item.id}`),
          {
            draggable: 'div.draggable_child',
            mirror: {
              constrainDimensions: true
            },
            handle: '.dragIcon_child'
          }
        );
        let source = null;
        let destination = null;
        swappable.on('swappable:swapped', (event) => {
          source = event.data.dragEvent.data.source.id;
          destination = event.data.dragEvent.data.over.id;
        });

        swappable.on('swappable:stop', () => {
          if (!source || !destination) {
            return;
          }
          // Handle the update order of children
          setItems((originItems) => {
            const newItems = originItems.map((i) => {
              if (i.id !== item.id) {
                return i;
              } else {
                const newChildren = i.children.map((c) => ({ ...c }));
                const sr = newChildren.find((c) => c.id === source);
                newChildren[i.children.findIndex((c) => c.id === source)] =
                  i.children.find((c) => c.id === destination);
                newChildren[i.children.findIndex((c) => c.id === destination)] =
                  sr;
                return {
                  ...i,
                  children: newChildren
                };
              }
            });
            return newItems;
          });
        });
        swappableChild.current[item.id] = swappable;
      });
    }
    initChildSwappable();
  }, [items]);

  const updateItem = (item) => {
    setItems((prevItems) => {
      const newItems = prevItems.map((prevItem) => {
        if (prevItem.id === item.id) {
          return item;
        } else if (prevItem.children.length > 0) {
          return {
            ...prevItem,
            children: prevItem.children.map((child) => {
              if (child.id === item.id) {
                return item;
              }
              return child;
            })
          };
        }
        return prevItem;
      });
      return newItems;
    });
  };

  const deleteItem = (item) => {
    setItems((prevItems) => {
      const newItems = prevItems.filter((prevItem) => {
        if (prevItem.id === item.id) {
          return false;
        } else if (prevItem.children.length > 0) {
          // eslint-disable-next-line no-param-reassign
          prevItem.children = prevItem.children.filter(
            (child) => child.id !== item.id
          );
        }
        return true;
      });
      return newItems;
    });
  };

  return (
    <>
      <Card.Session title="Menu Items">
        <div className="menu__container">
          {items.map((menu) => (
            <div className="item draggable" id={menu.id} key={menu.id}>
              <MenuItem
                item={menu}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
              {menu.children.length > 0 && (
                <div className="menu__container_child mt-5">
                  {menu.children.map((item) => (
                    <div
                      className="item draggable_child"
                      key={item.id}
                      id={item.id}
                    >
                      <MenuItem
                        item={item}
                        updateItem={updateItem}
                        deleteItem={deleteItem}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Field
            type="hidden"
            name="settings[menus]"
            value={JSON.stringify(items)}
          />
          <div className="mt-5">
            <a
              href="#"
              className="text-interactive"
              onClick={(e) => {
                e.preventDefault();
                modal.openModal();
              }}
            >
              Add menu item
            </a>
          </div>
          {modal.state.showing && (
            <div
              className={modal.className}
              onAnimationEnd={modal.onAnimationEnd}
            >
              <div
                className="modal-wrapper flex self-center justify-center items-center"
                tabIndex={-1}
                role="dialog"
              >
                <div className="modal">
                  <MenuSettingPopup
                    item={{
                      id: uniqid(),
                      name: '',
                      uuid: '',
                      children: []
                    }}
                    updateItem={(item) => {
                      setItems((prevItems) => [...prevItems, item]);
                      modal.closeModal();
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card.Session>
      <Card.Session title="Setting">
        <Field
          type="toggle"
          name="settings[isMain]"
          label="Is Main Menu?"
          value={isMain}
          instruction="Only main menu will be styled for the mobile view"
        />
        <Field
          type="input"
          name="settings[className]"
          label="Custom CSS classes"
          value={className}
          instruction="Add custom CSS classes to the menu"
        />
      </Card.Session>
    </>
  );
}

BasicMenuSetting.propTypes = {
  basicMenuWidget: PropTypes.shape({
    menus: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string,
        type: PropTypes.string,
        uuid: PropTypes.string,
        children: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string,
            url: PropTypes.string,
            type: PropTypes.string,
            uuid: PropTypes.string
          })
        )
      })
    ),
    isMain: PropTypes.bool,
    className: PropTypes.string
  })
};

BasicMenuSetting.defaultProps = {
  basicMenuWidget: {
    menus: [],
    isMain: 1,
    className: ''
  }
};

export const query = `
  query Query($settings: JSON) {
    basicMenuWidget(settings: $settings) {
      menus {
        id
        name
        url
        type
        uuid
        children {
          id
          name
          url
          type
          uuid
        }
      }
      isMain
      className
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
