Feature: search
    As a user
    I want to search a product
    So that I can manage the product

  Rule: a rule
  
    # Background:
    #   Given user "admin" has logged in
    #   And the user has navigated to the admin dashboard

    Scenario: try to search for a product
      Given user "admin" has logged in
      But user doesn't do this
      And the user does this
      When the user searches for product "gown"
      And the user does this
      But user doesn't do this
      Then the result should be empty
      And tfrom ThenBut from then
      But user doesn't do this

    Scenario Outline:Search a product
      Given user "admin" has logged in
      When the user searches for product "<product>"
      And the user does this
      But user doesn't do this
      Then the user should see results for the product "<product>"
      Examples:
        | product |
        | sweater |
        | jeans   |