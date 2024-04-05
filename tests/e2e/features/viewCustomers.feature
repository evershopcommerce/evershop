  Feature: view customers
    As an admin
    I want to navigate to customers page
    So that I can view all customers
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 


    Scenario: navigation to customers page
        When user 'admin' navigates to customers page
        Then user 'admin' should view the customers table