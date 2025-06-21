import { EvershopRequest, EvershopResponse } from '@evershop/evershop';
import { INTERNAL_SERVER_ERROR, OK } from '@evershop/evershop/lib';
import { getSetting } from '@evershop/evershop/setting/services';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  delegate,
  next
) => {
  const { age } = request.body;
  try {
    response.status(OK);
    const minAge = await getSetting<number>('minAge', 18);
    if (age && age >= minAge) {
      // Set the age verified cookie
      response.cookie('age-verified', 1, {
        maxAge: 1000 * 60 * 60 * 24 * 10
      });
      response.json({
        data: {
          age,
          passed: true
        }
      });
    } else {
      response.json({
        data: {
          age,
          passed: false
        }
      });
    }
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e.message
      }
    });
  }
};
