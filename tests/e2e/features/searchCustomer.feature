  Feature: search customer
    As an admin
    I want to search for a customer
    So that I can view their details
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to customers page


    Scenario: search customer by name
        When user 'admin' searches for a user with name 'Larry'
        Then user 'admin' should view the customer with name 'Larry'

        
    Scenario: search customer by email
        When user 'admin' searches for a user with email 'harry@gmail.com'
        Then user 'admin' should view the customer with email 'harry@gmail.com'