  Feature: add coupon
    As an admin
    I want to add new coupon
    So that I can apply it on product orders
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to coupons page


    Scenario: create new coupon with following details
        When user 'admin' creates new coupon with following details
            | couponCode | description | discountAmount | startDate | endDate    | discountType                   | minPurchaseAmount | minPurchaseQty |
            | coupon123  | test coupon | 100            | 2024-04-01 | 2024-04-30 | Fixed discount to entire order | 3000              | 1              |
        Then user 'admin' should be able to view the added coupon

        