import bodyParser from 'body-parser';
import type { NextFunction, Request, Response } from 'express';

export default (
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  bodyParser.json({ inflate: false })(request, response, next);
};
