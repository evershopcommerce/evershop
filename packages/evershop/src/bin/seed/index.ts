/* eslint-disable no-console */
import './initEnvDev.js';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { error, success, info } from '../../lib/log/logger.js';
import { seedAttributeGroup, seedAttributes } from './seedAttributes.js';
import { seedCategories } from './seedCategories.js';
import { seedCollections } from './seedCollections.js';
import { seedPages } from './seedPages.js';
import { seedProducts } from './seedProducts.js';
import { seedWidgets } from './seedWidgets.js';

const { argv } = yargs(hideBin(process.argv))
  .option('attributes', {
    alias: 'a',
    description: 'Seed product attributes',
    type: 'boolean',
    default: false
  })
  .option('categories', {
    alias: 'c',
    description: 'Seed categories',
    type: 'boolean',
    default: false
  })
  .option('collections', {
    alias: 'col',
    description: 'Seed collections',
    type: 'boolean',
    default: false
  })
  .option('products', {
    alias: 'p',
    description: 'Seed products',
    type: 'boolean',
    default: false
  })
  .option('widgets', {
    alias: 'w',
    description: 'Seed widgets',
    type: 'boolean',
    default: false
  })
  .option('pages', {
    alias: 'pg',
    description: 'Seed CMS pages',
    type: 'boolean',
    default: false
  })
  .option('all', {
    description:
      'Seed all demo data (attributes, categories, collections, products, widgets, pages)',
    type: 'boolean',
    default: false
  })
  .check((argv) => {
    if (
      !argv.attributes &&
      !argv.categories &&
      !argv.collections &&
      !argv.products &&
      !argv.widgets &&
      !argv.pages &&
      !argv.all
    ) {
      throw new Error(
        'Please specify at least one option: --attributes, --categories, --collections, --products, --widgets, --pages, or --all'
      );
    }
    return true;
  })
  .help();

interface SeedOptions {
  attributes: boolean;
  categories: boolean;
  collections: boolean;
  products: boolean;
  widgets: boolean;
  pages: boolean;
  all: boolean;
}

async function seed() {
  const options = argv as unknown as SeedOptions;
  let demoAttributeGroupId: number | null = null;

  try {
    info('Starting demo data seeding...\n');

    // Create attribute group first if we're seeding attributes or products
    if (options.all || options.attributes || options.products) {
      demoAttributeGroupId = await seedAttributeGroup();
      console.log();
    }

    if (options.all || options.attributes) {
      if (!demoAttributeGroupId) {
        demoAttributeGroupId = await seedAttributeGroup();
      }
      await seedAttributes(demoAttributeGroupId);
      console.log();
    }

    if (options.all || options.categories) {
      await seedCategories();
      console.log();
    }

    if (options.all || options.collections) {
      await seedCollections();
      console.log();
    }

    if (options.all || options.products) {
      if (!demoAttributeGroupId) {
        demoAttributeGroupId = await seedAttributeGroup();
      }
      await seedProducts(demoAttributeGroupId);
      console.log();
    }

    if (options.all || options.widgets) {
      await seedWidgets();
      console.log();
    }

    if (options.all || options.pages) {
      await seedPages();
      console.log();
    }

    success('✓ Demo data seeding completed successfully!');
    process.exit(0);
  } catch (e: any) {
    error(`Seeding failed: ${e.message}`);
    process.exit(1);
  }
}

seed();
