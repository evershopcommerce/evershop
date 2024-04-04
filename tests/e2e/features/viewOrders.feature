  Feature: view orders
    As an admin
    I want to navigate to orders page from admin panel
    So that I can view all orders
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 


    Scenario: navigation to orders page
        When user 'admin' navigates to orders page
        Then user 'admin' should view the orders table