  Feature: view collections
    As an admin
    I want to navigate to collections page
    So that I can view all collections
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 


    Scenario: navigation to collections page
        When user 'admin' navigates to collections page
        Then user 'admin' should view the collections table