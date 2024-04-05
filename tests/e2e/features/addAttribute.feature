  Feature: add attribute
    As an admin
    I want to navigate to attributes page
    So that I can add new attribute
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to attributes page


    Scenario: create new attribute
        When user 'admin' creates new attribute with following details
            |   name       | uniqueID | description    |
            | Test Feature | test123  | Test Test Test |
        Then user 'admin' should be able to add new attribute