module.exports = (response) => {
  return response.locals.errorHandlerTriggered === true;
}