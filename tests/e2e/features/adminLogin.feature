Feature: login 
    As a user
    I want to be able to log in to the website admin panel
    So that I can manage my products

    Background: 
        Given user 'admin' has navigated to the admin login page


    Scenario: login with valid credentials
        When user 'admin' logs in with following credentials
            | emailvv         | password |
            | admin@admin.com | a1234578 | 
        Then user 'admin' should be navigated to admin panel dashboard


   Scenario Outline: login with invalid credentials
        When the user tries logs in with following credentials
            | email   | password   |
            | <email> | <password> |
        Then error message "<errorMessage>" should be shown
        Examples:
            | email            | password       | errorMessage                |
            | admin@admin.com  | abc            | Invalid email or password   |
            | xyz@gmail.com    | pSynidexxx.899 | Invalid email or password   |
            | admin@admin.com  |                | This field can not be empty |
            |                  | pSynidexxx.899 | This field can not be empty |
            |                  |                | This field can not be empty |