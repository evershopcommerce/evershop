const { pool } = require("../../../lib/mysql/connection");

const context = Object.create({});

context.pool = pool;

module.exports.context = context;