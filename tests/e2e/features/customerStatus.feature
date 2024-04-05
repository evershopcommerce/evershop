Feature: modify customers status
    As an admin
    I want to navigate to customers page
    So that I can modify their status
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to customers page


    Scenario: disable a customer
        When user 'admin' disables a customer with email 'harry2@gmail.com'
        Then user with email 'harry2@gmail.com' should be disabled
        
        
    Scenario: enable a customer
        When user 'admin' enables a customer with email 'example@example.com'
        Then user with email 'example@example.com' should be enabled
        