import { Image, ImageUploader } from '@components/admin/ImageUploader.js';
import { InputField } from '@components/common/form/InputField.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import uniqid from 'uniqid';

type PreviewType = 'logo' | 'favicon' | 'social';

/**
 * Build a URL for the on-the-fly image endpoint (`GET /images`), which resizes
 * + re-encodes the asset and serves it with an immutable cache header. Passing
 * the stored (relative) `/assets/...` path lets the processor read the file
 * locally instead of re-fetching it over HTTP.
 */
function imageEndpoint(
  src: string,
  params: { w: number; h?: number; q?: number; f?: 'webp' | 'jpeg' | 'png' }
): string {
  const query = new URLSearchParams({
    src,
    w: String(params.w),
    q: String(params.q ?? 80),
    f: params.f ?? 'webp'
  });
  if (params.h) {
    query.set('h', String(params.h));
  }
  return `/images?${query.toString()}`;
}

function AssetPreview({ url, type }: { url: string; type: PreviewType }) {
  if (type === 'favicon') {
    // Render at the exact sizes the storefront emits so contrast / legibility
    // problems at 16px are obvious before saving.
    return (
      <div className="mt-3 flex items-end gap-4">
        {[16, 32, 48].map((size) => (
          <div key={size} className="flex flex-col items-center gap-1">
            <img
              src={imageEndpoint(url, { w: size, h: size, q: 90, f: 'png' })}
              width={size}
              height={size}
              alt=""
            />
            <span className="text-[11px] text-muted-foreground">{size}px</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'social') {
    // Mirrors the actual og:image render (width-only, jpeg) so the admin sees
    // the true crop/ratio a crawler will get.
    return (
      <div className="mt-3 max-w-sm overflow-hidden rounded-lg border border-border">
        <img
          src={imageEndpoint(url, { w: 1200, q: 80, f: 'jpeg' })}
          className="block w-full"
          alt={_('Social sharing preview')}
        />
      </div>
    );
  }
  // logo — show it on light and dark so a logo that disappears on one theme is
  // caught immediately.
  return (
    <div className="mt-3 flex gap-3">
      <div className="flex h-12 items-center rounded-md border border-border bg-white px-3">
        <img
          src={imageEndpoint(url, { w: 240, q: 85, f: 'webp' })}
          alt=""
          className="max-h-7 w-auto"
        />
      </div>
      <div className="flex h-12 items-center rounded-md border border-border bg-neutral-900 px-3">
        <img
          src={imageEndpoint(url, { w: 240, q: 85, f: 'webp' })}
          alt=""
          className="max-h-7 w-auto"
        />
      </div>
    </div>
  );
}

export interface BrandAssetUploaderProps {
  /** Form field / setting key, e.g. `logo`, `favicon`, `socialSharingImage`. */
  name: string;
  /** Current saved value (a `/assets/...` URL) or empty string. */
  defaultValue?: string;
  /** Media subfolder the file lands in; a unique token is appended per mount. */
  folder?: string;
  /** Which contextual preview to render under the uploader. */
  previewType?: PreviewType;
  /**
   * When set, the asset's real intrinsic pixel size is measured on upload and
   * written to these form fields. Used for the logo — whose aspect ratio is
   * arbitrary — so the storefront can size it without distortion or layout
   * shift. Omit for fixed-ratio assets (favicon, social image).
   */
  widthName?: string;
  heightName?: string;
  defaultWidth?: string;
  defaultHeight?: string;
}

/**
 * Single-asset image upload for store branding (logo / favicon / social image).
 * Wraps the shared {@link ImageUploader} in single mode, mirrors the uploaded
 * URL into a hidden form field so it saves with the rest of the store settings,
 * and renders a contextual preview built from the `/images` endpoint.
 */
export function BrandAssetUploader({
  name,
  defaultValue,
  folder = 'branding',
  previewType,
  widthName,
  heightName,
  defaultWidth,
  defaultHeight
}: BrandAssetUploaderProps) {
  const [image, setImage] = useState<Image | undefined>(
    defaultValue ? { uuid: name, url: defaultValue } : undefined
  );
  const { setValue } = useFormContext();
  // A fresh folder per mount so replacing an asset never overwrites the old
  // file: the image endpoint caches by source path with an immutable header, so
  // a reused filename would keep serving the previous render.
  const [targetPath] = useState(() => `${folder}/${uniqid()}`);

  useEffect(() => {
    setValue(name, image?.url || '');
  }, [image, name, setValue]);

  // Measure the real intrinsic size of the asset (logo only) so the storefront
  // sizes it correctly. `window.Image` — the bare `Image` is the type imported
  // above, not the DOM constructor.
  useEffect(() => {
    if (!widthName || !heightName) {
      return;
    }
    if (!image?.url) {
      setValue(widthName, '');
      setValue(heightName, '');
      return;
    }
    const probe = new window.Image();
    probe.onload = () => {
      setValue(widthName, String(probe.naturalWidth));
      setValue(heightName, String(probe.naturalHeight));
    };
    probe.src = image.url;
  }, [image, widthName, heightName, setValue]);

  return (
    <div>
      {/* The shared uploader is a 100%-width square; in this wide settings
          column that balloons, so cap it to a compact thumbnail. */}
      <div className="w-40">
        <ImageUploader
          isMultiple={false}
          allowDelete
          currentImages={image ? [image] : []}
          onUpload={(images) => {
            if (images.length > 0) {
              setImage(images[0]);
            }
          }}
          onDelete={() => setImage(undefined)}
          targetPath={targetPath}
        />
      </div>
      <InputField type="hidden" name={name} defaultValue={defaultValue ?? ''} />
      {widthName && (
        <InputField
          type="hidden"
          name={widthName}
          defaultValue={defaultWidth ?? ''}
        />
      )}
      {heightName && (
        <InputField
          type="hidden"
          name={heightName}
          defaultValue={defaultHeight ?? ''}
        />
      )}
      {previewType && image?.url ? (
        <AssetPreview url={image.url} type={previewType} />
      ) : null}
    </div>
  );
}
