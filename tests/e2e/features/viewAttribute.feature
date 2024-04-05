  Feature: view attributes
    As an admin
    I want to navigate to attributes page
    So that I can view all attributes
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 


    Scenario: navigation to attributes page
        When user 'admin' navigates to attributes page
        Then user 'admin' should view the attributes table