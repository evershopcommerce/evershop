module.exports = (response) => {
  if (!response.locals) {
    return false;
  } else {
    return response.locals.errorHandlerTriggered === true;
  }
};
