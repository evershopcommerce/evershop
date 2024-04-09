  Feature: add attribute
    As an admin
    I want to add new attribute
    So that I can have more attributes for products
    
    Background: 
        Given user 'admin' has navigated to the admin login page
        And user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        And user 'admin' navigates to attributes page


    Scenario: create new attribute with different types
        When user 'admin' creates new attribute with following details
            |   name          | code  | type        | order |
            | Test Attribute1 | test1 | Text        |  0    |
            | Test Attribute2 | test2 | Select      |  1    |
            | Test Attribute3 | test3 | Multiselect |  0    |
            | Test Attribute4 | test4 | Textarea    |  1    |
        Then user 'admin' should be able to view all attributes with name '<name>'
            |      name       |
            | Test Attribute1 |
            | Test Attribute2 | 
            | Test Attribute3 |
            | Test Attribute4 |