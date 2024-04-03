Feature: view order details
    As a user
    I want to navigate to orders page from
    So that I can view order details


    Scenario: navigation to orders page
        Given user 'admin' is on the admin panel
        When user 'admin' navigates to orders page
        Then user 'admin' should be redirected to the orders page