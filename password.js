const bcrypt = require('bcrypt');

(async () => {

  console.log(await bcrypt.hash('123456', 10));
})()