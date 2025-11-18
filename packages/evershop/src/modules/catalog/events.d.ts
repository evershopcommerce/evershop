/**
 * Catalog module event types
 * These events are emitted by the catalog module with complete table row data
 */
declare module '@evershop/evershop/types/event' {
  interface EventDataRegistry {
    /**
     * Fired when a new product is created
     * Data: Complete product table row
     */
    product_created: {
      product_id: number;
      uuid: string;
      type: string;
      variant_group_id: number | null;
      visibility: boolean;
      group_id: number;
      image: string | null;
      sku: string;
      price: number;
      qty: number;
      weight: number | null;
      manage_stock: boolean;
      stock_availability: boolean;
      tax_class: number | null;
      status: boolean;
      created_at: string;
      updated_at: string;
      category_id: number | null;
    };

    /**
     * Fired when a product is updated
     * Data: Complete product table row
     */
    product_updated: {
      product_id: number;
      uuid: string;
      type: string;
      variant_group_id: number | null;
      visibility: boolean;
      group_id: number;
      image: string | null;
      sku: string;
      price: number;
      qty: number;
      weight: number | null;
      manage_stock: boolean;
      stock_availability: boolean;
      tax_class: number | null;
      status: boolean;
      created_at: string;
      updated_at: string;
      category_id: number | null;
    };

    /**
     * Fired when a product is deleted
     * Data: Complete product table row
     */
    product_deleted: {
      product_id: number;
      uuid: string;
      type: string;
      variant_group_id: number | null;
      visibility: boolean;
      group_id: number;
      image: string | null;
      sku: string;
      price: number;
      qty: number;
      weight: number | null;
      manage_stock: boolean;
      stock_availability: boolean;
      tax_class: number | null;
      status: boolean;
      created_at: string;
      updated_at: string;
      category_id: number | null;
    };

    /**
     * Fired when a product image is added
     * Data: Complete product_image table row
     */
    product_image_added: {
      product_image_id: number;
      product_image_product_id: number;
      origin_image: string;
      thumb_image: string | null;
      listing_image: string | null;
      single_image: string | null;
      is_main: boolean;
    };

    /**
     * Fired when a new category is created
     * Data: Complete category table row
     */
    category_created: {
      category_id: number;
      uuid: string;
      status: boolean;
      parent_id: number | null;
      include_in_nav: boolean;
      position: number | null;
      show_products: boolean;
      created_at: string;
      updated_at: string;
    };

    /**
     * Fired when a category is updated
     * Data: Complete category table row
     */
    category_updated: {
      category_id: number;
      uuid: string;
      status: boolean;
      parent_id: number | null;
      include_in_nav: boolean;
      position: number | null;
      show_products: boolean;
      created_at: string;
      updated_at: string;
    };

    /**
     * Fired when a category is deleted
     * Data: Complete category table row
     */
    category_deleted: {
      category_id: number;
      uuid: string;
      status: boolean;
      parent_id: number | null;
      include_in_nav: boolean;
      position: number | null;
      show_products: boolean;
      created_at: string;
      updated_at: string;
    };
  }
}

export {};
