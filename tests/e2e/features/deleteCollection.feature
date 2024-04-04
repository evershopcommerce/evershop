  Feature: delete collection
    As an admin
    I want to navigate to collections page
    So that I can delete collection
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to collections page


    Scenario: delete a collection
        When user 'admin' deletes a collection
        Then user 'admin' should view list of remaining collections