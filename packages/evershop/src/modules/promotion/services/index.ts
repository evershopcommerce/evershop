// createCoupon: default export + CouponData type + hooks
export { default as createCoupon } from './coupon/createCoupon.js';
export * from './coupon/createCoupon.js';

// updateCoupon: default export + hooks
export { default as updateCoupon } from './coupon/updateCoupon.js';
export * from './coupon/updateCoupon.js';

// deleteCoupon: default export + hooks
export { default as deleteCoupon } from './coupon/deleteCoupon.js';
export * from './coupon/deleteCoupon.js';

// Landing pages
export * from './landingPage/createLandingPage.js';
export { default as updateLandingPage } from './landingPage/updateLandingPage.js';
export * from './landingPage/updateLandingPage.js';
export * from './landingPage/deleteLandingPage.js';
export * from './landingPage/duplicateLandingPage.js';
export {
  syncLandingPageUrlRewrite,
  deleteLandingPageUrlRewrite
} from './landingPage/syncLandingPageUrlRewrite.js';
export { getLandingPagesBaseQuery } from './landingPage/getLandingPagesBaseQuery.js';
export { LandingPageCollection } from './LandingPageCollection.js';
