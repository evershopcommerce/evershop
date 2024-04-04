  Feature: add collection
    As an admin
    I want to navigate to collections page
    So that I can add new collection
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to collections page


    Scenario: create new collection
        When user 'admin' creates new collection with following details
            |   name       | uniqueID | description    |
            | Test Feature | test123  | Test Test Test |
        Then user 'admin' should be able to add products to the collection