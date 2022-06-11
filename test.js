// const mysql = require('mysql');
// const util = require('util');

// const pool = mysql.createPool({
//   host: 'localhost',
//   port: '3306',
//   user: 'root',
//   password: '123456',
//   database: 'evershop',
//   dateStrings: true,
//   connectionLimit: 30
// });

// async function getConnection() {
//   // eslint-disable-next-line no-return-await
//   return await util.promisify(pool.getConnection).bind(pool)();
// }

// async function all() {
//   try {
//     const all = await Promise.all([
//       getConnection(),
//       getConnection(),
//     ]);
//     return all;
//   } catch (e) {
//     console.log(e);
//     return 1
//   }
// }

// (async () => {
//   const a = await all();
//   console.log(a);
// })()

class A {
  static b = 2;
  static a = 1;
  constructor() {

  }
  #setA() {
    this.a = 2;
  }

  getA() {
    console.log(this.constructor.a);
  }
}

let a = new A();

a.constructor.a = 2;
a.getA();