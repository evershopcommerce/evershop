Feature: admin user login 
    As a user
    I want to be able to log in to the website admin panel
    So that I can access administrative functionalities

    Background: 
        Given user 'admin' has navigated to the admin login page


    Scenario: login with valid credentials
        When user 'admin' login with following credentials
            |   email                 | password       |
            | prasantgrg777@gmail.com | pSynidexxx.899 | 
        Then user 'admin' should be navigated to admin panel dashboard


   Scenario Outline: login with invalid credentials
        When the user login with following credentials
            | email   | password   |
            | <email> | <password> |
        Then error message "<errorMessage>" should be shown
        Examples:
            |   email                 | password       | errorMessage                |
            | prasantgrg777@gmail.com | abc            | Invalid email or password   |
            | xyz@gmail.com           | pSynidexxx.899 | Invalid email or password   |
            | prasantgrg777@gmail.com |                | This field can not be empty |
            |                         | pSynidexxx.899 | This field can not be empty |
            |                         |                | This field can not be empty |
