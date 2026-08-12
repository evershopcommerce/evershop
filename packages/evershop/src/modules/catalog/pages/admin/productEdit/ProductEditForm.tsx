import Area from '@components/common/Area.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';

/**
 * Fired by components living OUTSIDE the form provider (the heading's
 * Duplicate button) to trigger the same guarded duplicate flow the footer
 * button runs — the guard needs the form context, so it stays in FormButton.
 */
export const DUPLICATE_PRODUCT_EVENT = 'evershop:productEdit:duplicate';

/** Flatten react-hook-form's nested dirty/touched trees into dot-paths. */
const collectPaths = (node: unknown, prefix = ''): string[] => {
  if (node === true) {
    return prefix ? [prefix] : [];
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    collectPaths(value, prefix ? `${prefix}.${key}` : key)
  );
};

/**
 * Paths the USER actually changed: dirty AND touched. Neither RHF signal is
 * usable alone on this form — mount-time plumbing (Attributes' useFieldArray
 * append seed, the Editor's value seed) marks fields dirty without touching
 * them, while focusing a field without editing marks it touched without
 * dirtying it. The intersection is exactly "edited by hand". (The Editor and
 * CategorySelect pass shouldTouch alongside shouldDirty for this reason.)
 * Known gap: image gallery changes go through useFieldArray ops, which mark
 * dirty only — they are not guarded.
 */
const getUserDirtyPaths = (
  dirtyFields: unknown,
  touchedFields: unknown
): string[] => {
  const touched = new Set(collectPaths(touchedFields));
  return collectPaths(dirtyFields).filter((path) => touched.has(path));
};

const FormButton: React.FC<{
  formId: string;
  cancelUrl: string;
  duplicateUrl: string;
}> = ({ cancelUrl, formId, duplicateUrl }) => {
  const {
    formState: { isSubmitting, dirtyFields, touchedFields }
  } = useFormContext();
  const { openAlert, closeAlert } = useAlertContext();
  const duplicate = () => {
    // The duplicate form prefills from the SAVED product — navigating away
    // with unsaved edits would silently drop them from the copy.
    if (getUserDirtyPaths(dirtyFields, touchedFields).length === 0) {
      window.location.href = duplicateUrl;
      return;
    }
    openAlert({
      heading: _('Unsaved changes'),
      content: _(
        'The duplicate is created from the last saved version of this product. Your unsaved edits will not be included and will be lost when you leave this page.'
      ),
      primaryAction: {
        title: _('Cancel'),
        onAction: closeAlert,
        variant: 'secondary'
      },
      secondaryAction: {
        title: _('Continue without saving'),
        onAction: () => {
          window.location.href = duplicateUrl;
        },
        variant: 'default'
      }
    });
  };
  const duplicateRef = React.useRef(duplicate);
  duplicateRef.current = duplicate;
  React.useEffect(() => {
    const onDuplicate = () => duplicateRef.current();
    document.addEventListener(DUPLICATE_PRODUCT_EVENT, onDuplicate);
    return () =>
      document.removeEventListener(DUPLICATE_PRODUCT_EVENT, onDuplicate);
  }, []);
  return (
    <div className="form-submit-button flex border-t border-border mt-4 pt-4 justify-between">
      <Button
        size={'lg'}
        variant="destructive"
        onClick={() => {
          window.location.href = cancelUrl;
        }}
      >
        {_('Cancel')}
      </Button>
      <Button
        onClick={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      >
        {_('Save')}
      </Button>
    </div>
  );
};

export default function ProductEditForm({
  action,
  gridUrl,
  newProductUrl,
  product
}: {
  action: string;
  gridUrl: string;
  newProductUrl: string;
  product: { uuid: string };
}) {
  const form = useForm({
    shouldUnregister: true
  });
  const submit: SubmitHandler<any> = async (data) => {
    try {
      const images = (data.images || []).map(
        (image: { uuid: string; url: string }) => image.url
      );
      data.images = images;
      const response = await fetch(action, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, action: undefined, method: undefined })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(_('Product updated successfully'));
        // A successful save is the new baseline: surgically clear the state
        // of exactly the fields the user changed. A whole-form reset() is NOT
        // safe here — the useFieldArray-driven fields (attributes, images)
        // re-register after it and leave default-vs-value asymmetries that
        // wedge the aggregate isDirty flag.
        getUserDirtyPaths(
          form.formState.dirtyFields,
          form.formState.touchedFields
        ).forEach((path) => {
          form.resetField(path as any, {
            defaultValue: form.getValues(path as any)
          });
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <Form
      form={form}
      action={action}
      method="PATCH"
      submitBtn={false}
      id="productEditForm"
      onSubmit={submit}
    >
      <div className="grid grid-cols-3 gap-x-5 grid-flow-row ">
        <div className="col-span-2 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="leftSide" noOuter />
        </div>
        <div className="col-span-1 grid grid-cols-1 gap-5 auto-rows-max">
          <Area id="rightSide" noOuter />
        </div>
      </div>
      <FormButton
        formId="productEditForm"
        cancelUrl={gridUrl}
        duplicateUrl={`${newProductUrl}?duplicate=${product.uuid}`}
      />
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateProduct", params: [{key: "id", value: getContextValue("productUuid")}]),
    gridUrl: url(routeId: "productGrid"),
    newProductUrl: url(routeId: "productNew"),
    product(id: getContextValue("productId", null)) {
      uuid
    }
  }
`;
