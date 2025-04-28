Feature: PKCE Token Generation

    Scenario Outline: Successfully generate a token using PKCE
        Given an app initiates a login with <user> credentials
        When initiate the token exchange
        Then I should receive an auth tokens
        And the tokens should have correct validity period
        And id_token should have correct email address
       
        Examples:
            | user  |
            | valid |