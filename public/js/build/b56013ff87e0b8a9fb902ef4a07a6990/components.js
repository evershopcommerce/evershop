window.widgets = {
  head: {
    'bootstrap.css': {
      id: 'bootstrap.css',
      source: 'D:\\express\\lib\\components\\link.js',
      component: require("D:\\express\\lib\\components\\link.js"),
      props: {
        href: '/theme/admin/default/css/bootstrap.css',
        rel: 'stylesheet'
      },
      areaId: 'head',
      sort_order: 0
    },
    'style.css': {
      id: 'style.css',
      source: 'D:\\express\\lib\\components\\link.js',
      component: require("D:\\express\\lib\\components\\link.js"),
      props: { href: '/theme/admin/default/css/style.css', rel: 'stylesheet' },
      areaId: 'head',
      sort_order: 0
    },
    'simplebar.css': {
      id: 'simplebar.css',
      source: 'D:\\express\\lib\\components\\link.js',
      component: require("D:\\express\\lib\\components\\link.js"),
      props: {
        href: 'D:\\express\\node_modules\\simplebar\\dist\\simplebar.min.css'
      },
      areaId: 'head',
      sort_order: 1
    }
  },
  body: {
    body: {
      id: 'body',
      source: 'D:\\express\\nodejscart\\cms\\components\\hello.js',
      component: require("D:\\express\\nodejscart\\cms\\components\\hello.js"),
      props: undefined,
      areaId: 'body',
      sort_order: 0
    },
    layout: {
      id: 'layout',
      source: 'D:\\express\\nodejscart\\cms\\components\\admin\\layout.js',
      component: require("D:\\express\\nodejscart\\cms\\components\\admin\\layout.js"),
      props: [],
      areaId: 'body',
      sort_order: 1
    }
  },
  'admin.navigation': {
    menu: {
      id: 'menu',
      source: 'D:\\express\\nodejscart\\cms\\components\\admin\\navigation.js',
      component: require("D:\\express\\nodejscart\\cms\\components\\admin\\navigation.js"),
      props: [],
      areaId: 'admin.navigation',
      sort_order: 1
    }
  },
  'after.body': {
    'bundle.script': {
      id: 'bundle.script',
      source: 'D:\\express\\lib\\components\\script.js',
      component: require("D:\\express\\lib\\components\\script.js"),
      props: { script: 'js/build/b56013ff87e0b8a9fb902ef4a07a6990/bundle.js' },
      areaId: 'after.body',
      sort_order: 1
    }
  }
}
