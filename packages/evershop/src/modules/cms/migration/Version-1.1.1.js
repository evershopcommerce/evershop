import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Drop the layout column in the cms_page table
  await execute(connection, `ALTER TABLE cms_page DROP COLUMN layout`);

  const query = `
    INSERT INTO widget (name, type, route, area, sort_order, settings, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  const mainMenu = [
    'Main menu',
    'basic_menu',
    '["all"]',
    '["header"]',
    1,
    JSON.stringify({
      menus: [
        {
          id: 'hanhk3km0m8nt2b',

          url: 'javascript:void(0)',
          name: 'Shop ❤️',
          type: 'custom',

          uuid: 'javascript:void(0)',
          children: [
            {
              id: 'hanhk3km0m8nt2c',
              url: '/men',
              name: 'Men',
              type: 'custom',
              uuid: '/men'
            },
            {
              id: 'hanhk3km0m8nt2d',
              url: '/women',
              name: 'Women',
              type: 'custom',
              uuid: '/women'
            }
          ]
        },
        {
          id: 'hanhk3km0m8nt2e',
          url: '/page/about-us',
          name: 'About us',
          type: 'custom',
          uuid: '/page/about-us',
          children: []
        }
      ],
      isMain: '1',
      className: ''
    }),
    true
  ];

  await connection.query(query, mainMenu);

  const featuredCategories = [
    'Featured categories',
    'text_block',
    '["homepage"]',
    '["content"]',
    10,
    JSON.stringify({
      text: '[{"id":"r__c13ffd49-f39e-40d7-8d67-d345c0a018c1","size":3,"columns":[{"id":"c__6dffc7a4-4378-4247-8ffd-07d956ce4939","size":1,"data":{"time":1725357550597,"blocks":[{"id":"PjJh9eW0O7","type":"header","data":{"text":"Kids shoes collection","level":3}},{"id":"CHsT6VaRCw","type":"paragraph","data":{"text":"Constructed from luxury nylons, leathers, and custom hardware, featuring sport details such as hidden breathing vents, waterproof + antimicrobial linings, and more."}},{"id":"-0lRctONo9","type":"raw","data":{"html":"&lt;a href=\\"/kids\\" class=\\"button primary\\"&gt;&lt;span&gt;Shop kids&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}},{"id":"c__ca76b2e3-65e3-4eb3-83cb-7ffdfba41208","size":1,"data":{"time":1725357550599,"blocks":[{"id":"2K_v3fp7Dd","type":"header","data":{"text":"Women shoes collection","level":3}},{"id":"XiPHWtWbZm","type":"paragraph","data":{"text":"Constructed from luxury nylons, leathers, and custom hardware, featuring sport details such as hidden breathing vents, waterproof + antimicrobial linings, and more."}},{"id":"f9KXlEkYmu","type":"raw","data":{"html":"&lt;a href=\\"/women\\" class=\\"button primary\\"&gt;&lt;span&gt;Shop women&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}},{"id":"c__2872ebd9-7f79-442b-bade-6c19d74220ef","size":1,"data":{"time":1725357550612,"blocks":[{"id":"mxTqYRjSTw","type":"header","data":{"text":"Men shoes collection","level":3}},{"id":"p-frIk8CU-","type":"paragraph","data":{"text":"Constructed from luxury nylons, leathers, and custom hardware, featuring sport details such as hidden breathing vents, waterproof + antimicrobial linings, and more."}},{"id":"AoCaoHwyWd","type":"raw","data":{"html":"&lt;a href=\\"/men\\" class=\\"button primary\\"&gt;&lt;span&gt;Shop men&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}}]}]',
      className: 'page-width'
    }),
    true
  ];

  await connection.query(query, featuredCategories);

  const featuredProducts = [
    'Featured Products',
    'collection_products',
    '["homepage"]',
    '["content"]',
    20,
    JSON.stringify({ count: 4, collection: 'homepage' }),
    true
  ];

  await connection.query(query, featuredProducts);

  const mainBanner = [
    'Main banner',
    'text_block',
    '["homepage"]',
    '["content"]',
    5,
    JSON.stringify({
      text: '[{"id":"r__63dcb2ab-c2a4-40fc-a995-105bf1484b06","size":1,"columns":[{"id":"c__354832f1-6fe1-4845-8cbb-7e094082810e","size":1,"data":{"time":1725374404621,"blocks":[{"id":"KRtRWBBVvm","type":"raw","data":{"html":"&lt;div style=\\"height: 500px; margin-top: -3rem; background: linear-gradient(135deg, #aad3ff, #0056b3); display: flex; align-items: center; justify-content: center;\\"&gt;\\n  &lt;div style=\\"display: flex; align-items: center; max-width: 1200px; width: 100%; padding: 0 20px;\\"&gt;\\n    &lt;div style=\\"flex: 1; text-align: center;\\"&gt;\\n      &lt;svg width=\\"300\\" height=\\"300\\" viewBox=\\"0 0 128 146\\" fill=\\"none\\" xmlns=\\"http://www.w3.org/2000/svg\\" style=\\"fill: #0056b3; color: #0056b3;\\"&gt;\\n        &lt;path d=\\"M32.388 18.0772L1.15175 36.1544L1.05206 72.5081L0.985596 108.895L32.4213 127.039C49.7009 137.008 63.9567 145.182 64.1228 145.182C64.289 145.182 72.8956 140.264 83.2966 134.283C93.6644 128.268 107.82 120.127 114.732 116.139L127.26 108.895V101.119V93.3102L126.529 93.7089C126.097 93.9415 111.941 102.083 95.06 111.853C78.1459 121.622 64.156 129.531 63.9567 129.498C63.724 129.431 52.5587 123.051 39.1005 115.275L14.6099 101.152V72.5746V43.9967L25.6756 37.6165C31.7234 34.1274 42.8223 27.7472 50.2991 23.4273C57.7426 19.1073 63.9899 15.585 64.1228 15.585C64.2557 15.585 72.9288 20.5362 83.3963 26.5841L113.902 43.9967L118.713 41.1657L127.26 36.1544L113.902 28.5447C103.334 22.2974 64.3554 -0.033191 64.0231 3.90721e-05C63.8237 3.90721e-05 49.568 8.14142 32.388 18.0772Z\\" fill=\\"#0056b3\\"&gt;&lt;/path&gt;\\n        &lt;path d=\\"M96.0237 54.1983C78.9434 64.0677 64.721 72.2423 64.4219 72.3088C64.0896 72.4084 55.7488 67.7562 44.8826 61.509L25.9082 50.543V58.4186L25.9414 66.2609L44.3841 76.8945C54.5193 82.743 63.1591 87.6611 63.5911 87.8272C64.2557 88.0598 68.9079 85.5011 95.5585 70.1156C112.705 60.1798 126.861 51.9719 127.027 51.839C127.16 51.7061 127.227 48.1505 127.194 43.9302L127.094 36.2541L96.0237 54.1983Z\\" fill=\\"#0056b3\\"&gt;&lt;/path&gt;\\n        &lt;path d=\\"M123.771 66.7261C121.943 67.7562 107.854 75.8976 92.4349 84.8033C77.0161 93.7089 64.289 100.986 64.1228 100.986C63.9567 100.986 55.3501 96.0683 44.9491 90.0869L26.0744 79.1874L25.9747 86.8303C25.9082 92.6788 26.0079 94.5729 26.307 94.872C26.9383 95.4369 63.7241 116.604 64.1228 116.604C64.4551 116.604 126.496 80.8821 127.027 80.4169C127.16 80.284 127.227 76.7284 127.194 72.4749L127.094 64.7987L123.771 66.7261Z\\" fill=\\"#0056b3\\"&gt;&lt;/path&gt;\\n      &lt;/svg&gt;\\n    &lt;/div&gt;\\n    \\n    &lt;div style=\\"flex: 1; text-align: left; padding: 20px;\\"&gt;\\n      <h1 style=\\"font-size: 3.5rem; color: #fff;\\">Your Heading Here</h1>\\n      &lt;p style=\\"font-size: 1.5rem; color: #fff; margin: 20px 0;\\"&gt;Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ultricies sodales mi, at ornare elit semper ac.&lt;/p&gt;\\n      &lt;a href=\\"#\\" style=\\"display: inline-block; padding: 10px 20px; background-color: #fff; color: #0056b3; text-decoration: none; border-radius: 5px; font-weight: bold;\\"&gt;SHOP NOW&lt;/a&gt;\\n    &lt;/div&gt;\\n  &lt;/div&gt;\\n&lt;/div&gt;\\n"}}],"version":"2.30.2"}}]}]',
      className: ''
    }),
    true
  ];

  await connection.query(query, mainBanner);
};
